"use client";

/** Checkbox pill grid for relation multi-selects in admin forms. */
export function CheckGroup({
  name,
  options,
  selected,
  columns = "grid-cols-2 md:grid-cols-3",
}: {
  name: string;
  options: { id: string; name: string }[];
  selected: string[];
  columns?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${columns}`}>
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink-soft transition-colors has-checked:border-leaf-600 has-checked:bg-leaf-300/25 has-checked:text-ink"
        >
          <input
            type="checkbox"
            name={name}
            value={option.id}
            defaultChecked={selected.includes(option.id)}
            className="size-4 accent-leaf-600"
          />
          <span className="capitalize">{option.name}</span>
        </label>
      ))}
    </div>
  );
}
