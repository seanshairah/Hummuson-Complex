import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppFab } from "@/components/layout/whatsapp-fab";
import { RouteTransition } from "@/components/layout/route-transition";
import { SmoothScroll } from "@/components/layout/smooth-scroll";

/**
 * No `loading.tsx` at this level, on purpose. A route-level skeleton streams in
 * the instant a navigation starts and is then replaced wholesale by the page —
 * a flash of grey boxes and a hard cut, which is the "drastic" transition the
 * veil exists to remove. With the veil, the old page stays put under a tinted
 * fade until the new one is ready, and the swap happens out of sight.
 * Deeper routes that genuinely stream (search, the finder) keep their own
 * in-page pending states.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-leaf-400 px-4 py-2 font-medium text-humus-950 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsAppFab />
      {/* useSearchParams inside needs a boundary so static pages stay static. */}
      <Suspense fallback={null}>
        <RouteTransition />
      </Suspense>
      <SmoothScroll />
    </div>
  );
}
