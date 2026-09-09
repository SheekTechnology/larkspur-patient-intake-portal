import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSession } from "./knack/session";
import { getTokens } from "./knack/auth";
import { PROFILE, roleRoutes } from "./knack/config";
import { Spinner } from "./components/Bits";
import { ApiError } from "./components/ApiError";

import { Login } from "./routes/Login";
import { Callback } from "./routes/Callback";
import { Welcome } from "./routes/Welcome";
import { Unauthorized } from "./routes/Unauthorized";
import { RoleSelect } from "./routes/RoleSelect";
import { PatientView } from "./routes/patient/PatientView";
import { ProviderView } from "./routes/provider/ProviderView";
import { AdminView } from "./routes/admin/AdminView";

/** Requires a session. No tokens -> the login route, which starts the OAuth flow. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, error } = useSession();
  const location = useLocation();

  if (!getTokens()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (loading) return <div className="centre"><Spinner label="Loading your account…" /></div>;
  if (error) {
    return (
      <div className="centre">
        <div className="panel">
          <h1>Could not load your account</h1>
          <ApiError error={error} context="fetching session" />
          <a className="btn" href="/login">Sign in again</a>
        </div>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/**
 * Gates a role route on the profile keys Knack issued. This is navigation only —
 * the data itself is protected by DAC, so a user who forces their way to another
 * role's URL still gets nothing back from the API.
 */
function RequireRole({ profileKey, children }: { profileKey: string; children: ReactNode }) {
  const { session } = useSession();
  if (!session) return <Navigate to="/login" replace />;
  if (!session.profileKeys.includes(profileKey)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

/** Sends a signed-in user to the right place for the roles they hold. */
function HomeRedirect() {
  const { session, loading } = useSession();
  if (!getTokens()) return <Navigate to="/login" replace />;
  if (loading) return <div className="centre"><Spinner /></div>;
  if (!session) return <Navigate to="/login" replace />;

  const roles = session.profileKeys.filter((pk) => pk !== PROFILE.generic);
  if (roles.length === 1) return <Navigate to={roleRoutes[roles[0]] ?? "/welcome"} replace />;
  if (roles.length > 1) return <Navigate to="/role-select" replace />;
  return <Navigate to="/welcome" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<Callback />} />

      <Route path="/" element={<HomeRedirect />} />

      <Route path="/welcome" element={<RequireAuth><Welcome /></RequireAuth>} />
      <Route path="/role-select" element={<RequireAuth><RoleSelect /></RequireAuth>} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        path="/patient/*"
        element={<RequireAuth><RequireRole profileKey={PROFILE.patient}><PatientView /></RequireRole></RequireAuth>}
      />
      <Route
        path="/provider/*"
        element={<RequireAuth><RequireRole profileKey={PROFILE.provider}><ProviderView /></RequireRole></RequireAuth>}
      />
      <Route
        path="/admin/*"
        element={<RequireAuth><RequireRole profileKey={PROFILE.admin}><AdminView /></RequireRole></RequireAuth>}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
