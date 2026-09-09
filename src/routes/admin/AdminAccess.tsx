import { Card } from "../../components/Bits";

type Row = { object: string; patient: string; provider: string; admin: string };

/**
 * A read-only restatement of the DAC matrix configured in Knack, so an admin can
 * see what the rules are without opening the builder. It is documentation, not a
 * control surface — changing access happens in Knack.
 */
const ROWS: Row[] = [
  { object: "Accounts (object_1)", patient: "Own, view only", provider: "Own, view only", admin: "All, no delete" },
  { object: "Patients (object_4)", patient: "Own, edit", provider: "All, no delete", admin: "All, no delete" },
  { object: "Providers (object_5)", patient: "All, view only", provider: "All view · own edit", admin: "All, no delete" },
  { object: "Appointments (object_6)", patient: "Own, edit", provider: "All, no delete", admin: "All, incl. delete" },
  { object: "Documents (object_7)", patient: "Own, edit", provider: "All, no delete", admin: "All, incl. delete" },
  { object: "Clinic Admin (object_8)", patient: "None", provider: "None", admin: "All, no delete" },
];

export function AdminAccess() {
  return (
    <>
      <Card title="Who can see what">
        <div className="notice">
          These rules live in Knack's Data Access Control and are enforced by the
          Knack API. This portal does not filter records for privacy — it shows
          whatever Knack returns. Changing access means changing it in Knack.
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Table</th><th>Patient</th><th>Provider</th><th>Clinic admin</th></tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.object}>
                  <td>{r.object}</td><td>{r.patient}</td><td>{r.provider}</td><td>{r.admin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Known gap">
        <p style={{ marginTop: 0 }}>
          <strong>New accounts still default to the Clinic Admin role.</strong> That
          flag can only be cleared in the Knack builder — the API used to build this
          app can move the default between roles but cannot remove it. Until an
          administrator clears it under <em>Users &rarr; Roles</em>, anyone who
          registers receives clinic-wide access.
        </p>
      </Card>
    </>
  );
}
