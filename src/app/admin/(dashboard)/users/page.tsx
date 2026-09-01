import { LogOut, Pencil, Plus, ShieldCheck, ShieldOff, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ActionDialog } from "@/components/admin/action-dialog";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { revokeUserSessions, saveUser, toggleUserActive } from "@/server/actions/admin/misc";
import { resetUserMfa } from "@/server/actions/admin/security";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Users — admin" };

export default async function AdminUsersPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  if (!isAdmin) {
    return (
      <>
        <AdminPageHeader title="Users" />
        <EmptyState
          icon={Users}
          title="Admin role required"
          description="Only administrators can manage user accounts."
        />
      </>
    );
  }

  const fields = (user?: (typeof users)[number]) => (
    <>
      {user && <input type="hidden" name="id" value={user.id} />}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" required>
          <Input name="name" defaultValue={user?.name} required />
        </Field>
        <Field label="Role">
          <NativeSelect name="role" defaultValue={user?.role ?? "EDITOR"}>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Email" required>
        <Input name="email" type="email" defaultValue={user?.email} required />
      </Field>
      <Field
        label={user ? "New password" : "Password"}
        hint={user ? "Leave blank to keep the current password" : "At least 10 characters"}
        required={!user}
      >
        <Input name="password" type="password" autoComplete="new-password" />
      </Field>
    </>
  );

  return (
    <>
      <AdminPageHeader
        title="Users"
        description="Staff accounts for the admin area. Admins manage users; editors manage content."
        actions={
          <ActionDialog
            title="New user"
            action={saveUser}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> New user
              </Button>
            }
          >
            {fields()}
          </ActionDialog>
        }
      />
      <Table>
        <THead>
          <Tr>
            <Th>User</Th>
            <Th>Role</Th>
            <Th>Two-factor</Th>
            <Th>Last login</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </Tr>
        </THead>
        <TBody>
          {users.map((user) => (
            <Tr key={user.id}>
              <Td>
                <span className="font-medium text-ink">{user.name}</span>
                <span className="block text-xs text-ink-faint">{user.email}</span>
              </Td>
              <Td>{user.role.charAt(0) + user.role.slice(1).toLowerCase()}</Td>
              <Td>
                {user.totpConfirmedAt ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-leaf-700">
                    <ShieldCheck className="size-3.5" /> On
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
                    <ShieldOff className="size-3.5" /> Off
                  </span>
                )}
              </Td>
              <Td>{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}</Td>
              <Td>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 font-display text-xs font-medium",
                    user.active ? "bg-leaf-300/50 text-leaf-800" : "bg-danger/10 text-danger",
                  )}
                >
                  {user.active ? "Active" : "Deactivated"}
                </span>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <ActionDialog
                    title={`Edit ${user.name}`}
                    action={saveUser}
                    trigger={
                      <button
                        type="button"
                        aria-label="Edit"
                        className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    }
                  >
                    {fields(user)}
                  </ActionDialog>
                  {user.totpConfirmedAt && user.id !== session?.user.id && (
                    <form
                      action={async () => {
                        "use server";
                        await resetUserMfa(user.id);
                      }}
                    >
                      <button
                        type="submit"
                        title="Clear this account's second factor — for someone who has lost their phone. Recorded in the audit log."
                        className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                      >
                        <ShieldOff className="size-3.5" />
                        <span className="sr-only">Reset two-factor authentication</span>
                      </button>
                    </form>
                  )}
                  <form
                    action={async () => {
                      "use server";
                      await revokeUserSessions(user.id);
                    }}
                  >
                    <button
                      type="submit"
                      title="End every signed-in session for this account. They can sign back in; anyone holding a copy of their session cannot."
                      className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                    >
                      <LogOut className="size-3.5" />
                      <span className="sr-only">Sign out everywhere</span>
                    </button>
                  </form>
                  {user.id !== session?.user.id && (
                    <form
                      action={async () => {
                        "use server";
                        await toggleUserActive(user.id);
                      }}
                    >
                      <button
                        type="submit"
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          user.active
                            ? "border-line text-ink-soft hover:border-danger hover:text-danger"
                            : "border-leaf-600 text-leaf-700",
                        )}
                      >
                        {user.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </>
  );
}
