import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/server/auth";
import { clientIp } from "@/server/rate-limit";
import { peekLoginThrottle } from "@/server/login-throttle";
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

    // The limit itself is enforced inside authorize(); this only reads the
    // counter so a locked-out person is told they are locked out. Checking
    // before signIn() also keeps a lockout from spending another attempt.
    const throttle = await peekLoginThrottle(email.toLowerCase(), clientIp(await headers()));
    if (!throttle.allowed) {
      return { status: "throttled", email, retryAfterSeconds: throttle.retryAfterSeconds };
    }

    try {
      await signIn("credentials", {
        email,
        password: formData.get("password"),
        redirectTo: target,
      });
    } catch (error) {
      // A successful sign-in redirects by throwing NEXT_REDIRECT — let it pass.
      if (error instanceof AuthError) {
        if (error.type === "CredentialsSignin") {
          // authorize() refuses a locked-out attempt the same way it refuses a
          // wrong password, so re-read the counter here: without this the
          // attempt that trips the lockout is reported as bad credentials.
          const after = await peekLoginThrottle(email.toLowerCase(), clientIp(await headers()));
          if (!after.allowed) {
            return { status: "throttled", email, retryAfterSeconds: after.retryAfterSeconds };
          }
          return { status: "credentials", email };
        }
        // Anything else (a database failure, a misconfiguration) is our fault,
        // and telling the admin their password is wrong would send them
        // hunting for a problem that isn't there.
        return { status: "server", email };
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
