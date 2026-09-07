# Deployment

Target: **Vercel** (app) + **Neon** (PostgreSQL). Any Node host with PostgreSQL works.

## 1. Database (Neon)

1. Create a Neon project → copy the **pooled** connection string.
2. Set `DATABASE_URL=postgresql://…?sslmode=require`.
3. Apply schema & content:
   ```bash
   npx prisma migrate deploy
   npm run db:seed          # imports content/*.json (idempotent)
   ```

**Restricted networks** (outbound Postgres/5432 blocked, only 443 open): the same
two steps work over Neon's serverless driver instead —
```bash
DATABASE_URL=… npx tsx scripts/migration/deploy-neon.ts   # migrations over WebSocket
NEON_WS=1 DATABASE_URL=… npm run db:seed                  # seed over WebSocket
```
`deploy-neon.ts` records applied migrations in `_prisma_migrations` exactly like
the Prisma CLI, so the two paths are interchangeable.

**Migrations are applied by the build.** `npm run build` runs
`scripts/migration/apply-pending.mjs` before `next build`, which picks the
WebSocket path for Neon connection strings and the Prisma CLI for anything
else. Schema and code therefore deploy together, and a migration that fails
fails the build, leaving the previous deployment serving rather than shipping
code that queries tables the database has never heard of. The commands above
are still what you want for a first-time setup or a manual run.

## 2. Environment variables (Vercel → Settings → Environment Variables)

| Variable                       | Notes                                             |
| ------------------------------ | ------------------------------------------------- |
| `DATABASE_URL`                 | Neon pooled string                                |
| `AUTH_SECRET`                  | `openssl rand -base64 32`                         |
| `AUTH_TRUST_HOST`              | `true`                                            |
| `NEXT_PUBLIC_SITE_URL`         | `https://humusoncomplex.com`                      |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`  | `263776656433`                                    |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Seed admin — **set strong values before seeding production**, or change the password immediately in `/admin/users` |
| `NEXT_PUBLIC_POSTHOG_KEY` (opt)| Leave empty to run first-party analytics only     |

## 3. App

- Import the repo in Vercel; framework auto-detected. Build =
  `prisma generate && next build`, so the Prisma client is always fresh even
  when the host restores cached dependencies.
- The build statically generates public pages against the database, so
  `DATABASE_URL` must be reachable at build time (Neon is).
- After content edits in `/admin`, pages revalidate instantly via cache tags —
  no redeploy needed.

## 4. Media strategy

- Migrated imagery ships in the repo (`public/images`, ~10MB, optimized by next/image).
- The admin upload driver writes to `public/uploads` — fine for a persistent Node host,
  **not durable on Vercel's serverless filesystem**. For Vercel, either:
  1. keep uploads out of the workflow (reference images by URL), or
  2. wire Cloudinary: set `CLOUDINARY_URL`, replace the write in
     `src/app/api/admin/upload/route.ts` with an upload-stream call (single file),
     keep the Media record shape unchanged.

## 5. Domain cutover checklist

### 5.1 Pointing DNS at Vercel

The domain is registered at Hostinger but its DNS is not — the nameservers are
`ns1`–`ns4.stackdns.com`, and hPanel's DNS tab says as much ("DNS is managed by
another provider"). Records are changed in the StackDNS panel; edits made in
hPanel do nothing.

It also carries live mail, which is the reason the record route below is
preferred over changing nameservers:

```
MX   10 mx1.titan.email        MX  20 mx2.titan.email
TXT  "v=spf1 include:spf.stackmail.com +include:spf.titan.email ~all a mx -all"
```

Delegating the domain to Vercel's nameservers hands Vercel the whole zone, and
any record not recreated there stops existing — these two included. Mail then
fails quietly: senders see nothing wrong for hours. Adding two records instead
leaves mail untouched.

1. Vercel → project → **Settings → Domains**: add `humusoncomplex.com`, then
   `www.humusoncomplex.com`.
2. Take the values from **that screen**. The apex `A` value and the `www`
   `CNAME` target are issued per project (the CNAME looks like
   `d1d4fc829fe7bc7c.vercel-dns-017.com`), so a value copied from a tutorial or
   from another project resolves to nothing.
3. Record what the zone holds today before touching it — at the time of writing
   both the apex and `www` were `A 185.146.167.201`. Putting those back is the
   rollback.
4. In StackDNS: replace the apex `A`, point `www` at the `CNAME`. Leave `MX` and
   the SPF `TXT` alone.
5. Wait for Vercel to report **Valid Configuration**. The zone's TTL is 300s, so
   both the cutover and the rollback are minutes rather than days.

### 5.2 Once the domain resolves

1. Set `NEXT_PUBLIC_SITE_URL` to `https://humusoncomplex.com` and redeploy —
   canonical URLs, the sitemap and the JSON-LD all read from it
   (`src/lib/site.ts`), and they stay on the `.vercel.app` hostname until it is
   set.
2. Verify legacy redirects: `/product/in5-2/`, `/shop/`, `/our-blog/` → new URLs (301).
3. Submit `https://humusoncomplex.com/sitemap.xml` in Search Console.
4. Change the seeded admin password; create personal staff accounts in `/admin/users`.
5. Generate the catalogue PDF against production:
   `BASE_URL=https://humusoncomplex.com npm run catalogue:pdf` (commits the file, or run
   on the host and upload) — the Download PDF buttons appear once `pdfUrl` is set.

## Local production parity

```bash
npm run setup && npm run build && npm start
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, migrations, seed,
build and the Playwright suite against a PostgreSQL 16 service on every push.
