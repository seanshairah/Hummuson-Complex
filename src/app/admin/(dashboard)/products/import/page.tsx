import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PriceImport } from "@/components/admin/price-import";

export const metadata = { title: "Import prices — admin" };

export default function ImportPricesPage() {
  return (
    <>
      <AdminPageHeader
        title="Import prices"
        description="Upload a supplier price sheet and review every line before it reaches the site. Prices and pack sizes only — names, descriptions and brands are edited by hand."
        actions={
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"
          >
            <ArrowLeft className="size-4" /> Back to products
          </Link>
        }
      />
      <PriceImport />
    </>
  );
}
