import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { getProductFormOptions } from "@/server/data/admin";

export const metadata = { title: "New product — admin" };

export default async function NewProductPage() {
  const options = await getProductFormOptions();
  return (
    <>
      <AdminPageHeader
        title="New product"
        description="Only enter verified, published information — the public site handles gaps honestly."
      />
      <ProductForm initial={{}} options={options} />
    </>
  );
}
