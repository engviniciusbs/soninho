import { expect } from "vitest";
import { waitFor } from "@testing-library/react";

/**
 * Clone with React `useId` values renumbered in order of appearance: client ids
 * come from a global mount counter, so they shift with unrelated hook calls,
 * while the renumbered form still captures which elements reference each other.
 */
export function stable(node: Element): Element {
  const clone = node.cloneNode(true) as Element;
  const ids = new Map<string, string>();
  for (const el of [clone, ...clone.querySelectorAll("*")]) {
    for (const attr of [...el.attributes]) {
      const next = attr.value.replace(/_r_[0-9a-z]+_/g, (id) => {
        if (!ids.has(id)) ids.set(id, `id${ids.size + 1}`);
        return ids.get(id)!;
      });
      if (next !== attr.value) el.setAttribute(attr.name, next);
    }
  }
  return clone;
}

/** Waits out base-ui's transient enter/exit markers (cleared on the next frame). */
export async function settle() {
  await waitFor(() =>
    expect(document.querySelector("[data-starting-style],[data-ending-style]")).toBeNull()
  );
}
