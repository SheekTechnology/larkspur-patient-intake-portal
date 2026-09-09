import { useSession } from "../knack/session";

/**
 * Landing page for accounts holding only `all_users` — no clinic role assigned
 * yet. They are not redirected into a role view and are not shown an error.
 */
export function Welcome() {
  const { session, signOut } = useSession();

  return (
    <div className="centre">
      <div className="panel">
        <h1>Your account is awaiting approval</h1>
        <p>
          {session?.fullName ? `Thanks, ${session.fullName}. ` : ""}
          Your Larkspur account exists but does not have a clinic role yet, so
          there is nothing to show. A clinic administrator assigns your role — once
          that happens, sign in again and your portal will appear.
        </p>
        <p>If you were expecting access already, contact the clinic office.</p>
        <button className="btn" onClick={() => void signOut()}>Sign out</button>
      </div>
    </div>
  );
}
