"use server";

import { auth, signOut } from "@/server/auth";
import { writeAuditEvent } from "@/server/audit-log";

export async function signOutAdmin(): Promise<void> {
  // Read the session before ending it — afterwards there is nobody to name.
  const session = await auth().catch(() => null);
  await writeAuditEvent({
    action: "auth.signed_out",
    actorId: session?.user?.id,
    actorEmail: session?.user?.email,
  });
  await signOut({ redirectTo: "/admin/login" });
}
