"use client";

import { PageFace } from "@/components/catalogue/flipbook";
import type { CataloguePage } from "@/lib/catalogue-pages";

/** One catalogue page per printed sheet (consumed by the PDF exporter). */
export function PrintSheet({ pages }: { pages: CataloguePage[] }) {
  return (
    <div className="bg-white">
      <style>{`
        @page { size: 160mm 214mm; margin: 0; }
        @media print {
          .print-page { break-after: page; }
        }
      `}</style>
      {pages.map((page, i) => (
        <div
          key={i}
          className="print-page relative mx-auto overflow-hidden text-[13px]"
          style={{ width: "160mm", height: "214mm" }}
        >
          <PageFace page={page} pageNumber={i + 1} />
        </div>
      ))}
    </div>
  );
}
