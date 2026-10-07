import { z } from "zod";

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Please add a short message").max(4000),
  productSlug: z.string().trim().max(200).optional(),
  source: z
    .enum([
      "CONTACT_FORM",
      "PRODUCT_PAGE",
      "PRODUCT_FINDER",
      "ASK_HUMUSON",
      "CATALOGUE",
      "CROP_PAGE",
      "OTHER",
    ])
    .default("CONTACT_FORM"),
  /** Honeypot — must stay empty. */
  company: z.string().max(0).optional().or(z.literal("")),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
