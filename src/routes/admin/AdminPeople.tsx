import { useState } from "react";
import { OBJ, F, CHOICES } from "../../knack/config";
import { useRecords } from "../../knack/useRecords";
import { updateRecord, type KnackRecord } from "../../knack/api";
import { dateOf, display, formatDate, raw } from "../../knack/records";
import { Card, Empty, Pagination, Pill, Spinner, statusTone } from "../../components/Bits";
import { ApiError } from "../../components/ApiError";

type Tab = "patients" | "providers" | "admins";

const TABS: { key: Tab; label: string; object: string; nameField: string; statusField: string }[] = [
  { key: "patients", label: "Patients", object: OBJ.patients, nameField: F.patient.name, statusField: F.patient.status },
  { key: "providers", label: "Providers", object: OBJ.providers, nameField: F.provider.name, statusField: F.provider.status },
  { key: "admins", label: "Clinic admins", object: OBJ.clinicAdmins, nameField: F.admin.name, statusField: F.admin.status },
];

export function AdminPeople() {
  const [tab, setTab] = useState<Tab>("patients");
  const cfg = TABS.find((t) => t.key === tab)!;

  const list = useRecords(cfg.object, { sortField: cfg.nameField, sortOrder: "asc", rowsPerPage: 25 }, [tab]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function setStatus(rec: KnackRecord, next: string) {
    setBusyId(rec.id);
    setError(null);
    try {
      await updateRecord(cfg.object, rec.id, { [cfg.statusField]: next });
      list.reload();
    } catch (e) { setError(e); } finally { setBusyId(null); }
  }

  return (
    <Card
      title="People"
      actions={
        <div style={{ display: "flex", gap: 6 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`btn btn--sm ${tab === t.key ? "" : "btn--quiet"}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="notice">
        Accounts can be activated or deactivated here, but not deleted — no role in
        this app holds delete on user tables.
      </div>

      <ApiError error={error} context="updating an account" />
      {list.loading && <Spinner />}
      <ApiError error={list.error} context={`loading ${cfg.label.toLowerCase()}`} />
      {!list.loading && !list.error && list.records.length === 0 && <Empty>Nothing here.</Empty>}

      {list.records.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th>
                {tab === "patients" && <><th>Date of birth</th><th>Insurance</th></>}
                {tab === "providers" && <><th>Specialty</th><th>New patients</th></>}
                <th>Account status</th>
              </tr>
            </thead>
            <tbody>
              {list.records.map((r) => {
                const status = String(raw(r, cfg.statusField) ?? "");
                return (
                  <tr key={r.id}>
                    <td>{display(r, cfg.nameField)}</td>
                    <td>{display(r, tab === "patients" ? F.patient.email : tab === "providers" ? F.provider.email : F.admin.email)}</td>
                    {tab === "patients" && (
                      <>
                        <td>{formatDate(dateOf(r, F.patient.dob))}</td>
                        <td>{String(raw(r, F.patient.insurance) ?? "—")}</td>
                      </>
                    )}
                    {tab === "providers" && (
                      <>
                        <td>{String(raw(r, F.provider.specialty) ?? "—")}</td>
                        <td>{raw(r, F.provider.accepting) ? <Pill tone="green">Accepting</Pill> : <Pill tone="grey">No</Pill>}</td>
                      </>
                    )}
                    <td>
                      <select
                        value={status}
                        disabled={busyId === r.id}
                        onChange={(e) => void setStatus(r, e.target.value)}
                        style={{ padding: "4px 8px", borderRadius: 7, border: "1px solid var(--line)" }}
                      >
                        {CHOICES.userStatus.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div style={{ marginTop: 4 }}><Pill tone={statusTone(status)}>{status || "—"}</Pill></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={list.page} totalPages={list.totalPages} onChange={list.setPage} />
    </Card>
  );
}
