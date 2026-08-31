"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/skeleton";

export interface LoginState {
  /**
   * "credentials" — the email/password pair was rejected.
   * "server"      — the sign-in attempt itself failed. This is NOT a statement
   *                 about the credentials, and must never be reported as one.
   */
  status?: "credentials" | "server";
  /** Echoed back so a failed attempt doesn't make the user retype it. */
  email?: string;
}

const MESSAGES: Record<NonNullable<LoginState["status"]>, string> = {
  credentials: "Invalid email or password.",
  server:
    "We couldn’t complete the sign-in — something went wrong on our side, not with your details. Please try again.",
};

export function AdminLoginForm({
  action,
  from,
}: {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
  from: string;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(action, {});

  return (
    <>
      {state.status && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger"
        >
          {MESSAGES[state.status]}
        </p>
      )}
      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="from" value={from} />
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
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-humus-900 font-display text-sm font-medium text-paper transition-colors hover:bg-humus-700 disabled:opacity-70"
        >
          {pending ? (
            <>
              <Spinner className="size-4 text-paper" /> Signing in…
            </>
          ) : (
            <>
              <LogIn className="size-4" /> Sign in
            </>
          )}
        </button>
      </form>
    </>
  );
}
