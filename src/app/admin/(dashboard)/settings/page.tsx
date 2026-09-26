import { AdminPageHeader } from "@/components/admin/page-header";
import { CompanySettingsForm, ContactSettingsForm } from "@/components/admin/settings-forms";
import { getCompanySettings, getContactSettings } from "@/server/data/settings";

export const metadata = { title: "Settings — admin" };

export default async function AdminSettingsPage() {
  const [contact, company] = await Promise.all([getContactSettings(), getCompanySettings()]);
  return (
    <>
      <AdminPageHeader
        title="Site settings"
        description="Contact details and company copy used across the public site."
      />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <ContactSettingsForm contact={contact} />
        <CompanySettingsForm company={company} />
      </div>
    </>
  );
}
