import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/server/auth";
import { Logo } from "@/components/layout/logo";
import { AdminLoginForm, type LoginState } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (session?.user)
    redirect(params.from && params.from.startsWith("/admin") ? params.from : "/admin");

  async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
    "use server";
    const from = formData.get("from");
    const email = String(formData.get("email") ?? "").trim();
    const target =
      typeof from === "string" && from.startsWith("/admin") && from !== "/admin/login"
        ? from
        : "/admin";
    try {
      await signIn("credentials", {
        email,
        password: formData.get("password"),
        redirectTo: target,
      });
    } catch (error) {
      // A successful sign-in redirects by throwing NEXT_REDIRECT — let it pass.
      if (error instanceof AuthError) {
        // Only CredentialsSignin means the pair was actually rejected. Anything
        // else (a database failure, a misconfiguration) is our fault, and
        // telling the admin their password is wrong would send them hunting
        // for a problem that isn't there.
        return {
          status: error.type === "CredentialsSignin" ? "credentials" : "server",
          email,
        };
      }
      throw error;
    }
    return {};
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
          <AdminLoginForm action={login} from={params.from ?? ""} />
        </div>
        <p className="mt-6 text-center text-xs text-paper/40">
          Humuson Complex platform · authorised staff only
        </p>
      </div>
    </div>
  );
}
