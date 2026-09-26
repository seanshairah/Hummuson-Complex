"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  confirmMfaEnrolment,
  disableMfa,
  regenerateRecoveryCodes,
  type EnrolmentState,
} from "@/server/actions/admin/security";
import type { AdminActionState } from "@/lib/admin-state";

/**
 * Recovery codes are shown once and never again — they are stored hashed, so
 * there is no version of this screen that could show them later.
 */
function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="border-sun-400/50 bg-sun-200/40 mt-4 rounded-2xl border p-4">
      <p className="font-display text-sm font-semibold text-humus-900">
        Save these recovery codes now
      </p>
      <p className="mt-1 text-xs text-humus-900/80">
        Each one signs you in once if you lose your phone. They are stored hashed, so this is the
        only time they can be shown.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm text-humus-900">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
    </div>
  );
}

function CodeField({
  state,
  label,
}: {
  state: { fieldErrors?: Record<string, string> };
  label: string;
}) {
  return (
    <Field label={label} error={state.fieldErrors?.code} required>
      <Input
        name="code"
        inputMode="text"
        autoComplete="one-time-code"
        spellCheck={false}
        required
      />
    </Field>
  );
}

export function MfaPanel({
  enrolled,
  enrolment,
}: {
  enrolled: boolean;
  enrolment: { secret: string; uri: string; qr: string } | null;
}) {
  const [setupState, setupAction, settingUp] = useActionState<EnrolmentState, FormData>(
    confirmMfaEnrolment,
    { status: "idle" },
  );
  const [offState, offAction, turningOff] = useActionState<AdminActionState, FormData>(disableMfa, {
    status: "idle",
  });
  const [codesState, codesAction, regenerating] = useActionState<EnrolmentState, FormData>(
    regenerateRecoveryCodes,
    { status: "idle" },
  );

  if (setupState.recoveryCodes) {
    return (
      <>
        <p className="text-sm text-leaf-800">{setupState.message}</p>
        <RecoveryCodes codes={setupState.recoveryCodes} />
      </>
    );
  }

  if (!enrolled && enrolment) {
    return (
      <form action={setupAction} className="space-y-4">
        <input type="hidden" name="secret" value={enrolment.secret} />
        <input type="hidden" name="uri" value={enrolment.uri} />
        <ol className="space-y-4 text-sm text-ink-soft">
          <li>
            <span className="font-medium text-ink">1. Scan this with your authenticator app.</span>
            <div
              className="mt-3 w-[200px] rounded-2xl bg-white p-3"
              // The SVG is generated on this server from a secret generated on
              // this server; nothing here comes from a request.
              dangerouslySetInnerHTML={{ __html: enrolment.qr }}
            />
            <p className="mt-2 text-xs text-ink-faint">
              Can’t scan? Enter this key instead:{" "}
              <code className="font-mono text-ink">{enrolment.secret}</code>
            </p>
          </li>
          <li>
            <span className="font-medium text-ink">2. Enter the code it shows.</span>
            <div className="mt-2 max-w-[220px]">
              <CodeField state={setupState} label="Authentication code" />
            </div>
          </li>
        </ol>
        <Button type="submit" disabled={settingUp}>
          {settingUp ? "Checking…" : "Turn on two-factor authentication"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      {codesState.recoveryCodes ? (
        <RecoveryCodes codes={codesState.recoveryCodes} />
      ) : (
        <form action={codesAction} className="space-y-3">
          <p className="text-sm text-ink-soft">
            Replace your recovery codes — the old ones stop working immediately.
          </p>
          <div className="max-w-[220px]">
            <CodeField state={codesState} label="Authentication code" />
          </div>
          <Button type="submit" variant="outline" size="sm" disabled={regenerating}>
            {regenerating ? "Working…" : "Replace recovery codes"}
          </Button>
        </form>
      )}

      <form action={offAction} className="space-y-3 border-t border-line pt-6">
        <p className="text-sm text-ink-soft">
          Turning this off leaves your password as the only thing protecting the admin area.
        </p>
        <div className="max-w-[220px]">
          <CodeField state={offState} label="Authentication code" />
        </div>
        {offState.status === "success" && (
          <p className="text-sm text-leaf-800">{offState.message}</p>
        )}
        <Button type="submit" variant="outline" size="sm" disabled={turningOff}>
          {turningOff ? "Working…" : "Turn off two-factor authentication"}
        </Button>
      </form>
    </div>
  );
}
