"use client";

import { useState, useTransition } from "react";
import { FlaskConical, SendHorizontal } from "lucide-react";
import { previewAnswer } from "@/server/actions/admin/faqs";
import { Spinner } from "@/components/ui/skeleton";

/**
 * "Test a question": type what a farmer might ask and preview exactly what
 * the public Ask Humuson engine would answer right now.
 */
export function TestQuestion() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof previewAnswer>> | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    if (question.trim().length < 2) return;
    startTransition(async () => {
      setResult(await previewAnswer(question));
    });
  };

  return (
    <section className="bg-grain rounded-3xl bg-humus-950 p-6 text-paper">
      <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold">
        <FlaskConical className="size-5 text-leaf-400" /> Test a question
      </h2>
      <p className="mt-1 text-xs text-paper/60">
        Preview what Ask Humuson would answer — nothing is logged.
      </p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How do I use IN5?"
          aria-label="Test question"
          className="h-11 w-full rounded-full border border-paper/20 bg-paper/10 px-4 text-sm text-paper outline-none placeholder:text-paper/40 focus:border-leaf-400"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Test"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-leaf-400 text-humus-950 disabled:opacity-50"
        >
          {pending ? <Spinner className="size-4" /> : <SendHorizontal className="size-4" />}
        </button>
      </form>
      {result && (
        <div className="mt-4 rounded-2xl bg-paper p-4 text-ink">
          {result.matched && result.answerHtml ? (
            <>
              <p className="text-xs font-semibold text-leaf-700 uppercase">
                Would answer{result.sourceLabel ? ` — source: ${result.sourceLabel}` : ""}
              </p>
              <div
                className="rich-text mt-2 text-sm"
                dangerouslySetInnerHTML={{ __html: result.answerHtml }}
              />
            </>
          ) : (
            <p className="text-sm text-ink-soft">
              <strong className="text-danger">No confident match.</strong> The engine would show the
              honest fallback and route the farmer to an adviser. Add an FAQ (with aliases) to
              answer this in future.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
