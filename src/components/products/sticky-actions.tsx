"use client";

import { MessageCircle } from "lucide-react";
import { AskHumusonLauncher } from "@/components/ask/launcher";
import { whatsappLink, whatsappProductMessage } from "@/lib/whatsapp";
import { trackClient } from "@/lib/analytics-client";

/** Mobile sticky action bar on product pages: Ask Humuson + WhatsApp. */
export function StickyProductActions({
  productSlug,
  productName,
  productId,
}: {
  productSlug: string;
  productName: string;
  productId: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/92 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      <div className="flex gap-2.5">
        <div className="flex-1">
          <AskHumusonLauncher
            tone="dark"
            variant="wide"
            productSlug={productSlug}
            productName={productName}
            label="Ask Humuson"
          />
        </div>
        <a
          href={whatsappLink(whatsappProductMessage(productName))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackClient("WHATSAPP_CLICK", { entityType: "product", entityId: productId })
          }
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-leaf-400 font-display text-sm font-medium text-humus-950"
        >
          <MessageCircle className="size-4.5" strokeWidth={1.9} /> WhatsApp
        </a>
      </div>
    </div>
  );
}
