"use server";

import { headers } from "next/headers";
import { db } from "@/server/db";
import { enquirySchema } from "@/lib/validation/enquiry";
import { recordEvent } from "@/server/analytics";
import { clientIp, rateLimit } from "@/server/rate-limit";

export interface EnquiryFormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export async function submitEnquiry(
  _prev: EnquiryFormState,
  formData: FormData,
): Promise<EnquiryFormState> {
  // The honeypot below catches naive bots; this catches the ones that fill it
  // in correctly. A real person sends a handful of enquiries in an hour at
  // most, so the ceiling can be low enough to make flooding the inbox
  // pointless without ever getting in a customer's way.
  const verdict = await rateLimit(
    [{ name: "enquiry:ip", subject: clientIp(await headers()), limit: 8, windowSeconds: 3600 }],
    { failOpen: false },
  );
  if (!verdict.allowed) {
    return {
      status: "error",
      message:
        "We’ve already received several enquiries from you. Please give us a little time to reply, or call us directly.",
    };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors };
  }

  // Honeypot filled → pretend success, store nothing.
  if (parsed.data.company) return { status: "success", message: "Thank you — we’ll be in touch." };

  const product = parsed.data.productSlug
    ? await db.product.findUnique({ where: { slug: parsed.data.productSlug }, select: { id: true } })
    : null;

  await db.enquiry.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
      source: parsed.data.source,
      productId: product?.id ?? null,
    },
  });

  await recordEvent({ type: "ENQUIRY_SUBMITTED", entityType: "enquiry" });

  return {
    status: "success",
    message: "Thank you — your enquiry has been received. Our team will contact you shortly.",
  };
}
