import { useEffect, useState } from "react";
import { OBJ, F, CHOICES, PROFILE } from "../../knack/config";
import { getRecord, updateRecord, type KnackRecord } from "../../knack/api";
import { dateOf, display, formatDate, raw } from "../../knack/records";
import { useSession } from "../../knack/session";
import { Card, Field, Spinner } from "../../components/Bits";
import { ApiError } from "../../components/ApiError";

export function PatientProfile() {
  const { session } = useSession();
  const recordId = session?.roleRecordIds[PROFILE.patient];

  const [record, setRecord] = useState<KnackRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const [phoneArea, setPhoneArea] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [insurance, setInsurance] = useState("");
  const [contact, setContact] = useState("");

  useEffect(() => {
    if (!recordId) { setLoading(false); return; }
    let cancelled = false;
    getRecord(OBJ.patients, recordId)
      .then((r) => {
        if (cancelled) return;
        setRecord(r);
        const phone = raw<{ area?: string; number?: string }>(r, F.patient.phone);
        setPhoneArea(phone?.area ?? "");
        setPhoneNumber(phone?.number ?? "");
        setInsurance(String(raw(r, F.patient.insurance) ?? ""));
        setContact(String(raw(r, F.patient.contact) ?? ""));
      })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [recordId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!recordId) return;
    setBusy(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await updateRecord(OBJ.patients, recordId, {
        [F.patient.phone]: { area: phoneArea, number: phoneNumber },
        [F.patient.insurance]: insurance,
        [F.patient.contact]: contact,
      });
      setRecord(updated);
      setSaved(true);
    } catch (e) {
      setSaveError(e);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Card title="My details"><Spinner /></Card>;
  if (error) return <Card title="My details"><ApiError error={error} context="loading your record" /></Card>;
  if (!recordId || !record) {
    return (
      <Card title="My details">
        <div className="notice">
          Your patient record could not be located. This usually means the account
          holds the Patient role but has no matching row in the Patients table.
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card title="On file at the clinic">
        <div className="grid2">
          <Field label="Name"><input value={display(record, F.patient.name)} readOnly /></Field>
          <Field label="Email"><input value={display(record, F.patient.email)} readOnly /></Field>
          <Field label="Date of birth"><input value={formatDate(dateOf(record, F.patient.dob))} readOnly /></Field>
          <Field label="Status">
            <input value={raw(record, F.patient.active) ? "Active patient" : "Inactive"} readOnly />
          </Field>
        </div>
        <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: 0 }}>
          Name, date of birth and clinical notes are maintained by the clinic. Ask
          the office if any of these need correcting.
        </p>
      </Card>

      <Card title="Contact details you can change">
        <ApiError error={saveError} context="saving your details" />
        {saved && <div className="notice"><strong>Saved.</strong> Your details were updated.</div>}
        <form onSubmit={save}>
          <div className="grid2">
            <Field label="Phone area code">
              <input value={phoneArea} onChange={(e) => setPhoneArea(e.target.value)} inputMode="numeric" maxLength={5} />
            </Field>
            <Field label="Phone number">
              <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Insurance provider">
              <select value={insurance} onChange={(e) => setInsurance(e.target.value)}>
                <option value="">Select…</option>
                {CHOICES.insurance.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Preferred contact method">
              <select value={contact} onChange={(e) => setContact(e.target.value)}>
                <option value="">Select…</option>
                {CHOICES.contactMethod.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        </form>
      </Card>
    </>
  );
}
