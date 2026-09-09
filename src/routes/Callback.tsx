import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { completeLogin, OAuthError } from "../knack/auth";
import { useSession } from "../knack/session";
import { Spinner } from "../components/Bits";
import { ApiError } from "../components/ApiError";

const FRIENDLY: Record<string, string> = {
  auth_request_expired:
    "This sign-in link expired, or this site's address is not registered with the Knack OAuth client.",
  invalid_grant: "The sign-in code was already used or has expired. Please sign in again.",
  login_disactivated: "This account is inactive. Contact the clinic to have it reactivated.",
  login_pending_approval: "This account is awaiting approval from the clinic.",
};

export function Callback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { reload } = useSession();
  const [error, setError] = useState<unknown>(null);
  const ran = useRef(false);

  useEffect(() => {
    // The auth code is single-use; StrictMode double-invoke must not spend it twice.
    if (ran.current) return;
    ran.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");

    if (oauthError) {
      setError(new OAuthError(oauthError, params.get("error_description") ?? oauthError, 400));
      return;
    }
    if (!code || !state) {
      setError(new OAuthError("invalid_request", "The sign-in response was missing its code or state.", 400));
      return;
    }

    void (async () => {
      try {
        await completeLogin(code, state);
        await reload();
        navigate("/", { replace: true });
      } catch (e) {
        setError(e);
      }
    })();
  }, [params, navigate, reload]);

  if (error) {
    const code = error instanceof OAuthError ? error.code : "";
    return (
      <div className="centre">
        <div className="panel">
          <h1>Sign-in failed</h1>
          {FRIENDLY[code] && <p>{FRIENDLY[code]}</p>}
          <ApiError error={error} context="completing sign-in" />
          <a className="btn" href="/login">Try again</a>
        </div>
      </div>
    );
  }

  return <div className="centre"><Spinner label="Completing sign-in…" /></div>;
}
