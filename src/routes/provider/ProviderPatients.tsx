import { useMemo, useState } from "react";
import { OBJ, F } from "../../knack/config";
import { useRecords } from "../../knack/useRecords";
import type { Filters } from "../../knack/api";
import { dateOf, display, formatDate, raw } from "../../knack/records";
import { Card, Empty, Field, Pagination, Pill, Spinner } from "../../components/Bits";
import { ApiError } from "../../components/ApiError";
import { ScopeNotice } from "./ScopeNotice";

export function ProviderPatients() {
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");

  const filters = useMemo<Filters | undefined>(
    () => (applied ? { match: "and", rules: [{ field: F.patient.name, operator: "contains", value: applied }] } : undefined),
    [applied],
  );

  const list = useRecords(
    OBJ.patients,
    { filters, sortField: F.patient.name, sortOrder: "asc", rowsPerPage: 25 },
    [applied],
  );

  return (
    <>
      <ScopeNotice />

      <Card title="Patient roster">
        <form
          className="toolbar"
          onSubmit={(e) => { e.preventDefault(); setApplied(search.trim()); }}
        >
          <Field label="Search by name">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Surname" />
          </Field>
          <button className="btn btn--sm">Search</button>
          {applied && (
            <button type="button" className="btn btn--sm btn--quiet" onClick={() => { setSearch(""); setApplied(""); }}>
              Clear
            </button>
          )}
          <div style={{ marginLeft: "auto", color: "var(--ink-soft)", fontSize: 13 }}>{list.total} patients</div>
        </form>

        {list.loading && <Spinner />}
        <ApiError error={list.error} context="loading the patient roster" />
        {!list.loading && !list.error && list.records.length === 0 && <Empty>No patients match.</Empty>}

        {list.records.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Date of birth</th><th>Phone</th><th>Insurance</th><th>Status</th><th>Intake notes</th></tr>
              </thead>
              <tbody>
                {list.records.map((p) => (
                  <tr key={p.id}>
                    <td>{display(p, F.patient.name)}</td>
                    <td>{formatDate(dateOf(p, F.patient.dob))}</td>
                    <td>{display(p, F.patient.phone) || "—"}</td>
                    <td>{String(raw(p, F.patient.insurance) ?? "—")}</td>
                    <td>
                      {raw(p, F.patient.active) ? <Pill tone="green">Active</Pill> : <Pill tone="grey">Inactive</Pill>}
                    </td>
                    <td><div style={{ maxWidth: 300 }}>{display(p, F.patient.intake) || "—"}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />
      </Card>
    </>
  );
}
