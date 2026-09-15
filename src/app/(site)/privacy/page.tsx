import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/shared/page-intro";
import { getContactSettings } from "@/server/data/settings";
import { retentionPolicy } from "@/server/data/retention";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${site.name} collects through this website, why, and how long it is kept.`,
};

/**
 * This page describes what the code on this site actually does — the forms
 * that exist, the fields they store, the counters that are written and the
 * retention windows configured in src/server/data/retention.ts. The retention
 * periods are read from that module rather than retyped, so the page cannot
 * drift away from the behaviour it describes.
 *
 * It is a factual description, not legal advice, and it says so. Whether it
 * satisfies a particular jurisdiction's requirements is a question for the
 * business and its advisers.
 */
export default async function PrivacyPage() {
  const contact = await getContactSettings();
  const policy = retentionPolicy();
  const contactEmail = contact.emails[0];

  const months = (days: number) => {
    const value = Math.round(days / 30);
    return value >= 12
      ? `${Math.round(days / 365)} year${days >= 730 ? "s" : ""}`
      : `${value} months`;
  };

  return (
    <>
      <PageIntro
        eyebrow="Legal"
        title="Privacy"
        lede={`What ${site.name} collects through this website, why it is collected, and how long it is kept.`}
        crumbs={[{ label: "Privacy" }]}
      />
      <div className="container-site pb-24">
        <div className="rich-text max-w-2xl">
          <h2>What this site collects</h2>

          <h3>When you send an enquiry</h3>
          <p>
            The contact form, the enquiry forms on product pages and the product finder store what
            you type into them: your name, and the email address, phone number, subject and message
            you provide. Where the enquiry came from a product page or the finder, the product and
            the answers you selected are stored alongside it, so that whoever replies can see what
            you were asking about.
          </p>
          <p>
            This is used to answer you. It is not sold, and it is not shared with anyone outside{" "}
            {site.name}.
          </p>

          <h3>When you search or ask a question</h3>
          <p>
            Search queries and questions put to Ask Humuson are recorded, together with whether
            anything was found. This is how the team learns which products and questions people are
            looking for and where the answers are missing. These records are not linked to your name
            or to an account — but they do contain whatever you typed, so please do not type
            anything personal into them.
          </p>

          <h3>As you use the site</h3>
          <p>
            Counters are recorded for things like which products and articles are viewed, which
            videos are played, and when someone taps a WhatsApp link. These are counts of events,
            not a profile of you: no advertising or cross-site tracking identifiers are set by this
            site.
          </p>

          <h3>Cookies</h3>
          <p>
            The public pages of this site set no cookies. A session cookie is set only when a member
            of staff signs in to the administration area.
          </p>

          <h3>Embedded content</h3>
          <p>
            Videos are embedded from YouTube (in its no-cookie mode) and the location map from
            Google Maps, and both load only after you choose to open them. Once you do, those
            services receive your request and apply their own privacy terms, which {site.name} does
            not control.
          </p>

          <h2>How long it is kept</h2>
          <ul>
            <li>
              Enquiries that have been dealt with: {months(policy.closedEnquiries)}. Open enquiries
              are kept until they are resolved.
            </li>
            <li>Search queries and questions: {months(policy.searchEvents)}.</li>
            <li>Usage counters: {months(policy.analyticsEvents)}.</li>
            <li>
              Administrative records of who changed what on this site: {months(policy.auditEvents)}.
            </li>
          </ul>

          <h2>Asking for a copy, a correction, or deletion</h2>
          <p>
            Write to{" "}
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`} className="text-leaf-700 hover:underline">
                {contactEmail}
              </a>
            ) : (
              <Link href="/contact" className="text-leaf-700 hover:underline">
                the address on our contact page
              </Link>
            )}{" "}
            and say what you would like. If you are asking about an enquiry you sent, telling us
            roughly when you sent it helps us find it.
          </p>

          <h2>About this page</h2>
          <p>
            This page describes what this website does. It is a factual description rather than
            legal advice, and the retention periods above are the ones the site is configured with.
            For anything beyond the website — how {site.name} handles information given in person,
            by phone or through WhatsApp — please{" "}
            <Link href="/contact" className="text-leaf-700 hover:underline">
              get in touch
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
