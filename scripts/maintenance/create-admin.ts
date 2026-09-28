/**
 * Provisions a full-access admin account, or repairs one that already exists.
 *
 * Idempotent by design: running it again resets the password, restores the
 * ADMIN role and reactivates a disabled account, so it doubles as the
 * lock-out recovery step referenced in docs/RUNBOOK.md.
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... npm run admin:create
 *
 * Against Neon — or any host where outbound 5432 is blocked but 443 is open:
 *
 *   NEON_WS=1 DATABASE_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *     npm run admin:create
 *
 * The password is read from the environment and never from argv, so it stays
 * out of shell history and out of the process list on a shared host. It is
 * never echoed back, including in the summary this prints on success.
 */
import bcrypt from "bcryptjs";
import { createPrismaClient } from "../migration/client";

const prisma = createPrismaClient();

/** Matches the rule the admin user form applies, so both doors agree. */
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_PASSWORD_LENGTH = 10;
const BCRYPT_COST = 12;

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function main() {
  // Lowercased for the same reason the sign-in credentials schema lowercases
  // what it receives: the lookup is an exact match on a unique column, so an
  // address stored with a capital letter is an account nobody can sign in to.
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = (process.env.ADMIN_NAME ?? "").trim();

  if (!email) fail("ADMIN_EMAIL is required.");
  if (!EMAIL_PATTERN.test(email)) fail(`ADMIN_EMAIL is not a valid address: ${email}`);
  if (!name) fail("ADMIN_NAME is required.");
  if (name.length < 2) fail("ADMIN_NAME must be at least 2 characters.");
  if (!password) fail("ADMIN_PASSWORD is required.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true, active: true },
  });
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  if (!existing) {
    const created = await prisma.user.create({
      data: { email, name, passwordHash, role: "ADMIN", active: true },
      select: { id: true },
    });
    await prisma.auditEvent.create({
      data: {
        action: "user.created",
        actorEmail: "script:create-admin",
        entityType: "user",
        entityId: created.id,
        entityLabel: email,
        meta: { role: "ADMIN" },
      },
    });
    console.log(`✓ created admin ${email} (${name})`);
    return;
  }

  const roleChanged = existing.role !== "ADMIN";
  const reactivated = !existing.active;

  // The password is always rewritten here, and a new password has to end the
  // sessions issued under the old one — otherwise resetting a leaked password
  // leaves the holder signed in for the rest of the session's week. Promotion
  // and reactivation invalidate for the same reason the admin form does.
  await prisma.user.update({
    where: { id: existing.id },
    data: {
      name,
      passwordHash,
      role: "ADMIN",
      active: true,
      sessionsValidFrom: new Date(),
    },
  });

  if (roleChanged) {
    await prisma.auditEvent.create({
      data: {
        action: "user.role_changed",
        actorEmail: "script:create-admin",
        entityType: "user",
        entityId: existing.id,
        entityLabel: email,
        meta: { from: existing.role, to: "ADMIN" },
      },
    });
  }
  if (reactivated) {
    await prisma.auditEvent.create({
      data: {
        action: "user.reactivated",
        actorEmail: "script:create-admin",
        entityType: "user",
        entityId: existing.id,
        entityLabel: email,
      },
    });
  }
  await prisma.auditEvent.create({
    data: {
      action: "user.password_changed",
      actorEmail: "script:create-admin",
      entityType: "user",
      entityId: existing.id,
      entityLabel: email,
    },
  });

  const repairs = [
    roleChanged ? `promoted from ${existing.role}` : null,
    reactivated ? "reactivated" : null,
    existing.name === name ? null : `renamed from "${existing.name}"`,
    "password reset",
    "existing sessions signed out",
  ].filter(Boolean);
  console.log(`✓ updated admin ${email} (${name}) — ${repairs.join(", ")}`);
}

main()
  .catch((error) => {
    console.error("✗ admin provisioning failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
