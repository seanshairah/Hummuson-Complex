# Runbook — recovery and incidents

For the moment when something has gone wrong and nobody wants to be reading
prose. Each section is meant to be followed top to bottom.

---

## 1. Who does what

There are two roles, and one person can hold both — the point is that both
jobs are somebody's, so neither is nobody's.

| Role         | Decides                                                      |
| ------------ | ------------------------------------------------------------ |
| **Owner**    | Whether to take the site down, whether to restore, whether to notify customers, and when it is over. |
| **Operator** | Runs the commands. Keeps a timestamped note of what was done. |

Write both names here, with phone numbers:

- Owner: _____________________
- Operator: _____________________
- Neon account holder (may be neither of the above): _____________________
- Vercel account holder: _____________________

If those last two are one person on one laptop, that is the single largest
risk on this page and no command below fixes it.

---

## 2. What is backed up, and what is not

**Neon point-in-time recovery.** Neon keeps a history window and can branch the
database to any moment within it. This is the first thing to reach for and the
only thing that recovers the last few minutes.

> **Confirm the window in the Neon console → Project → Settings → History
> retention, and write it here: _______ .** It varies by plan, and knowing the
> number in a crisis is too late. If it is 24 hours, that is also the longest
> a problem can go unnoticed and still be recoverable this way.

**The independent copy.** `scripts/maintenance/backup.sh` writes a complete
`pg_dump` to a local file. Neon PITR is a feature of the platform holding the
data: it does not help if the account is lost, the project is deleted, or the
retention window has already passed when the problem is noticed.

```bash
DATABASE_URL="<unpooled Neon URL>" ./scripts/maintenance/backup.sh
```

Use the **unpooled** connection string — the one without `-pooler`. `pg_dump`
needs a session, and the pooler does not give it one.

The file contains password hashes and TOTP secrets. It is exactly as sensitive
as the database.

**Not backed up automatically.** Nothing runs this on a schedule yet. Until
someone does, the independent copy is only as fresh as the last time a person
ran the command. Options, cheapest first: a monthly calendar reminder; a cron
job on any always-on machine; a scheduled GitHub Actions job with the connection
string as a repository secret.

**Uploaded media** lives on the filesystem under `public/uploads`, not in the
database. On Vercel that filesystem does not survive a deployment, which is why
`docs/DEPLOYMENT.md` recommends Cloudinary for production uploads. Media
migrated from the old site is committed to the repository and is safe.

---

## 3. Targets

Proposals, not commitments — the owner should confirm or change them:

| | Target | Basis |
| --- | --- | --- |
| **RPO** (data we can afford to lose) | 5 minutes | Neon PITR granularity. The realistic loss is one or two enquiries. |
| **RTO** (time to be back up) | 1 hour | Restore itself is minutes; the hour is for noticing, deciding, and checking afterwards. |

---

## 4. Drill: restore from the independent copy

Run this **before** you need it, and again whenever the schema changes
substantially. It does not touch production.

```bash
# 1. Take a dump
DATABASE_URL="<unpooled Neon URL>" ./scripts/maintenance/backup.sh

# 2. Restore it somewhere disposable
createdb restore_drill
pg_restore --no-owner --no-privileges \
  -d "postgresql://localhost/restore_drill" backups/humuson-<stamp>.dump

# 3. Check it is actually the data
psql -d restore_drill -c 'SELECT count(*) FROM "Product";'
psql -d restore_drill -c 'SELECT count(*) FROM "Enquiry";'
psql -d restore_drill -c 'SELECT count(*) FROM "User" WHERE "totpConfirmedAt" IS NOT NULL;'

# 4. Check the audit log is still append-only after the restore
psql -d restore_drill -c 'UPDATE "AuditEvent" SET action = $$x$$ WHERE id = (SELECT id FROM "AuditEvent" LIMIT 1);'
#    → must fail with: AuditEvent rows cannot be modified

# 5. Clean up
dropdb restore_drill
```

**Last rehearsed:** 2026-09-01, against the development database.
Dump 160 KB, restore 285 ms. Row counts matched exactly; password hashes still
verified; six enrolled second factors survived; the append-only trigger was
still refusing updates afterwards.

**Not yet rehearsed against production Neon**, which needs console access this
project does not have. Someone with that access should run steps 1–5 once
against a real dump and replace the paragraph above with what they saw.

---

## 5. Restoring for real

**Do not restore over the live database.** Branch or restore into a new one,
check it, then repoint the application.

### From Neon PITR (first choice — recovers the most recent data)

1. Neon console → **Branches** → **Create branch** → *from a point in time*,
   set to just before the damage.
2. Copy the new branch's connection string.
3. Check it with the queries in §4 step 3. Do not skip this: a restore to the
   wrong moment looks exactly like a successful restore.
4. Vercel → Settings → Environment Variables → set `DATABASE_URL` to the new
   branch → **Redeploy**.
5. Confirm the site loads, sign in, and check the product count matches.
6. Keep the old branch until you are certain. It costs nothing to keep for a
   week and everything to have deleted.

### From the independent copy (when Neon itself is the problem)

1. Create a new Postgres database anywhere — Neon, another provider, a machine.
2. `pg_restore --clean --if-exists --no-owner --no-privileges -d "<new url>" <file>`
3. §4 step 3 again.
4. Repoint `DATABASE_URL` and redeploy.

The schema arrives with the dump. `npm run build` applies any migrations the
dump predates, so a restore of an older backup onto current code brings itself
up to date.

---

## 6. Playbooks

### An admin password has leaked

1. **Users** → the account → **Sign out everywhere**. Its sessions die on their
   next request.
2. Edit the account and set a new password. This also ends every session.
3. If the account did not have two-factor authentication, add it now at
   `/admin/security`.
4. **Audit log** → *Failed sign-ins* and *Sign-ins*: what did that account do,
   and from where? Compare the addresses against ones you recognise.
5. Every content change the account made is in the log under its own name.
   Check them and revert what you did not authorise.
6. If a second account was created or a role was raised, those are
   `user.created` and `user.role_changed` — and they are how an attacker keeps
   access after the password is changed. Look for them specifically.

### Content on the public site is wrong or hostile

1. Set the affected item to **Draft** — that removes it from the public site
   immediately, and unlike deleting it, keeps the evidence.
2. **Audit log**, filtered to that entity: who changed it and when.
3. Then work the leaked-password playbook for whichever account did it.

### The site is down

1. Vercel → **Deployments**: did the most recent one fail? Read the build log.
   A failed build leaves the previous deployment serving, so a total outage is
   unlikely to be the build.
2. Neon → is the project awake and inside its limits?
3. Load `/api/search?q=test`. A response means the app and database are both
   alive and the problem is narrower than it looks.
4. Vercel → **Instant Rollback** to the last good deployment. Do this before
   diagnosing further: being up is more urgent than knowing why.

### Data has been deleted

1. Stop writing to the database. Take the site down if the deletion is
   ongoing — Vercel → Settings → Deployment Protection.
2. Note the time as precisely as you can. §5 depends on it.
3. Check the audit log first: `*.deleted` entries name what went and who did
   it. If it was one item, re-entering it by hand beats a restore.
4. Otherwise restore per §5, to just before the first deletion.

---

## 7. Afterwards

Within a week, write down: what happened, when it was noticed, how long it
took, what fixed it, and the one change that would have prevented it or
shortened it. Then make that change.

Add anything this page did not answer.
