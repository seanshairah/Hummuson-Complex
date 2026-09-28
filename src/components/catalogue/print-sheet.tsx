import { PageView } from "@/components/flipbook/page-view";
import type { ResolvedPage } from "@/lib/flipbook/resolve";
import { FLIPBOOK_PAGE_CSS } from "@/lib/flipbook/tree";

/** One flipbook page per printed sheet, for printing from the browser. */
export function PrintSheet({ pages }: { pages: ResolvedPage[] }) {
  return (
    <div className="bg-white">
      <style>{`
        ${FLIPBOOK_PAGE_CSS}
        @page { size: 150mm 205mm; margin: 0; }
        @media print {
          .print-page { break-after: page; }
        }
      `}</style>
      {pages.map((page, i) => (
        <div
          key={`${page.id}-${i}`}
          className="print-page relative mx-auto overflow-hidden"
          style={{ width: "150mm", height: "205mm" }}
        >
          <PageView page={page} priority />
        </div>
      ))}
    </div>
  );
}
