import { cn } from "@/lib/utils";
import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";

const inputBase =
  "w-full rounded-lg border border-line bg-cream px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint/70 transition-colors focus:border-leaf-600 focus:outline-none focus:ring-2 focus:ring-leaf-500/25 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputBase, className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea ref={ref} rows={rows} className={cn(inputBase, "resize-y", className)} {...props} />
  );
});

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function NativeSelect({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(inputBase, "appearance-none pr-8", className)} {...props}>
        {children}
      </select>
    );
  },
);

/**
 * Labelled form control. The control is wrapped inside the <label> (implicit
 * association), so no ids are needed and the component renders on either side
 * of the server/client boundary.
 */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-xs font-normal text-ink-faint">{hint}</span>}
      {error && (
        <span role="alert" className="block text-xs font-medium text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
