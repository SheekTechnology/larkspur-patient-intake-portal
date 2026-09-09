import { KnackError } from "../knack/api";

/**
 * Renders a Knack failure in full — status, error code and the server's own
 * message. Nothing is paraphrased away, so the text on screen is the text worth
 * reporting. 403s get a plain-language lead-in because they are expected traffic
 * in a DAC-enforced app, not bugs.
 */
export function ApiError({ error, context }: { error: unknown; context?: string }) {
  if (!error) return null;

  const isKnack = error instanceof KnackError;
  const status = isKnack ? error.status : undefined;
  const code = isKnack ? error.code : (error as Error).name || "error";
  const message = (error as Error).message ?? String(error);
  const denied = isKnack && error.isAccessDenied;

  return (
    <div className={`api-error ${denied ? "api-error--denied" : ""}`} role="alert">
      <div className="api-error__head">
        {denied ? "Knack denied this request" : "Something went wrong"}
        {context ? ` — ${context}` : ""}
      </div>
      {denied && (
        <p className="api-error__lead">
          Your role does not have permission for this record. Access is decided by
          Knack, not by this site, so an administrator changes it in the Knack builder.
        </p>
      )}
      <pre className="api-error__detail">
        {[status !== undefined ? `status: ${status}` : null, `code: ${code}`, `message: ${message}`]
          .filter(Boolean)
          .join("\n")}
      </pre>
    </div>
  );
}
