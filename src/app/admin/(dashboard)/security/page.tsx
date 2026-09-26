import { ShieldCheck } from "lucide-react";
import QRCode from "qrcode";
import { AdminPageHeader } from "@/components/admin/page-header";
import { MfaPanel } from "@/components/admin/mfa-panel";
import { requireUser } from "@/server/auth";
import { createEnrolment, mfaStateFor } from "@/server/mfa";

export const metadata = { title: "Your security — admin" };

/**
 * A person's own second factor, on their own page.
 *
 * The secret is generated per page load and only written to the user record
 * once a working code has been produced from it — an abandoned enrolment must
 * not leave an account holding a factor nobody can satisfy.
 */
export default async function AdminSecurityPage() {
  const user = await requireUser();
  const state = await mfaStateFor(user.id);

  let enrolment: { secret: string; uri: string; qr: string } | null = null;
  if (!state.enrolled) {
    const { secret, uri } = createEnrolment(user.email ?? user.id);
    // Rendered as inline SVG rather than fetched: the Content-Security-Policy
    // allows no third-party image host, and a QR code is not worth one.
    const qr = await QRCode.toString(uri, { type: "svg", margin: 1, width: 200 });
    enrolment = { secret, uri, qr };
  }

  return (
    <>
      <AdminPageHeader
        title="Your security"
        description="Two-factor authentication for your own account. It is what turns a leaked password from an incident into a nuisance."
      />
      <div className="max-w-2xl">
        <div className="rounded-3xl border border-line bg-cream p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck
              className={state.enrolled ? "size-5 text-leaf-700" : "size-5 text-ink-faint"}
            />
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                {state.enrolled ? "Two-factor authentication is on" : "Not yet set up"}
              </h2>
              <p className="mt-0.5 text-sm text-ink-soft">
                {state.enrolled
                  ? `${state.recoveryCodesRemaining} recovery code${state.recoveryCodesRemaining === 1 ? "" : "s"} left.`
                  : "Signing in will ask for your password only."}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <MfaPanel enrolled={state.enrolled} enrolment={enrolment} />
          </div>
        </div>
      </div>
    </>
  );
}
