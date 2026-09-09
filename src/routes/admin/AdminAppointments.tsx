import { useMemo, useState } from "react";
import { OBJ, F, CHOICES } from "../../knack/config";
import { useRecords } from "../../knack/useRecords";
import { deleteRecord, updateRecord, type Filters, type KnackRecord } from "../../knack/api";
import { connection, dateOf, display, formatDateTime, raw } from "../../knack/records";
import { Card, Empty, Field, Pagination, Pill, Spinner, statusTone } from "../../components/Bits";
import { ApiError } from "../../components/ApiError";

export function AdminAppointments() {
  const [status, setStatus] = useState("");
  const [actionError, setActionError] = useState<unknown>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filters = useMemo<Filters | undefined>(
    () => (status ? { match: "and", rules: [{ field: F.appointment.status, operator: "is", value: status }] } : undefined),
    [status],
  );

  const list = useRecords(
    OBJ.appointments,
    { filters, sortField: F.appointment.date, sortOrder: "desc", rowsPerPage: 25 },
    [status],
  );

  async function setStatusOf(appt: KnackRecord, next: string) {
    setBusyId(appt.id);
    setActionError(null);
    try {
      await updateRecord(OBJ.appointments, appt.id, { [F.appointment.status]: next });
      list.reload();
    } catch (e) { setActionError(e); } finally { setBusyId(null); }
  }

  async function remove(appt: KnackRecord) {
    setBusyId(appt.id);
    setActionError(null);
    try {
      await deleteRecord(OBJ.appointments, appt.id);
      setConfirmId(null);
      list.reload();
    } catch (e) { setActionError(e); } finally { setBusyId(null); }
  }

  return (
    <Card title="All appointments">
      <ApiError error={actionError} context="changing an appointment" />

      <div className="toolbar">
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>
            {CHOICES.apptStatus.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <div style={{ marginLeft: "auto", color: "var(--ink-soft)", fontSize: 13 }}>{list.total} appointments</div>
      </div>

      {list.loading && <Spinner />}
      <ApiError error={list.error} context="loading appointments" />
      {!list.loading && !list.error && list.records.length === 0 && <Empty>No appointments match.</Empty>}

      {list.records.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>When</th><th>Patient</th><th>Provider</th><th>Type</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.records.map((a) => {
                const s = String(raw(a, F.appointment.status) ?? "");
                const confirming = confirmId === a.id;
                return (
                  <tr key={a.id}>
                    <td>
                      {formatDateTime(dateOf(a, F.appointment.date))}
                      {display(a, F.appointment.notes) && (
                        <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 3, maxWidth: 260 }}>
                          {display(a, F.appointment.notes)}
                        </div>
                      )}
                    </td>
                    <td>{connection(a, F.appointment.patient)?.identifier ?? "—"}</td>
                    <td>{connection(a, F.appointment.provider)?.identifier ?? "—"}</td>
                    <td>{String(raw(a, F.appointment.visitType) ?? "—")}</td>
                    <td>
                      <select
                        value={s}
                        disabled={busyId === a.id}
                        onChange={(e) => void setStatusOf(a, e.target.value)}
                        style={{ padding: "4px 8px", borderRadius: 7, border: "1px solid var(--line)" }}
                      >
                        {CHOICES.apptStatus.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <div style={{ marginTop: 4 }}><Pill tone={statusTone(s)}>{s || "—"}</Pill></div>
                    </td>
                    <td>
                      {confirming ? (
                        <>
                          <button className="btn btn--sm btn--danger" disabled={busyId === a.id} onClick={() => void remove(a)}>
                            {busyId === a.id ? "Deleting…" : "Confirm delete"}
                          </button>{" "}
                          <button className="btn btn--sm btn--quiet" onClick={() => setConfirmId(null)}>Keep</button>
                        </>
                      ) : (
                        <button className="btn btn--sm btn--quiet" onClick={() => setConfirmId(a.id)}>Delete</button>
                      )}
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
