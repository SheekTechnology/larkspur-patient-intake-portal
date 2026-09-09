import { Link } from "react-router-dom";

export function Unauthorized() {
  return (
    <div className="centre">
      <div className="panel">
        <h1>Not available for your role</h1>
        <p>
          Your account does not hold the role that section belongs to. Even if you
          reach its address directly, Knack will not return any records to you.
        </p>
        <Link className="btn" to="/">Back to your portal</Link>
      </div>
    </div>
  );
}
