import { cache } from "react";
import { db } from "@/server/db";
import { site } from "@/lib/site";

export interface ContactSettings {
  phones: string[];
  whatsapp: string;
  /** Share link of the WhatsApp Business catalogue (wa.me/c/…). */
  whatsappCatalogueUrl: string;
  emails: string[];
  address: string | null;
  hours: string | null;
  socials: Partial<
    Record<"facebook" | "instagram" | "youtube" | "linkedin" | "twitter" | "tiktok", string | null>
  >;
}

const contactDefaults: ContactSettings = {
  phones: ["+263 77 665 6433"],
  whatsapp: site.whatsappNumber,
  whatsappCatalogueUrl: site.whatsappCatalogueUrl,
  emails: ["info@humusoncomplex.com"],
  address: null,
  hours: null,
  socials: {},
};

/** Owner-editable contact block (seeded from the old site's real details). */
export const getContactSettings = cache(async (): Promise<ContactSettings> => {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: "contact" } });
    if (!row) return contactDefaults;
    return { ...contactDefaults, ...(row.value as Partial<ContactSettings>) };
  } catch {
    return contactDefaults;
  }
});

export interface CompanySettings {
  tagline: string;
  shortAbout: string;
  about: string;
  services: { title: string; description?: string }[];
  whyChooseUs: string[];
  workingProcess: { title: string; description?: string }[];
  values: { name: string; text: string }[];
  /**
   * Verified European supplier brands, from the content audit. The homepage
   * "Partner brands" figure is the length of this list — never a literal.
   */
  partnerBrands: { name: string; note?: string }[];
}

const companyDefaults: CompanySettings = {
  tagline: site.tagline,
  shortAbout: site.description,
  about: "",
  services: [],
  whyChooseUs: [],
  workingProcess: [],
  values: [],
  partnerBrands: [],
};

export const getCompanySettings = cache(async (): Promise<CompanySettings> => {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: "company" } });
    if (!row) return companyDefaults;
    return { ...companyDefaults, ...(row.value as Partial<CompanySettings>) };
  } catch {
    return companyDefaults;
  }
});

export async function updateSetting(key: string, value: unknown): Promise<void> {
  await db.siteSetting.upsert({
    where: { key },
    update: { value: value as object },
    create: { key, value: value as object },
  });
}
