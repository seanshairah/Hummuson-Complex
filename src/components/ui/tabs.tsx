"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        "scrollbar-none inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-paper-dim p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "shrink-0 rounded-full px-4 py-1.5 font-display text-sm font-medium whitespace-nowrap text-ink-faint transition-colors hover:text-ink data-[state=active]:bg-humus-900 data-[state=active]:text-paper",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsPrimitive.TabsContentProps) {
  return <TabsPrimitive.Content className={cn("mt-6 focus:outline-none", className)} {...props} />;
}
