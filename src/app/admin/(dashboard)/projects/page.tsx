import Link from "next/link";
import { Pencil, Plus, Trophy } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { StatusPill } from "@/components/admin/status-pill";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/server/db";
import { deleteProject } from "@/server/actions/admin/content";

export const metadata = { title: "Results — admin" };

export default async function AdminProjectsPage() {
  const projects = await db.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { crop: true, _count: { select: { images: true, products: true } } },
  });

  return (
    <>
      <AdminPageHeader
        title="Results & crop programs"
        description="Field results, programs and portfolio items shown under /projects."
        actions={
          <ButtonLink href="/admin/projects/new" size="sm">
            <Plus className="size-4" /> New result
          </ButtonLink>
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No results yet"
          action={<ButtonLink href="/admin/projects/new">Document the first result</ButtonLink>}
        />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Result</Th>
              <Th>Crop</Th>
              <Th>Media</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </THead>
          <TBody>
            {projects.map((project) => (
              <Tr key={project.id} className="hover:bg-paper-dim/50">
                <Td>
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="font-medium text-ink capitalize hover:text-brand"
                  >
                    {project.title}
                  </Link>
                  {project.location && (
                    <span className="block text-xs text-ink-faint">{project.location}</span>
                  )}
                </Td>
                <Td className="capitalize">{project.crop?.name ?? "—"}</Td>
                <Td>
                  {project._count.images} image{project._count.images === 1 ? "" : "s"} ·{" "}
                  {project._count.products} product{project._count.products === 1 ? "" : "s"}
                </Td>
                <Td>
                  <StatusPill status={project.status} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/projects/${project.id}`}
                      aria-label="Edit"
                      className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                    >
                      <Pencil className="size-3.5" />
                    </Link>
                    <ConfirmButton
                      title={`Delete “${project.title}”?`}
                      label=""
                      action={async () => {
                        "use server";
                        await deleteProject(project.id);
                      }}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
