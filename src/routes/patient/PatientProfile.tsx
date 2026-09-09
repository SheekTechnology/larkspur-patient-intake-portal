import { useEffect, useState } from "react";
import { OBJ, F, CHOICES, PROFILE } from "../../knack/config";
import { getRecord, updateRecord, KnackError, type KnackRecord } from "../../knack/api";
import { dateOf, display, formatDate, raw } from "../../knack/records";
import { useSession } from "../../knack/session";
import { Card, Field, Spinner } from "../../components/Bits";
import { ApiError } from "../../components/ApiError";

type PhoneRaw = { area?: string; number?: string; full?: string; formatted?: string };
type EmailRaw = { email?: string; label?: string };

/** field_42 is formatted "(999) 999-9999" — ten digits, split 3 then 7 on write. */
function digitsOf(s: string): string {
  return s.replace(/\D/g, "");
}

function phoneToInput(p: PhoneRaw | undefined): string {
  if (!p) return "";
  const d = digitsOf(`${p.area ?? ""}${p.number ?? ""}`) || digitsOf(p.full ?? p.formatted ?? "");
  return formatPhone(d);
}

function formatPhone(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function emailOf(record: KnackRecord): string {
  return raw<EmailRaw>(record, F.patient.email)?.email ?? display(record, F.patient.email);
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function PatientProfile() {
  const { session, reload: reloadSession } = useSession();
  const recordId = session?.roleRecordIds[PROFILE.patient];

  const [record, setRecord] = useState<KnackRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!recordId) { setLoading(false); return; }
    let cancelled = false;
    getRecord(OBJ.patients, recordId)
      .then((r) => { if (!cancelled) setRecord(r); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [recordId]);

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

      <ContactDetails record={record} recordId={recordId} onSaved={setRecord} />
      <SignInEmail
        record={record}
        recordId={recordId}
        onSaved={(r) => { setRecord(r); void reloadSession(); }}
      />
    </>
  );
}

function ContactDetails({
  record, recordId, onSaved,
}: { record: KnackRecord; recordId: string; onSaved: (r: KnackRecord) => void }) {
  const [phone, setPhone] = useState(() => phoneToInput(raw<PhoneRaw>(record, F.patient.phone)));
  const [insurance, setInsurance] = useState(String(raw(record, F.patient.insurance) ?? ""));
  const [contact, setContact] = useState(String(raw(record, F.patient.contact) ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  const digits = digitsOf(phone);
  const phoneValid = digits.length === 0 || digits.length === 10;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateRecord(OBJ.patients, recordId, {
        [F.patient.phone]: digits.length === 10
          ? { area: digits.slice(0, 3), number: digits.slice(3) }
          : { area: "", number: "" },
        [F.patient.insurance]: insurance,
        [F.patient.contact]: contact,
      });
      onSaved(updated);
      setSaved(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Contact details">
      <ApiError error={error} context="saving your details" />
      {saved && <div className="notice"><strong>Saved.</strong> Your details were updated.</div>}
      <form onSubmit={save}>
        <div className="grid2">
          <Field label="Phone">
            <input
              value={phone}
              onChange={(e) => { setPhone(formatPhone(digitsOf(e.target.value))); setSaved(false); }}
              inputMode="tel"
              placeholder="(555) 123-4567"
              aria-invalid={!phoneValid}
            />
            {!phoneValid && (
              <span style={{ color: "var(--danger)", fontSize: 12.5 }}>
                Enter all ten digits, or clear the field.
              </span>
            )}
          </Field>
          <Field label="Insurance provider">
            <select value={insurance} onChange={(e) => { setInsurance(e.target.value); setSaved(false); }}>
              <option value="">Select…</option>
              {CHOICES.insurance.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Preferred contact method">
            <select value={contact} onChange={(e) => { setContact(e.target.value); setSaved(false); }}>
              <option value="">Select…</option>
              {CHOICES.contactMethod.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <button className="btn" disabled={busy || !phoneValid}>{busy ? "Saving…" : "Save changes"}</button>
      </form>
    </Card>
  );
}

/**
 * Email is the account's sign-in identity (field_31 is a user field and unique),
 * so it is kept apart from ordinary contact details: its own form, a typed
 * confirmation to catch typos, and an explicit warning. There is no verification
 * email in this flow — a wrong address that Knack accepts will lock the patient
 * out at the next sign-in.
 */
function SignInEmail({
  record, recordId, onSaved,
}: { record: KnackRecord; recordId: string; onSaved: (r: KnackRecord) => void }) {
  const current = emailOf(record);

  const [editing, setEditing] = useState(false);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [changedTo, setChangedTo] = useState<string | null>(null);

  const trimmed = next.trim();
  const matches = trimmed !== "" && trimmed.toLowerCase() === confirm.trim().toLowerCase();
  const shaped = looksLikeEmail(trimmed);
  const isDifferent = trimmed.toLowerCase() !== current.trim().toLowerCase();
  const canSubmit = shaped && matches && isDifferent;

  function reset() {
    setEditing(false);
    setNext("");
    setConfirm("");
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateRecord(OBJ.patients, recordId, {
        [F.patient.email]: { email: trimmed, label: "" },
      });
      onSaved(updated);
      setChangedTo(trimmed);
      reset();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const duplicate =
    error instanceof KnackError &&
    /uniqu|already|taken|in use|duplicate/i.test(error.message);

  return (
    <Card
      title="Sign-in email"
      actions={
        !editing && (
          <button className="btn btn--sm btn--quiet" onClick={() => { setEditing(true); setChangedTo(null); }}>
            Change email
          </button>
        )
      }
    >
      {changedTo && (
        <div className="notice">
          <strong>Email changed to {changedTo}.</strong> Use that address the next
          time you sign in. Your password is unchanged.
        </div>
      )}

      <Field label="Current email">
        <input value={current} readOnly />
      </Field>

      {!editing ? (
        <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: 0 }}>
          This is the address you sign in with, and where the clinic contacts you.
        </p>
      ) : (
        <form onSubmit={save}>
          <div className="notice">
            <strong>This is the address you sign in with.</strong> Changing it
            changes your login straight away — there is no confirmation email. If
            you enter an address you cannot receive mail at, you will not be able
            to recover the account yourself; the clinic would have to fix it.
          </div>

          <ApiError error={error} context="changing your sign-in email" />
          {duplicate && (
            <div className="notice">
              That address is already attached to another Larkspur account. Email
              addresses have to be unique, so pick a different one or contact the
              clinic if you think it is already yours.
            </div>
          )}

          <div className="grid2">
            <Field label="New email">
              <input
                type="email"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
              />
              {trimmed !== "" && !shaped && (
                <span style={{ color: "var(--danger)", fontSize: 12.5 }}>
                  That does not look like an email address.
                </span>
              )}
              {shaped && !isDifferent && (
                <span style={{ color: "var(--ink-soft)", fontSize: 12.5 }}>
                  That is already your current address.
                </span>
              )}
            </Field>
            <Field label="Confirm new email">
              <input
                type="email"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                onPaste={(e) => e.preventDefault()}
                placeholder="Type it again"
              />
              {confirm.trim() !== "" && !matches && (
                <span style={{ color: "var(--danger)", fontSize: 12.5 }}>
                  The two addresses do not match.
                </span>
              )}
            </Field>
          </div>

          <button className="btn" disabled={busy || !canSubmit}>
            {busy ? "Changing…" : "Change sign-in email"}
          </button>{" "}
          <button type="button" className="btn btn--quiet" onClick={reset} disabled={busy}>
            Cancel
          </button>
        </form>
      )}
    </Card>
  );
}
