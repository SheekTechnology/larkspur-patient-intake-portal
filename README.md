# Larkspur Patient Portal

A React single-page app for Knack application **Larkspur Patient Portal**
(`6aa04444b6577f098d9dae6e`), deployable to Cloudflare Pages.

Knack is the whole backend: the data, the logins, and every decision about who
may see which record. This site holds no database, no user table, no session
store, and no permission logic of its own.

---

## How access control works here

Knack's Data Access Control (DAC) is enabled on the app and enforced by the Knack
API. It is a role × object matrix with two slots per pair:

- **Owned** — records the user owns, via each table's `Owned By` connection
- **Other** — every other record

The single most important consequence: **a record has exactly one owner.** So
"patients see only their own appointments" and "providers see only their own
appointments" cannot both be expressed. `Owned By` is the patient, and providers
and admins are granted clinic-wide `Other` read instead.

Current matrix:

| Table | Patient | Provider | Clinic admin | Public |
|---|---|---|---|---|
| Accounts (`object_1`) | own, view only | none | all, no delete | none |
| Patients (`object_4`) | own, edit | all, no delete | all, no delete | none |
| Providers (`object_5`) | all, view only | all view · own edit | all, no delete | none |
| Appointments (`object_6`) | own, edit | all, no delete | all + delete | none |
| Documents (`object_7`) | own, edit | all, no delete | all + delete | none |
| Clinic Admin (`object_8`) | none | none | all, no delete | none |

The frontend never filters for privacy. `listRecords` is called without any
"only mine" rule — the response is already trimmed by Knack. The one place a
filter narrows by user is the provider's **My panel** toggle, which is a
convenience view over records the provider is independently allowed to read; it
is labelled as such on screen so nobody mistakes it for a boundary.

### Known gap — read this

**New accounts still default to the Clinic Admin role.** The Knack MCP API can
move the default flag between roles but cannot clear it, and there is no
registration toggle exposed. Until someone clears it in the builder under
**Users → Roles**, anyone who self-registers receives clinic-wide access.

Fix it in the Knack builder, then confirm the Access tab in the admin view.

---

## Authentication

OAuth 2.0 authorization code + PKCE, run entirely in the browser. There is no
server component and no `/api/*` route.

- Users authenticate on **Knack's hosted login page**. This app never sees,
  collects or stores a password.
- Tokens live in `sessionStorage`, tab-scoped — never cookies or `localStorage`.
- Access tokens refresh proactively inside 60s of expiry, and reactively on a 401.
- Sign-out revokes at `/v1/oauth/revoke`, killing every token for that user+client.
- The app's **private REST API key is deliberately absent** from this codebase.
  Only the app id and OAuth client id are embedded, and both are public
  identifiers.

Registered OAuth client: `6aa0c5a72f97ed92438f4232`
Registered redirect URI: `https://larkspur-patient-portal.pages.dev/auth/callback`

---

## The three sites

Each role gets a self-contained view with its own layout and navigation. There is
no shared component that shows and hides pieces by role.

**Patient** (`/patient`, `profile_4`) — appointments with cancel and request,
documents with upload and download, editable contact details, provider directory.

**Provider** (`/provider`, `profile_5`) — appointment schedule defaulting to their
own panel with a whole-clinic toggle, inline status and visit-note editing, and
the patient roster with search.

**Clinic admin** (`/admin`, `profile_8`) — all appointments including delete,
people management across all three user tables with account status control, all
documents, and a read-only restatement of the access matrix.

**No role** (`/welcome`, `all_users`) — a pending-approval landing page. Accounts
with no clinic role are never redirected into a role view or shown an error.

A user holding several roles gets a role switcher at `/role-select`.

---

## Running it

```bash
npm install
npm run dev
```

Local development needs an HTTPS origin registered as a redirect URI — Knack
rejects both unregistered origins and plain `http://localhost`. Either register a
local HTTPS tunnel URL against the OAuth client, or test against a Pages preview
deployment.

## Deploying to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name=larkspur-patient-portal
```

Or connect the repo in the Cloudflare dashboard with build command `npm run build`
and output directory `dist`.

`public/_redirects` sends all paths to `index.html` so client-side routes such as
`/auth/callback` resolve on hard refresh. `public/_headers` sets `X-Frame-Options`,
`nosniff`, and a `no-referrer` policy.

**Every origin the app is served from must be registered as a redirect URI**, or
Knack fails the login with `auth_request_expired`. That includes custom domains
and, if you use them, Pages preview URLs. Re-register with the Knack MCP server
passing the existing `clientId` and the full list — it replaces all URIs.

---

## Layout

```
src/knack/       config (ids, object/field keys, verbatim choice values)
                 auth (PKCE, token lifecycle), api (typed client, KnackError)
                 session (profileKeys + role record ids), useRecords, records helpers
src/routes/      Login, Callback, Welcome, Unauthorized, RoleSelect
                 patient/, provider/, admin/
src/components/  Layout, ApiError, Bits
```

Two details worth knowing before editing:

- **`session.user.id` is the account id** (`object_1`) and is rejected by
  connection fields that point at a role object. After login the app resolves a
  per-role record id (`roleRecordIds`) and writes that instead.
- **Multiple-choice values in `CHOICES` are copied verbatim** from each field's
  `format.options`. Knack matches them case-sensitively, so a retyped or
  recapitalised value silently returns zero rows.

## Errors

Every Knack failure surfaces in the UI with its status, error code and the
server's own message, selectable for copy-paste. Nothing is swallowed. A 403 is
rendered as an expected outcome — "Knack denied this request" — rather than as a
crash, because in a DAC-enforced app it is normal traffic.
