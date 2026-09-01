"use client";

import { useActionState, useState } from "react";
import { LogIn } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/skeleton";

export interface LoginState {
  /**
   * "credentials"      — the email/password pair was rejected.
   * "code"             — the password was accepted; a second factor is needed.
   *                      Also used when a code was wrong and can be retried.
   * "challengeExpired" — the second-factor step ran out of time or attempts.
   * "throttled"        — too many recent attempts; the pair was never checked.
   * "server"           — the sign-in attempt itself failed. This is NOT a
   *                      statement about the credentials, and must never be
   *                      reported as one.
   */
  status?: "credentials" | "code" | "challengeExpired" | "throttled" | "server";
  /** Echoed back so a failed attempt doesn't make the user retype it. */
  email?: string;
  /** Set with "throttled": how long until another attempt is accepted. */
  retryAfterSeconds?: number;
  /** Set with "code": identifies the passed password step being completed. */
  challengeId?: string;
}

const MESSAGES: Record<NonNullable<LoginState["status"]>, string> = {
  credentials: "Invalid email or password.",
  code: "That code wasn’t right. Try the current one from your authenticator app.",
  challengeExpired: "That took too long. Please sign in again.",
  throttled: "Too many sign-in attempts. Please wait before trying again.",
  server:
    "We couldn’t complete the sign-in — something went wrong on our side, not with your details. Please try again.",
};

/** "in about 4 minutes" reads better on a lockout notice than "in 214s". */
function waitFor(seconds: number): string {
  if (seconds < 90) return `Try again in about ${Math.max(1, Math.ceil(seconds / 10) * 10)} seconds.`;
  const minutes = Math.ceil(seconds / 60);
  return `Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export function AdminLoginForm({
  action,
  from,
}: {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
  from: string;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(action, {});
  const awaitingCode = Boolean(state.challengeId);
  // On the first arrival at the code step the password was accepted, so the
  // "that code wasn't right" line would be a lie. It only applies once a code
  // has actually been submitted.
  const [codeAttempted, setCodeAttempted] = useState(false);
  const showMessage = state.status && !(state.status === "code" && !codeAttempted);

  return (
    <>
      {awaitingCode && !showMessage && (
        <p className="mt-4 rounded-xl bg-leaf-300/30 px-4 py-2.5 text-sm font-medium text-leaf-800">
          Enter the 6-digit code from your authenticator app.
        </p>
      )}
      {showMessage && state.status && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger"
        >
          {MESSAGES[state.status]}
          {state.status === "throttled" && state.retryAfterSeconds ? (
            <span className="mt-1 block font-normal">{waitFor(state.retryAfterSeconds)}</span>
          ) : null}
        </p>
      )}
      <form
        action={formAction}
        className="mt-6 space-y-4"
        onSubmit={() => setCodeAttempted(awaitingCode)}
      >
        <input type="hidden" name="from" value={from} />
        {awaitingCode ? (
          <>
            <input type="hidden" name="email" value={state.email ?? ""} />
            <input type="hidden" name="challengeId" value={state.challengeId} />
            <Field
              label="Authentication code"
              hint="Six digits from your authenticator app, or one of your recovery codes."
              required
            >
              <Input
                name="code"
                inputMode="text"
                autoComplete="one-time-code"
                autoCapitalize="off"
                spellCheck={false}
                required
                autoFocus
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Email" required>
              <Input
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.email ?? ""}
                required
                autoFocus
              />
            </Field>
            <Field label="Password" required>
              <Input name="password" type="password" autoComplete="current-password" required />
            </Field>
          </>
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-humus-900 font-display text-sm font-medium text-paper transition-colors hover:bg-humus-700 disabled:opacity-70"
        >
          {pending ? (
            <>
              <Spinner className="size-4 text-paper" />{" "}
              {awaitingCode ? "Checking…" : "Signing in…"}
            </>
          ) : (
            <>
              <LogIn className="size-4" /> {awaitingCode ? "Verify" : "Sign in"}
            </>
          )}
        </button>
      </form>
    </>
  );
}
