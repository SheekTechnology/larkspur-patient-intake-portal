import { KNACK_API, KNACK_OAUTH_CLIENT_ID, REDIRECT_PATH } from "./config";

// Tokens live in sessionStorage (tab-scoped) per Knack guidance — never cookies or
// localStorage, so a closed tab ends the session and nothing is sent cross-site.
const TOKENS_KEY = "knack.tokens";
const PKCE_KEY = "knack.pkce";

export type Tokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
};

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

async function sha256(input: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return new Uint8Array(digest);
}

export function redirectUri(): string {
  return `${window.location.origin}${REDIRECT_PATH}`;
}

export function getTokens(): Tokens | null {
  const raw = sessionStorage.getItem(TOKENS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Tokens;
  } catch {
    sessionStorage.removeItem(TOKENS_KEY);
    return null;
  }
}

function storeTokenResponse(json: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}): Tokens {
  const tokens: Tokens = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
  };
  sessionStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  return tokens;
}

export function clearTokens(): void {
  sessionStorage.removeItem(TOKENS_KEY);
  sessionStorage.removeItem(PKCE_KEY);
}

export class OAuthError extends Error {
  constructor(
    public code: string,
    public description: string,
    public status: number,
  ) {
    super(description || code);
    this.name = "OAuthError";
  }
}

async function tokenRequest(body: Record<string, string>): Promise<Tokens> {
  const res = await fetch(`${KNACK_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new OAuthError(
      json.error ?? "token_request_failed",
      json.error_description ?? `Token endpoint returned ${res.status}`,
      res.status,
    );
  }
  return storeTokenResponse(json);
}

/** Step 2-3: build PKCE params, stash the verifier, hand the browser to Knack. */
export async function beginLogin(): Promise<void> {
  const codeVerifier = b64url(randomBytes(48));
  const state = b64url(randomBytes(16));
  const codeChallenge = b64url(await sha256(codeVerifier));

  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ codeVerifier, state }));

  const params = new URLSearchParams({
    client_id: KNACK_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  // Credentials are entered on Knack's hosted login page. This app never sees,
  // collects or stores a user's password.
  window.location.assign(`${KNACK_API}/oauth/authorize?${params.toString()}`);
}

/** Step 5: validate state, exchange the single-use code for tokens. */
export async function completeLogin(code: string, returnedState: string): Promise<Tokens> {
  const stashed = sessionStorage.getItem(PKCE_KEY);
  if (!stashed) throw new OAuthError("invalid_request", "No login in progress. Start again from the sign-in page.", 400);

  const { codeVerifier, state } = JSON.parse(stashed) as { codeVerifier: string; state: string };
  if (!returnedState || returnedState !== state) {
    clearTokens();
    throw new OAuthError("invalid_request", "State mismatch — the sign-in response did not match this browser tab. Start again.", 400);
  }

  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    client_id: KNACK_OAUTH_CLIENT_ID,
    code_verifier: codeVerifier,
  });
  sessionStorage.removeItem(PKCE_KEY);
  return tokens;
}

/** Step 6: both tokens rotate on every refresh. */
export async function refreshTokens(): Promise<Tokens> {
  const current = getTokens();
  if (!current) throw new OAuthError("invalid_token", "Session expired. Please sign in again.", 401);
  try {
    return await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: current.refresh_token,
      client_id: KNACK_OAUTH_CLIENT_ID,
    });
  } catch (e) {
    clearTokens();
    throw e;
  }
}

/** Refresh proactively inside the 60s expiry window. */
export async function getValidAccessToken(): Promise<string | null> {
  const current = getTokens();
  if (!current) return null;
  if (Date.now() >= current.expires_at - 60_000) {
    const refreshed = await refreshTokens();
    return refreshed.access_token;
  }
  return current.access_token;
}

/** Step 7: revoking kills every token for this (user, client) pair. */
export async function logout(): Promise<void> {
  const current = getTokens();
  if (current) {
    try {
      await fetch(`${KNACK_API}/oauth/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: current.access_token,
          client_id: KNACK_OAUTH_CLIENT_ID,
        }).toString(),
      });
    } catch {
      // Revocation is best-effort; local tokens are cleared regardless.
    }
  }
  clearTokens();
}
