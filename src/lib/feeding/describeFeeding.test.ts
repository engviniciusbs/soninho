import { describe, expect, it } from "vitest";
import type { FeedingTimelineItem } from "@/types";
import { describeFeeding } from "./describeFeeding";

const at = "2026-01-01T10:00:00.000Z";
const breast = (endTime: string | null) =>
  ({ id: "f", type: "BREAST", startTime: at, endTime, summary: "", raw: { side_left_sec: 600, side_right_sec: 480 } }) as unknown as FeedingTimelineItem;

describe("describeFeeding", () => {
  it("running_breastfeed_reads_em_andamento_not_0_min", () => {
    const d = describeFeeding(breast(null));
    expect(d.value).toBe("Em andamento");
    expect(d.running).toBe(true);
  });

  it("finished_breastfeed_has_duration_and_sides", () => {
    expect(describeFeeding(breast(at))).toEqual({ label: "Peito", detail: "esquerdo e direito", value: "18 min", running: false });
  });

  it("bottle_and_solids", () => {
    const bottle = { id: "b", type: "BOTTLE", startTime: at, endTime: at, raw: { volume_ml: 120 } } as unknown as FeedingTimelineItem;
    expect(describeFeeding(bottle)).toEqual({ label: "Mamadeira", detail: null, value: "120 ml", running: false });
    const solid = { id: "s", type: "SOLID", startTime: at, endTime: at, raw: { food_tags: ["Banana", "Maçã"] } } as unknown as FeedingTimelineItem;
    expect(describeFeeding(solid)).toEqual({ label: "Sólidos", detail: "Banana e Maçã", running: false });
  });
});
