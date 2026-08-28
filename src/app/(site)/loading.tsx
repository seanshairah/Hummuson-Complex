import { Skeleton } from "@/components/ui/skeleton";

export default function SiteLoading() {
  return (
    <div className="container-site pt-32 pb-20" aria-busy>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-6 h-14 w-3/4 max-w-2xl" />
      <Skeleton className="mt-4 h-5 w-1/2 max-w-lg" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-line/70">
            <Skeleton className="aspect-[4/3.4] rounded-none" />
            <div className="space-y-2.5 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
