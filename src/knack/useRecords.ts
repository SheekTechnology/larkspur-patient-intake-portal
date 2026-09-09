import { useCallback, useEffect, useState } from "react";
import { listRecords, type Filters, type KnackRecord, type ListOptions } from "./api";

export type RecordsState = {
  records: KnackRecord[];
  total: number;
  totalPages: number;
  page: number;
  setPage: (p: number) => void;
  loading: boolean;
  error: unknown;
  reload: () => void;
};

/**
 * Fetches a page of records on mount and whenever its inputs change. There is no
 * polling: data refreshes on user action (paging, filtering, or an explicit
 * reload after a write).
 */
export function useRecords(
  objectKey: string,
  opts: Omit<ListOptions, "page"> & { filters?: Filters } = {},
  deps: unknown[] = [],
): RecordsState {
  const [records, setRecords] = useState<KnackRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);

  const key = JSON.stringify([objectKey, opts.filters, opts.sortField, opts.sortOrder, opts.rowsPerPage, deps]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listRecords(objectKey, { ...opts, page })
      .then((res) => {
        if (cancelled) return;
        setRecords(res.records ?? []);
        setTotal(res.total_records ?? 0);
        setTotalPages(res.total_pages ?? 1);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e);
          setRecords([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, nonce]);

  // Reset to the first page when the query itself changes.
  useEffect(() => { setPage(1); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { records, total, totalPages, page, setPage, loading, error, reload };
}
