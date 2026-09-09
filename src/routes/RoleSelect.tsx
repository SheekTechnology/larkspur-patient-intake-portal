import { Link } from "react-router-dom";
import { useSession } from "../knack/session";
import { PROFILE, roleLabels, roleRoutes } from "../knack/config";

const BLURB: Record<string, string> = {
  [PROFILE.patient]: "Your appointments, documents and profile.",
  [PROFILE.provider]: "Your appointment panel and the patient roster.",
  [PROFILE.admin]: "Clinic-wide scheduling, records and accounts.",
};

/**
 * A user can hold several roles at once. Each role keeps its own self-contained
 * view — they are switched between, never merged into one screen.
 */
export function RoleSelect() {
  const { session } = useSession();
  const roles = (session?.profileKeys ?? []).filter((pk) => pk !== PROFILE.generic);

  return (
    <div className="centre">
      <div className="panel" style={{ textAlign: "left" }}>
        <h1>Choose a view</h1>
        <p>Your account holds more than one role. Pick the one you want to work in.</p>
        {roles.map((pk) => (
          <Link key={pk} className="role-choice" to={roleRoutes[pk] ?? "/"}>
            <strong>{roleLabels[pk] ?? pk}</strong>
            <span>{BLURB[pk] ?? ""}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
