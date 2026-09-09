import { useState } from "react";
import { beginLogin } from "../knack/auth";
import { ApiError } from "../components/ApiError";

export function Login() {
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await beginLogin();
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  }

  return (
    <div className="centre">
      <div className="panel">
        <h1>Larkspur Patient Portal</h1>
        <p>
          Sign in with your Larkspur account. You will be taken to Knack's secure
          sign-in page — your password is never entered on this site.
        </p>
        <ApiError error={error} context="starting sign-in" />
        <button className="btn" onClick={() => void start()} disabled={busy}>
          {busy ? "Redirecting…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
