import { useState } from "react";
import { OBJ, F, CHOICES } from "../../knack/config";
import { useRecords } from "../../knack/useRecords";
import { updateRecord, createRecord, type KnackRecord } from "../../knack/api";
import { connection, dateOf, display, formatDateTime, raw, toKnackDateTime } from "../../knack/records";
import { useSession } from "../../knack/session";
import { PROFILE } from "../../knack/config";
import { Card, Empty, Pagination, Pill, Spinner, statusTone, Field } from "../../components/Bits";
import { ApiError } from "../../components/ApiError";

export function PatientAppointments() {
  // No patient filter here on purpose. Knack's DAC already limits this response
  // to the signed-in patient's own appointments; adding a user-id filter would be
  // redundant and would imply the site is the thing enforcing privacy.
  const list = useRecords(OBJ.appointments, {
    sortField: F.appointment.date,
    sortOrder: "desc",
    rowsPerPage: 20,
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [showRequest, setShowRequest] = useState(false);

  async function cancel(appt: KnackRecord) {
    setBusyId(appt.id);
    setActionError(null);
    try {
      await updateRecord(OBJ.appointments, appt.id, { [F.appointment.status]: "Cancelled" });
      list.reload();
    } catch (e) {
      setActionError(e);
    } finally {
      setBusyId(null);
    }
  }

  const now = Date.now();

  return (
    <>
      <ApiError error={actionError} context="updating an appointment" />

      <Card
        title="Your appointments"
        actions={
          <button className="btn btn--sm" onClick={() => setShowRequest((s) => !s)}>
            {showRequest ? "Close" : "Request appointment"}
          </button>
        }
      >
        {showRequest && (
          <RequestAppointment
            onDone={() => { setShowRequest(false); list.reload(); }}
          />
        )}

        {list.loading && <Spinner />}
        <ApiError error={list.error} context="loading appointments" />

        {!list.loading && !list.error && list.records.length === 0 && (
          <Empty>No appointments on file yet.</Empty>
        )}

        {list.records.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th><th>Type</th><th>Provider</th>
                  <th>Status</th><th>Length</th><th />
                </tr>
              </thead>
              <tbody>
                {list.records.map((appt) => {
                  const when = dateOf(appt, F.appointment.date);
                  const status = String(raw(appt, F.appointment.status) ?? "");
                  const provider = connection(appt, F.appointment.provider);
                  const upcoming = when ? when.getTime() > now : false;
                  const notes = display(appt, F.appointment.notes);
                  return (
                    <tr key={appt.id}>
                      <td>
                        {formatDateTime(when)}
                        {notes && <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 3 }}>{notes}</div>}
                      </td>
                      <td>{String(raw(appt, F.appointment.visitType) ?? "—")}</td>
                      <td>{provider?.identifier ?? "—"}</td>
                      <td><Pill tone={statusTone(status)}>{status || "—"}</Pill></td>
                      <td>{raw(appt, F.appointment.duration) ?? "—"}{raw(appt, F.appointment.duration) ? " min" : ""}</td>
                      <td>
                        {upcoming && status === "Scheduled" && (
                          <button
                            className="btn btn--sm btn--quiet"
                            disabled={busyId === appt.id}
                            onClick={() => void cancel(appt)}
                          >
                            {busyId === appt.id ? "Cancelling…" : "Cancel"}
                          </button>
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
    </>
  );
}

function RequestAppointment({ onDone }: { onDone: () => void }) {
  const { session } = useSession();
  const patientRecordId = session?.roleRecordIds[PROFILE.patient];

  const [when, setWhen] = useState("");
  const [visitType, setVisitType] = useState<string>(CHOICES.visitType[1]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createRecord(OBJ.appointments, {
        [F.appointment.date]: toKnackDateTime(when),
        [F.appointment.visitType]: visitType,
        [F.appointment.status]: "Scheduled",
        [F.appointment.notes]: notes,
        // The Patient connection needs the object_4 record id, not the account id.
        ...(patientRecordId ? { [F.appointment.patient]: [{ id: patientRecordId }] } : {}),
      });
      onDone();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 14, marginBottom: 16 }}>
      <div className="notice">
        Requested times are not confirmed until the clinic accepts them. The
        appointment is created under your account, which is what lets Knack show
        it back to you.
      </div>
      <ApiError error={error} context="requesting an appointment" />
      <div className="grid2">
        <Field label="Preferred date and time">
          <input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <Field label="Visit type">
          <select value={visitType} onChange={(e) => setVisitType(e.target.value)}>
            {CHOICES.visitType.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
      </div>
      <Field label="What would you like to be seen for?">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <button className="btn" disabled={busy || !when}>{busy ? "Sending…" : "Send request"}</button>
    </form>
  );
}
