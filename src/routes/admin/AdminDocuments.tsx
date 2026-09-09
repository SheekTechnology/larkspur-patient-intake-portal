import { useState } from "react";
import { OBJ, F } from "../../knack/config";
import { useRecords } from "../../knack/useRecords";
import { deleteRecord, type KnackRecord } from "../../knack/api";
import { connection, dateOf, display, fileOf, formatDate, raw } from "../../knack/records";
import { Card, Empty, Pagination, Pill, Spinner } from "../../components/Bits";
import { ApiError } from "../../components/ApiError";

export function AdminDocuments() {
  const list = useRecords(OBJ.documents, { sortField: F.document.uploaded, sortOrder: "desc", rowsPerPage: 25 });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function remove(doc: KnackRecord) {
    setBusyId(doc.id);
    setError(null);
    try {
      await deleteRecord(OBJ.documents, doc.id);
      setConfirmId(null);
      list.reload();
    } catch (e) { setError(e); } finally { setBusyId(null); }
  }

  return (
    <Card title="All documents">
      <ApiError error={error} context="deleting a document" />
      {list.loading && <Spinner />}
      <ApiError error={list.error} context="loading documents" />
      {!list.loading && !list.error && list.records.length === 0 && <Empty>No documents.</Empty>}

      {list.records.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Patient</th><th>Type</th><th>Uploaded</th><th>File</th><th /></tr>
            </thead>
            <tbody>
              {list.records.map((d) => {
                const file = fileOf(d, F.document.file);
                const confirming = confirmId === d.id;
                return (
                  <tr key={d.id}>
                    <td>{display(d, F.document.title) || "Untitled"}</td>
                    <td>{connection(d, F.document.patient)?.identifier ?? "—"}</td>
                    <td>{String(raw(d, F.document.docType) ?? "") ? <Pill>{String(raw(d, F.document.docType))}</Pill> : "—"}</td>
                    <td>{formatDate(dateOf(d, F.document.uploaded))}</td>
                    <td>
                      {file?.signed_url_inline
                        ? <a href={file.signed_url_inline} target="_blank" rel="noopener noreferrer">View</a>
                        : "—"}
                    </td>
                    <td>
                      {confirming ? (
                        <>
                          <button className="btn btn--sm btn--danger" disabled={busyId === d.id} onClick={() => void remove(d)}>
                            {busyId === d.id ? "Deleting…" : "Confirm"}
                          </button>{" "}
                          <button className="btn btn--sm btn--quiet" onClick={() => setConfirmId(null)}>Keep</button>
                        </>
                      ) : (
                        <button className="btn btn--sm btn--quiet" onClick={() => setConfirmId(d.id)}>Delete</button>
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
