"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  value,
  trigger,
  children,
  className,
}: {
  value: string;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AccordionPrimitive.Item value={value} className={cn("group border-b border-line", className)}>
      <AccordionPrimitive.Header asChild>
        <h3>
          <AccordionPrimitive.Trigger className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-base font-medium text-ink transition-colors hover:text-leaf-700 md:text-lg">
            {trigger}
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line transition-all group-data-[state=open]:rotate-45 group-data-[state=open]:border-leaf-600 group-data-[state=open]:bg-leaf-400/20">
              <Plus className="size-4" aria-hidden />
            </span>
          </AccordionPrimitive.Trigger>
        </h3>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="pb-6 text-[0.95rem] leading-relaxed text-ink-soft">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}
