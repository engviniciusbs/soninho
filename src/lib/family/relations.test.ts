import { describe, expect, it } from "vitest";
import { FAMILY_RELATIONS, PERMISSION_ROLE_LABELS } from "./relations";

describe("family labels", () => {
  it("a caregiver can log sleep and feeding (spec #21)", () => {
    expect(PERMISSION_ROLE_LABELS.caregiver).toBe("Pode registrar sono e alimentação");
  });

  it("'Irmã' keeps its accent", () => {
    expect(FAMILY_RELATIONS.find((r) => r.value === "irma")?.label).toBe("Irmã");
  });
});
