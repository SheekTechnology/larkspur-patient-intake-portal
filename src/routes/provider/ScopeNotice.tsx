/**
 * Stated plainly on every provider screen. The "my panel" narrowing below is a
 * convenience filter, and calling it anything stronger would misrepresent what
 * the Knack permissions actually allow.
 */
export function ScopeNotice() {
  return (
    <div className="notice">
      <strong>Your Knack role can read clinic-wide records.</strong> The default
      filter narrows this screen to your own panel for convenience — it is not a
      privacy boundary. Anything you can reach here, your account is permitted to
      reach in Knack.
    </div>
  );
}
