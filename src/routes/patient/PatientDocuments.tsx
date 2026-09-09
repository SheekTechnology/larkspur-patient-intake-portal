import { useState } from "react";
import { OBJ, F, CHOICES, PROFILE } from "../../knack/config";
import { useRecords } from "../../knack/useRecords";
import { createRecord, uploadFile } from "../../knack/api";
import { dateOf, display, fileOf, formatDate, raw, toKnackDateTime } from "../../knack/records";
import { useSession } from "../../knack/session";
import { Card, Empty, Field, Pagination, Pill, Spinner } from "../../components/Bits";
import { ApiError } from "../../components/ApiError";

export function PatientDocuments() {
  // DAC scopes this to the patient's own documents — no filter needed.
  const list = useRecords(OBJ.documents, {
    sortField: F.document.uploaded,
    sortOrder: "desc",
    rowsPerPage: 20,
  });
  const [showUpload, setShowUpload] = useState(false);

  return (
    <Card
      title="Your documents"
      actions={
        <button className="btn btn--sm" onClick={() => setShowUpload((s) => !s)}>
          {showUpload ? "Close" : "Upload a document"}
        </button>
      }
    >
      {showUpload && <UploadDocument onDone={() => { setShowUpload(false); list.reload(); }} />}

      {list.loading && <Spinner />}
      <ApiError error={list.error} context="loading documents" />

      {!list.loading && !list.error && list.records.length === 0 && (
        <Empty>No documents have been shared with you yet.</Empty>
      )}

      {list.records.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Type</th><th>Uploaded</th><th>File</th></tr>
            </thead>
            <tbody>
              {list.records.map((doc) => {
                const file = fileOf(doc, F.document.file);
                const type = String(raw(doc, F.document.docType) ?? "");
                return (
                  <tr key={doc.id}>
                    <td>{display(doc, F.document.title) || "Untitled"}</td>
                    <td>{type ? <Pill>{type}</Pill> : "—"}</td>
                    <td>{formatDate(dateOf(doc, F.document.uploaded))}</td>
                    <td>
                      {file?.signed_url_inline ? (
                        <>
                          <a href={file.signed_url_inline} target="_blank" rel="noopener noreferrer">View</a>
                          {file.signed_url && <> · <a href={file.signed_url}>Download</a></>}
                        </>
                      ) : "—"}
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

function UploadDocument({ onDone }: { onDone: () => void }) {
  const { session } = useSession();
  const patientRecordId = session?.roleRecordIds[PROFILE.patient];

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<string>(CHOICES.docType[1]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      // Two steps: upload the binary, then attach the returned asset id.
      const asset = await uploadFile(file);
      await createRecord(OBJ.documents, {
        [F.document.title]: title || file.name,
        [F.document.docType]: docType,
        [F.document.file]: asset.id,
        [F.document.uploaded]: toKnackDateTime(new Date().toISOString()),
        ...(patientRecordId ? { [F.document.patient]: [{ id: patientRecordId }] } : {}),
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
      <ApiError error={error} context="uploading a document" />
      <div className="grid2">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Insurance card" />
        </Field>
        <Field label="Type">
          <select value={docType} onChange={(e) => setDocType(e.target.value)}>
            {CHOICES.docType.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <Field label="File">
        <input type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      <button className="btn" disabled={busy || !file}>{busy ? "Uploading…" : "Upload"}</button>
    </form>
  );
}
