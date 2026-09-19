/** Shared shape for admin form server-action state (client-safe module). */
export interface AdminActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Set on successful create so forms can redirect to the edit screen. */
  createdId?: string;
}

export const idle: AdminActionState = { status: "idle" };
