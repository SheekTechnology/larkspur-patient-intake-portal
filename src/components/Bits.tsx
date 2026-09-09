import type { ReactNode } from "react";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return <div className="spinner" role="status">{label}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Pill({ tone, children }: { tone?: string; children: ReactNode }) {
  return <span className={`pill pill--${tone ?? "neutral"}`}>{children}</span>;
}

export function statusTone(status: string): string {
  switch (status) {
    case "Scheduled": return "blue";
    case "Completed": return "green";
    case "Cancelled": return "grey";
    case "No-Show": return "amber";
    case "active": return "green";
    case "inactive": return "grey";
    case "pending approval": return "amber";
    default: return "neutral";
  }
}

export function Card({ title, actions, children }: { title?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card__head">
          {title ? <h2 className="card__title">{title}</h2> : <span />}
          {actions}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}

export function Pagination({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span>Page {page} of {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}
