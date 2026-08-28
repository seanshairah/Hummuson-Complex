"use client";

import { useRef, useState } from "react";
import {
  Sparkles,
  SendHorizontal,
  MessageCircle,
  Phone,
  ArrowLeft,
  ArrowRight,
  Leaf,
} from "lucide-react";
import Link from "next/link";
import { Dialog, DialogClose, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { whatsappLink, whatsappAdviceMessage } from "@/lib/whatsapp";

interface AskSource {
  label: string;
  href: string;
}

interface AskAnswer {
  id: string;
  question: string;
  matched: boolean;
  answerHtml?: string;
  sources?: AskSource[];
  related?: { title: string; href: string }[];
}

/**
 * Ask Humuson — retrieval-based product knowledge assistant. Answers come
 * only from the verified FAQ/product/application-guide database; anything
 * outside it returns an honest fallback with routes to a human agronomist.
 */
export function AskHumusonLauncher({
  tone = "dark",
  productSlug,
  productName,
  variant = "pill",
  label = "Ask Humuson",
}: {
  tone?: "light" | "dark";
  /** When set, questions are answered in the context of this product. */
  productSlug?: string;
  productName?: string;
  variant?: "pill" | "button" | "wide";
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-full font-display text-sm font-medium transition-all active:scale-[0.98]",
            variant === "wide" && "h-12 w-full",
            variant !== "wide" && "h-10 px-4",
            tone === "light"
              ? "bg-leaf-400 text-humus-950 hover:bg-leaf-300"
              : "bg-humus-900 text-paper hover:bg-humus-700",
          )}
        >
          <Sparkles className="size-4" strokeWidth={1.8} />
          {label}
        </button>
      </DialogTrigger>
      <AskSheet productSlug={productSlug} productName={productName} />
    </Dialog>
  );
}

const GENERAL_SUGGESTIONS = [
  "What does IN5 do?",
  "Which products help root development?",
  "What can I use on maize?",
  "What package sizes are available?",
];

export function AskSheet({
  productSlug,
  productName,
}: {
  productSlug?: string;
  productName?: string;
}) {
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<AskAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  // Bumped by "back" so an in-flight answer can't resurrect a cleared chat.
  const sessionRef = useRef(0);

  const inConversation = thread.length > 0 || loading;

  const backToStart = () => {
    sessionRef.current += 1;
    setThread([]);
    setQuestion("");
    setLoading(false);
  };

  const suggestions = productName
    ? [
        `How do I apply ${productName}?`,
        `What rate should I use for ${productName}?`,
        `Which crops suit ${productName}?`,
        `What does ${productName} do?`,
      ]
    : GENERAL_SUGGESTIONS;

  const ask = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    const session = sessionRef.current;
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, productSlug }),
      });
      if (!res.ok) throw new Error("ask failed");
      const data = (await res.json()) as Omit<AskAnswer, "id" | "question">;
      if (session !== sessionRef.current) return;
      setThread((t) => [...t, { ...data, id: crypto.randomUUID(), question: trimmed }]);
    } catch {
      if (session !== sessionRef.current) return;
      setThread((t) => [...t, { id: crypto.randomUUID(), question: trimmed, matched: false }]);
    } finally {
      if (session === sessionRef.current) {
        setLoading(false);
        requestAnimationFrame(() =>
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }),
        );
      }
    }
  };

  const backButtonClasses =
    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink";

  return (
    <SheetContent
      title="Ask Humuson"
      description={
        productName
          ? `Verified answers about ${productName}`
          : "Verified answers from our product knowledge base"
      }
      headerAction={
        inConversation ? (
          <button
            type="button"
            onClick={backToStart}
            aria-label="Back to suggested questions"
            title="Back"
            className={backButtonClasses}
          >
            <ArrowLeft className="size-4.5" strokeWidth={1.9} />
          </button>
        ) : (
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close Ask Humuson"
              title="Back"
              className={backButtonClasses}
            >
              <ArrowLeft className="size-4.5" strokeWidth={1.9} />
            </button>
          </DialogClose>
        )
      }
    >
      <div className="flex h-full flex-col">
        <div ref={listRef} className="flex-1 space-y-5 overflow-y-auto pb-4" aria-live="polite">
          {thread.length === 0 && (
            <div className="rounded-2xl bg-paper-dim p-4">
              <p className="flex items-center gap-2 font-display text-sm font-medium text-ink">
                <Leaf className="size-4 text-leaf-700" /> Hello! Ask about application, rates, crops
                or packages.
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
                Answers come from Humuson’s verified product knowledge base — no guesswork. For
                anything we can’t verify, we’ll connect you to an agronomy adviser.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="rounded-full border border-line bg-cream px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-leaf-600 hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {thread.map((entry) => (
            <div key={entry.id} className="space-y-2.5">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-humus-900 px-4 py-2.5 text-sm text-paper">
                {entry.question}
              </p>
              {entry.matched && entry.answerHtml ? (
                <div className="w-fit max-w-[95%] rounded-2xl rounded-bl-md border border-line bg-cream px-4 py-3">
                  <div
                    className="rich-text text-sm [&>*+*]:mt-2"
                    dangerouslySetInnerHTML={{ __html: entry.answerHtml }}
                  />
                  {entry.sources && entry.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-2.5">
                      {entry.sources.map((source) => (
                        <Link
                          key={source.href}
                          href={source.href}
                          className="inline-flex items-center gap-1 rounded-full bg-leaf-300/40 px-2.5 py-1 text-xs font-medium text-leaf-800 hover:bg-leaf-300/70"
                        >
                          {source.label} <ArrowRight className="size-3" />
                        </Link>
                      ))}
                    </div>
                  )}
                  {entry.related && entry.related.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-[0.65rem] font-medium tracking-wider text-ink-faint uppercase">
                        Also relevant
                      </p>
                      <ul className="mt-1 space-y-1">
                        {entry.related.map((r) => (
                          <li key={r.href}>
                            <Link
                              href={r.href}
                              className="text-xs font-medium text-leaf-700 hover:underline"
                            >
                              {r.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-fit max-w-[95%] rounded-2xl rounded-bl-md border border-line bg-cream px-4 py-3">
                  <p className="text-sm text-ink-soft">
                    I don’t currently have verified guidance for that question. Please contact a
                    Humuson agronomy adviser — they’ll be glad to help.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={whatsappLink(whatsappAdviceMessage(entry.question))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-leaf-400 px-3.5 text-xs font-medium text-humus-950"
                    >
                      <MessageCircle className="size-3.5" /> WhatsApp
                    </a>
                    <Link
                      href="/contact"
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-xs font-medium text-ink"
                    >
                      <Phone className="size-3.5" /> Request advice
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-ink-faint">
              <Spinner className="size-4 text-leaf-600" /> Checking the knowledge base…
            </div>
          )}
        </div>

        <form
          className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-cream pt-3 pb-1"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={productName ? `Ask about ${productName}…` : "Ask a product question…"}
            aria-label="Your question"
            className="h-11 w-full rounded-full border border-line bg-paper px-4 text-sm outline-none focus:border-leaf-600 focus:ring-2 focus:ring-leaf-500/25"
          />
          <button
            type="submit"
            disabled={loading || question.trim().length === 0}
            aria-label="Send question"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-humus-900 text-paper transition-colors hover:bg-humus-700 disabled:opacity-40"
          >
            <SendHorizontal className="size-4.5" strokeWidth={1.8} />
          </button>
        </form>
      </div>
    </SheetContent>
  );
}
