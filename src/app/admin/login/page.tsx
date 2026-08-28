import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { LogIn } from "lucide-react";
import { auth, signIn } from "@/server/auth";
import { Logo } from "@/components/layout/logo";
import { Field, Input } from "@/components/ui/field";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (session?.user)
    redirect(params.from && params.from.startsWith("/admin") ? params.from : "/admin");

  async function login(formData: FormData) {
    "use server";
    const from = formData.get("from");
    const target =
      typeof from === "string" && from.startsWith("/admin") && from !== "/admin/login"
        ? from
        : "/admin";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: target,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/admin/login?error=1${from ? `&from=${encodeURIComponent(String(from))}` : ""}`);
      }
      throw error;
    }
  }

  return (
    <div className="bg-grain relative flex min-h-dvh items-center justify-center bg-humus-950 px-4">
      <div aria-hidden className="absolute inset-0 glow-leaf" />
      <div className="relative w-full max-w-sm">
        <div className="flex justify-center">
          <Logo tone="light" />
        </div>
        <div className="mt-8 rounded-3xl bg-cream p-7 shadow-pop">
          <h1 className="text-title text-ink">Admin sign in</h1>
          <p className="mt-1 text-sm text-ink-faint">Manage products, content and enquiries.</p>
          {params.error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger"
            >
              Invalid email or password.
            </p>
          )}
          <form action={login} className="mt-6 space-y-4">
            <input type="hidden" name="from" value={params.from ?? ""} />
            <Field label="Email" required>
              <Input name="email" type="email" autoComplete="email" required autoFocus />
            </Field>
            <Field label="Password" required>
              <Input name="password" type="password" autoComplete="current-password" required />
            </Field>
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-humus-900 font-display text-sm font-medium text-paper transition-colors hover:bg-humus-700"
            >
              <LogIn className="size-4" /> Sign in
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-paper/40">
          Humuson Complex platform · authorised staff only
        </p>
      </div>
    </div>
  );
}
