import { useMemo, useState } from "react";
import { OBJ, F, CHOICES, PROFILE } from "../../knack/config";
import { useRecords } from "../../knack/useRecords";
import { updateRecord, type Filters, type KnackRecord } from "../../knack/api";
import { connection, dateOf, display, formatDateTime, raw } from "../../knack/records";
import { useSession } from "../../knack/session";
import { Card, Empty, Field, Pagination, Pill, Spinner, statusTone } from "../../components/Bits";
import { ApiError } from "../../components/ApiError";
import { ScopeNotice } from "./ScopeNotice";

export function ProviderSchedule() {
  const { session } = useSession();
  const providerRecordId = session?.roleRecordIds[PROFILE.provider];

  const [scope, setScope] = useState<"mine" | "clinic">("mine");
  const [status, setStatus] = useState<string>("Scheduled");

  const filters = useMemo<Filters | undefined>(() => {
    const rules = [];
    if (scope === "mine" && providerRecordId) {
      // Connection filters match on the connected record's id.
      rules.push({ field: F.appointment.provider, operator: "is", value: providerRecordId });
    }
    if (status) rules.push({ field: F.appointment.status, operator: "is", value: status });
    return rules.length ? { match: "and" as const, rules } : undefined;
  }, [scope, status, providerRecordId]);

  const list = useRecords(
    OBJ.appointments,
    { filters, sortField: F.appointment.date, sortOrder: "asc", rowsPerPage: 25 },
    [scope, status, providerRecordId],
  );

  return (
    <>
      <ScopeNotice />

      <Card title="Appointments">
        <div className="toolbar">
          <Field label="Scope">
            <select value={scope} onChange={(e) => setScope(e.target.value as "mine" | "clinic")}>
              <option value="mine">My panel</option>
              <option value="clinic">Whole clinic</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option>
              {CHOICES.apptStatus.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <div style={{ marginLeft: "auto", color: "var(--ink-soft)", fontSize: 13 }}>
            {list.total} matching
          </div>
        </div>

        {scope === "mine" && !providerRecordId && (
          <div className="notice">
            Your provider record could not be resolved, so "my panel" cannot be
            filtered. Showing nothing rather than silently showing everyone.
          </div>
        )}

        {list.loading && <Spinner />}
        <ApiError error={list.error} context="loading the schedule" />
        {!list.loading && !list.error && list.records.length === 0 && <Empty>Nothing matches this view.</Empty>}

        {list.records.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>When</th><th>Patient</th><th>Type</th><th>Provider</th><th>Status</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {list.records.map((a) => (
                  <AppointmentRow key={a.id} appt={a} onSaved={list.reload} />
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

function AppointmentRow({ appt, onSaved }: { appt: KnackRecord; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(String(raw(appt, F.appointment.status) ?? ""));
  const [notes, setNotes] = useState(display(appt, F.appointment.notes));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const patient = connection(appt, F.appointment.patient);
  const provider = connection(appt, F.appointment.provider);
  const currentStatus = String(raw(appt, F.appointment.status) ?? "");

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateRecord(OBJ.appointments, appt.id, {
        [F.appointment.status]: status,
        [F.appointment.notes]: notes,
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={6}>
          <ApiError error={error} context="saving the appointment" />
          <div className="grid2">
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {CHOICES.apptStatus.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Visit notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <button className="btn btn--sm" disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save"}
          </button>{" "}
          <button className="btn btn--sm btn--quiet" onClick={() => setEditing(false)}>Cancel</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{formatDateTime(dateOf(appt, F.appointment.date))}</td>
      <td>{patient?.identifier ?? "—"}</td>
      <td>{String(raw(appt, F.appointment.visitType) ?? "—")}</td>
      <td>{provider?.identifier ?? "—"}</td>
      <td><Pill tone={statusTone(currentStatus)}>{currentStatus || "—"}</Pill></td>
      <td>
        <div style={{ maxWidth: 280 }}>{display(appt, F.appointment.notes) || "—"}</div>
        <button className="btn btn--sm btn--quiet" style={{ marginTop: 6 }} onClick={() => setEditing(true)}>
          Edit
        </button>
      </td>
    </tr>
  );
}
