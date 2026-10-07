"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { trackClient } from "@/lib/analytics-client";

/** WhatsApp deep-link button with click analytics. */
export function WhatsAppButton({
  message,
  label = "Ask on WhatsApp",
  entityType,
  entityId,
  variant = "accent",
  size = "md",
  className,
}: {
  message: string;
  label?: string;
  entityType?: string;
  entityId?: string;
  variant?: "accent" | "dark" | "outline" | "outline-light";
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <a
      href={whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackClient("WHATSAPP_CLICK", { entityType, entityId })}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-display font-medium tracking-tight transition-all active:scale-[0.98]",
        size === "md" ? "h-11 px-6 text-sm" : "h-12 px-7 text-base",
        variant === "accent" && "bg-leaf-400 text-humus-950 shadow-card hover:bg-leaf-300",
        variant === "dark" && "bg-humus-900 text-paper hover:bg-humus-700",
        variant === "outline" && "border border-ink/20 text-ink hover:border-ink/50 hover:bg-ink/5",
        variant === "outline-light" &&
          "border border-paper/30 text-paper hover:border-paper/70 hover:bg-paper/10",
        className,
      )}
    >
      <MessageCircle className={size === "md" ? "size-4.5" : "size-5"} strokeWidth={1.9} />
      {label}
    </a>
  );
}
