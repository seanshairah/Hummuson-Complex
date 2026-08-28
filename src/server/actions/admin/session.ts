"use server";

import { signOut } from "@/server/auth";

export async function signOutAdmin(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
