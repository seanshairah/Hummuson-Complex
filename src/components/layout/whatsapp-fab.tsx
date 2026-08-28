"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { whatsappLink, whatsappAdviceMessage } from "@/lib/whatsapp";
import { trackClient } from "@/lib/analytics-client";

/**
 * Floating WhatsApp action. Hidden on product detail pages (they carry their
 * own sticky action bar) and in the finder flow.
 */
export function WhatsAppFab() {
  const pathname = usePathname();
  if (/^\/products\/[^/]+/.test(pathname) || pathname.startsWith("/product-finder")) return null;

  return (
    <a
      href={whatsappLink(whatsappAdviceMessage())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Humuson Complex on WhatsApp"
      onClick={() => trackClient("WHATSAPP_CLICK", { path: pathname, meta: { from: "fab" } })}
      className="fixed right-4 bottom-4 z-30 flex size-13 items-center justify-center rounded-full bg-leaf-400 text-humus-950 shadow-float transition-transform hover:scale-105 active:scale-95 md:right-6 md:bottom-6"
    >
      <MessageCircle className="size-6" strokeWidth={1.9} />
      <span
        className="absolute inset-0 -z-10 animate-pulse-soft rounded-full bg-leaf-400/50 blur-md"
        aria-hidden
      />
    </a>
  );
}
