# Security

What is in place, what was deliberately left out, and what only a person with
access to the GitHub and hosting accounts can turn on.

## Sign-in

- **Rate limiting.** Five failed sign-ins per account per fifteen minutes;
  a higher shared ceiling per client address, tunable with
  `LOGIN_IP_ATTEMPT_LIMIT` for staff behind one outbound address. Counters
  live in Postgres, because the app runs as serverless functions and an
  in-process counter would be per-instance. Enforced inside `authorize()`,
  not only in the form's action — the credentials callback has its own public
  endpoint.
- **Revocable sessions.** `User.sessionsValidFrom` invalidates every session
  issued before it. Bumped automatically on a password change, a role change
  and on deactivation; available on its own from the users table
  ("sign out everywhere"). Checked on every session read.
- **Password hashing.** bcrypt, cost 12.

## Responses

`next.config.ts` sets, on every response: a Content-Security-Policy,
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy` and HSTS, with `X-Powered-By` removed.

Verify the policy after changing it:

```bash
npm run start            # in one shell
npm run qa:csp           # in another
```

The sweep loads every route with the policy enforcing, drives the video
player, the map, global search and the finder, and reports anything the
browser refused.

**HSTS preload is deliberately not set.** Submitting a domain to the preload
list is effectively irreversible and commits every present and future
subdomain to HTTPS. That is the domain owner's decision. To take it, add
`preload` to the `Strict-Transport-Security` value and submit at
<https://hstspreload.org>.

**`script-src` allows `'unsafe-inline'`** because the App Router streams its
payload through inline script tags. The alternative is a per-request nonce,
which makes every page dynamic and costs the site its static and ISR caching.
The primary defence against injected markup is the sanitizer in
`src/lib/sanitize.ts`, which every piece of CMS rich text passes through.

## Audit log

Every mutating admin action and every authentication event writes to
`AuditEvent`: who, what, when, from where. Readable at `/admin/audit` by
administrators.

Append-only is enforced by a database trigger, not by convention — updates are
refused outright, and deletes are refused until a row is past the 400-day
retention window. `tests/unit/audit-coverage.test.ts` fails if an admin action
is added without a corresponding audit call.

## Dependency and code scanning

- **Dependencies.** `node scripts/qa/audit-gate.mjs` runs in CI and fails on
  any high or critical advisory that is not individually recorded in
  `security/audit-exceptions.json`. Each exception names how the vulnerable
  code is reached, why a request cannot reach it, what upgrade it is waiting
  for, and when to look again. A blanket `npm audit --audit-level=high` would
  be red from the day it was added, and a gate that is always red is one
  nobody reads.
- **Code.** `.github/workflows/codeql.yml` runs CodeQL with
  `security-extended` on every push and weekly.
- **Updates.** `.github/dependabot.yml` opens grouped patch/minor pull
  requests weekly; majors arrive separately because each needs reading.

### Needs enabling in GitHub settings — not something a file can do

Under **Settings → Code security**:

- **Secret scanning** — catches a credential committed by accident.
- **Push protection** — refuses the push instead of reporting it afterwards,
  which is the difference between a near miss and a rotation.
- **Dependabot alerts and security updates** — the alert side of the config
  above.

## Personal data and retention

`/privacy` describes exactly what this site collects — enquiry fields, search
and question text, usage counters, and the one session cookie — and reads its
retention periods from `src/server/data/retention.ts` rather than restating
them, so the page cannot drift from the behaviour it describes.

The sweep itself (`/api/maintenance/prune`, run daily by the Vercel Cron entry
in `vercel.json`) **reports what it would delete and deletes nothing** until
`DATA_RETENTION_ENABLED=1` is set. How long a business may keep a customer's
enquiry is a question about that business's obligations, not something a
default should decide. Review the real numbers first:

```bash
npm run maintenance:prune            # report only
```

Then set the windows (`RETENTION_*` in `.env.example`) and turn it on. The
endpoint refuses every request without `CRON_SECRET` configured, rather than
defaulting to open.

## Still open

- **MFA for admin accounts.** Not yet implemented. Sign-in rate limiting and
  revocable sessions reduce the urgency; MFA is what turns a leaked password
  from an incident into a nuisance.
- **Backup and recovery rehearsal.** See `docs/RUNBOOK.md`.
- **Retention periods.** The mechanism is built and off. The owner needs to
  confirm the windows and enable it.
- **Legal review of `/privacy`.** The page is a factual description of what
  the code does, written to be accurate rather than to satisfy any particular
  jurisdiction.
