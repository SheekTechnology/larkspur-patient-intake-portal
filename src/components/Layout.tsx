import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useSession } from "../knack/session";
import { roleLabels } from "../knack/config";

export type NavItem = { to: string; label: string; end?: boolean };

export function Layout({
  title, accent, nav, children,
}: { title: string; accent: string; nav: NavItem[]; children: ReactNode }) {
  const { session, signOut } = useSession();

  return (
    <div className={`shell shell--${accent}`}>
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__mark" aria-hidden="true" />
          <div>
            <div className="topbar__app">Larkspur</div>
            <div className="topbar__role">{title}</div>
          </div>
        </div>
        <div className="topbar__user">
          {session && (
            <>
              <div className="topbar__name">
                {session.fullName}
                <span className="topbar__badges">
                  {session.profileKeys.map((pk) => (
                    <span key={pk} className="badge">{roleLabels[pk] ?? pk}</span>
                  ))}
                </span>
              </div>
              <button className="btn btn--ghost" onClick={() => void signOut()}>Sign out</button>
            </>
          )}
        </div>
      </header>

      <nav className="tabs">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `tabs__link ${isActive ? "is-active" : ""}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="content">{children}</main>

      <footer className="footer">
        Records shown here are the ones Knack permits your account to see. Access
        control is enforced server-side by Knack, not by this site.
      </footer>
    </div>
  );
}
