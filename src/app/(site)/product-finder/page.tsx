import type { Metadata } from "next";
import { FinderWizard } from "@/components/finder/wizard";
import { Em } from "@/components/ui/section-heading";
import { getFilterOptions } from "@/server/data/products";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Product finder — four questions to the right product",
  description:
    "Answer four quick questions about your crop, goal, growth stage and application method — get matched with the Humuson products listed for exactly that situation.",
  alternates: { canonical: "/product-finder" },
};

export default async function ProductFinderPage() {
  const options = await getFilterOptions();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-humus-950 bg-grain">
      <div aria-hidden className="glow-leaf absolute inset-0" />
      <div className="relative">
        <header className="container-site pt-28 pb-10 text-center md:pt-36">
          <p className="text-eyebrow text-leaf-400">Product finder</p>
          <h1 className="text-display-2 mx-auto mt-4 max-w-3xl text-paper">
            Find your <Em className="text-leaf-300">solution</Em>
          </h1>
        </header>
        <FinderWizard
          options={{
            crops: options.crops,
            benefits: options.benefits,
            stages: options.stages,
            methods: options.methods.map((method) => method.key),
          }}
        />
      </div>
    </div>
  );
}
