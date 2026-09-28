import type { Metadata } from "next";
import { Store } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { Section } from "@/components/layout/section";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { StockistMap } from "@/components/stockists/stockist-map";
import { getDistributorTowns } from "@/server/data/distributors";
import { getContactSettings } from "@/server/data/settings";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Where to buy — Humuson stockists",
  description:
    "The agro-dealer outlets that carry Humuson Complex products across Zimbabwe — Harare, Bulawayo, Mutare, Gweru, Kwekwe and more — with addresses, phone numbers and directions.",
  alternates: { canonical: "/where-to-buy" },
};

export default async function WhereToBuyPage() {
  const [towns, contact] = await Promise.all([getDistributorTowns(), getContactSettings()]);
  const count = towns.reduce((total, town) => total + town.distributors.length, 0);

  return (
    <>
      <PageIntro
        eyebrow="Where to buy"
        title="Stockists near"
        titleAccent="your farm"
        lede={
          count > 0
            ? `Humuson product reaches farmers through ${count} agro-dealer outlets in ${
                towns.length
              } ${towns.length === 1 ? "town" : "towns"}. Ring ahead — what each branch holds varies.`
            : "Talk to us and we will point you at the nearest shop carrying Humuson product."
        }
        crumbs={[{ label: "Where to buy" }]}
      />

      <Section top="none" bottom="base">
        {count === 0 ? (
          <EmptyState
            icon={Store}
            title="The stockist list is being prepared"
            description="Ask a Humuson adviser where to buy in the meantime."
            action={<ButtonLink href="/contact">Ask us</ButtonLink>}
          />
        ) : (
          <StockistMap towns={towns} />
        )}
      </Section>

      <Section top="none" bottom="loose">
        <div className="bg-grain flex flex-col gap-5 rounded-3xl bg-humus-950 p-6 text-paper sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="min-w-0">
            <h2 className="text-display-3 text-paper">Not near any of these?</h2>
            <p className="mt-2 max-w-xl text-sm text-paper/70">
              Humuson supplies direct from {contact.address ?? "the Harare depot"} and delivers
              nationally. Tell us what you grow and we will sort out the nearest supply.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <ButtonLink href="/contact">Talk to us</ButtonLink>
            <ButtonLink href="/products" variant="outline-light">
              Browse products
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
