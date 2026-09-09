import { OBJ, F } from "../../knack/config";
import { useRecords } from "../../knack/useRecords";
import { display, raw } from "../../knack/records";
import { Card, Empty, Pill, Spinner } from "../../components/Bits";
import { ApiError } from "../../components/ApiError";

/** The provider directory. Patients hold read-only access to it in Knack. */
export function CareTeam() {
  const list = useRecords(OBJ.providers, { sortField: F.provider.name, sortOrder: "asc", rowsPerPage: 50 });

  return (
    <Card title="Care team">
      {list.loading && <Spinner />}
      <ApiError error={list.error} context="loading the provider directory" />
      {!list.loading && !list.error && list.records.length === 0 && <Empty>No providers listed.</Empty>}

      {list.records.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Provider</th><th>Specialty</th><th>New patients</th></tr></thead>
            <tbody>
              {list.records.map((p) => (
                <tr key={p.id}>
                  <td>{display(p, F.provider.name)}</td>
                  <td>{String(raw(p, F.provider.specialty) ?? "—")}</td>
                  <td>
                    {raw(p, F.provider.accepting)
                      ? <Pill tone="green">Accepting</Pill>
                      : <Pill tone="grey">Not accepting</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
