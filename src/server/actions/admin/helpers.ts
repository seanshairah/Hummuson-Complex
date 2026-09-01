import { revalidatePath, revalidateTag } from "next/cache";
import type { z } from "zod";

export type { AdminActionState } from "@/lib/admin-state";

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** Invalidate the public caches touched by content edits. */
export function revalidateContent(...tags: string[]) {
  for (const tag of tags) revalidateTag(tag);
  revalidatePath("/", "layout");
}

/** Parses repeated text inputs (name="items") into a clean string array. */
export function formList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function formOptional(formData: FormData, key: string): string | null {
  const value = formString(formData, key);
  return value === "" ? null : value;
}

export function formNumber(formData: FormData, key: string): number | null {
  const value = formString(formData, key);
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formBool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}
