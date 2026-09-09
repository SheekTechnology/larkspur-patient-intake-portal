import { KNACK_API, KNACK_APP_ID } from "./config";
import { getValidAccessToken, refreshTokens, clearTokens } from "./auth";

/**
 * Every Knack failure surfaces as one of these. Nothing is swallowed: the UI
 * renders status, errorCode and the server's own message verbatim so a problem
 * can be read and reported without opening devtools.
 */
export class KnackError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "KnackError";
  }

  /** True when Knack refused on access-control grounds rather than a bad request. */
  get isAccessDenied(): boolean {
    return (
      this.status === 403 ||
      this.code === "access_control_update_forbidden" ||
      this.code === "access_control_delete_forbidden"
    );
  }
}

function extractError(status: number, body: any): KnackError {
  // Knack returns errors in several shapes depending on the endpoint.
  const code =
    body?.errorCode ??
    body?.error ??
    body?.errors?.[0]?.code ??
    `http_${status}`;
  const message =
    body?.error_description ??
    body?.message ??
    body?.errors?.[0]?.message ??
    (typeof body?.errors === "string" ? body.errors : null) ??
    `Knack returned HTTP ${status}`;
  return new KnackError(status, String(code), String(message), body);
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getValidAccessToken();
  if (!token) throw new KnackError(401, "invalid_token", "You are signed out. Please sign in again.");
  return {
    "X-Knack-Application-Id": KNACK_APP_ID,
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(url: string, init: RequestInit = {}, retryOn401 = true): Promise<T> {
  const headers = { ...(await authHeaders()), ...(init.headers ?? {}) };
  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && retryOn401) {
    // Reactive refresh, then one replay.
    try {
      await refreshTokens();
    } catch {
      clearTokens();
      throw new KnackError(401, "invalid_token", "Your session expired. Please sign in again.");
    }
    return request<T>(url, init, false);
  }

  const text = await res.text();
  const body = text ? safeJson(text) : null;

  if (!res.ok) throw extractError(res.status, body);
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function jsonInit(method: string, payload: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

// ---------------------------------------------------------------- session

export type KnackSession = {
  session: {
    user: {
      id: string;
      email?: string;
      name?: { fullName?: string } | string;
      profileKeys: string[];
      values?: Record<string, unknown>;
    };
  };
};

export function fetchSession(): Promise<KnackSession> {
  return request<KnackSession>(`${KNACK_API}/live-app/${KNACK_APP_ID}/session`);
}

// ---------------------------------------------------------------- records

export type KnackRecord = Record<string, any> & { id: string };

export type ListResponse = {
  records: KnackRecord[];
  total_records: number;
  total_pages: number;
  current_page: number;
};

export type FilterRule = {
  field: string;
  operator: string;
  value?: unknown;
};

export type Filters = { match: "and" | "or"; rules: FilterRule[] };

export type ListOptions = {
  filters?: Filters;
  page?: number;
  rowsPerPage?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
};

/**
 * Lists records. Note there is deliberately no "only mine" parameter: Knack's
 * Data Access Control already trims every response to the records this user may
 * see. Filters passed here are for user-facing narrowing (a date range, a status),
 * never for enforcing who-sees-what.
 */
export function listRecords(objectKey: string, opts: ListOptions = {}): Promise<ListResponse> {
  const params = new URLSearchParams();
  if (opts.filters) params.set("filters", JSON.stringify(opts.filters));
  params.set("page", String(opts.page ?? 1));
  params.set("rows_per_page", String(opts.rowsPerPage ?? 25));
  if (opts.sortField) params.set("sort_field", opts.sortField);
  if (opts.sortOrder) params.set("sort_order", opts.sortOrder);
  return request<ListResponse>(`${KNACK_API}/objects/${objectKey}/records?${params.toString()}`);
}

export function getRecord(objectKey: string, id: string): Promise<KnackRecord> {
  return request<KnackRecord>(`${KNACK_API}/objects/${objectKey}/records/${id}`);
}

export function createRecord(objectKey: string, values: Record<string, unknown>): Promise<KnackRecord> {
  return request<KnackRecord>(`${KNACK_API}/objects/${objectKey}/records`, jsonInit("POST", values));
}

export function updateRecord(
  objectKey: string,
  id: string,
  values: Record<string, unknown>,
): Promise<KnackRecord> {
  return request<KnackRecord>(`${KNACK_API}/objects/${objectKey}/records/${id}`, jsonInit("PUT", values));
}

export function deleteRecord(objectKey: string, id: string): Promise<unknown> {
  return request(`${KNACK_API}/objects/${objectKey}/records/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------- assets

export type UploadedAsset = {
  id: string;
  filename: string;
  size: number;
  type: string;
};

/**
 * Two-step attachment: upload the binary, then write the returned id to the
 * field in a create/update call.
 */
export async function uploadFile(file: File): Promise<UploadedAsset> {
  const form = new FormData();
  form.append("files", file);
  // multipart boundary is set by the browser — do not add Content-Type here.
  return request<UploadedAsset>(
    `${KNACK_API}/applications/${KNACK_APP_ID}/assets/file/upload`,
    { method: "POST", body: form },
  );
}
