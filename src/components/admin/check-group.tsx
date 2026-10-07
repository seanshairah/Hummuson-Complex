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

/**
 * The crop picker, arranged as the taxonomy rather than one long flat run.
 *
 * Both levels are real, selectable crops: a product whose own text says
 * "brassicas" is tagged with the group, and one that names cabbage is tagged
 * with cabbage. Ticking the group does not tick its children — that is the
 * whole point of the hierarchy, since a product listed for cabbage is not
 * thereby suitable for broccoli.
 */
export function CropCheckTree({
  name,
  options,
  selected,
}: {
  name: string;
  options: { id: string; name: string; parentId: string | null }[];
  selected: string[];
}) {
  const children = new Map<string, { id: string; name: string }[]>();
  for (const option of options) {
    if (!option.parentId) continue;
    const list = children.get(option.parentId) ?? [];
    list.push(option);
    children.set(option.parentId, list);
  }
  // A crop whose parent is missing from `options` would otherwise vanish, so
  // anything not claimed as a child is rendered at the top level.
  const ids = new Set(options.map((o) => o.id));
  const roots = options.filter((o) => !o.parentId || !ids.has(o.parentId));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {roots.map((root) => (
        <fieldset
          key={root.id}
          className="rounded-xl border border-line bg-paper-dim/40 p-2.5"
        >
          <legend className="sr-only">{root.name}</legend>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm font-medium text-ink has-checked:text-leaf-800">
            <input
              type="checkbox"
              name={name}
              value={root.id}
              defaultChecked={selected.includes(root.id)}
              className="size-4 accent-leaf-600"
            />
            <span className="capitalize">{root.name}</span>
          </label>
          {(children.get(root.id) ?? []).length > 0 && (
            <div className="mt-1 ml-3 grid gap-0.5 border-l border-line pl-3">
              {(children.get(root.id) ?? []).map((child) => (
                <label
                  key={child.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm text-ink-soft has-checked:text-leaf-800"
                >
                  <input
                    type="checkbox"
                    name={name}
                    value={child.id}
                    defaultChecked={selected.includes(child.id)}
                    className="size-4 accent-leaf-600"
                  />
                  <span className="capitalize">{child.name}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}
    </div>
  );
}
