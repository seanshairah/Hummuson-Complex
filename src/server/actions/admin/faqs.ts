"use server";

import { FaqCategory, PublishStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { sanitizeRichHtml } from "@/lib/sanitize";
import { answerQuestion } from "@/server/data/ask";
import type { AdminActionState } from "@/lib/admin-state";
import { formBool, formList, formOptional, formString, revalidateContent } from "./helpers";

export async function saveFaq(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireUser();
  const id = formOptional(formData, "id");
  const question = formString(formData, "question");
  const answerHtml = formOptional(formData, "answerHtml");
  if (question.length < 5) return { status: "error", fieldErrors: { question: "Question is required" } };
  if (!answerHtml) return { status: "error", fieldErrors: { answerHtml: "An answer is required" } };

  const data = {
    question,
    answerHtml: sanitizeRichHtml(answerHtml),
    category: (formString(formData, "category") || "GENERAL") as FaqCategory,
    status: formBool(formData, "published") ? PublishStatus.PUBLISHED : PublishStatus.DRAFT,
    aliases: formList(formData, "aliases"),
    keywords: formList(formData, "keywords"),
    productId: formOptional(formData, "productId"),
  };

  let faqId = id;
  if (id) {
    await db.faq.update({ where: { id }, data });
  } else {
    const created = await db.faq.create({ data });
    faqId = created.id;
  }

  await db.faqCrop.deleteMany({ where: { faqId: faqId! } });
  for (const cropId of formList(formData, "cropIds")) {
    await db.faqCrop.create({ data: { faqId: faqId!, cropId } });
  }

  revalidateContent("faqs");
  return { status: "success", message: "FAQ saved.", createdId: id ? undefined : (faqId ?? undefined) };
}

export async function deleteFaq(id: string): Promise<void> {
  await requireUser();
  await db.questionEvent.updateMany({ where: { faqId: id }, data: { faqId: null } });
  await db.faq.delete({ where: { id } });
  revalidateContent("faqs");
}

/**
 * "Test a question" — previews exactly what the public Ask Humuson engine
 * would return, without logging a QuestionEvent.
 */
export async function previewAnswer(question: string): Promise<{
  matched: boolean;
  answerHtml?: string;
  sourceLabel?: string;
}> {
  await requireUser();
  const trimmed = question.trim().slice(0, 300);
  if (trimmed.length < 2) return { matched: false };
  const result = await answerQuestion(trimmed, undefined);
  // answerQuestion logs an event; remove the freshest one for this preview.
  await db.questionEvent.deleteMany({
    where: { question: trimmed, createdAt: { gte: new Date(Date.now() - 5000) } },
  });
  return {
    matched: result.matched,
    answerHtml: result.answerHtml,
    sourceLabel: result.sources?.[0]?.label,
  };
}
