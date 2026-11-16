import { describe, expect, it } from "vitest";
import { createRecordingSupabase } from "@/test/recordingSupabase";
import { getFeedingTimeline } from "./feedingQueries";

describe("getFeedingTimeline", () => {
  it("names_breast_milk_bottles_like_the_screen", async () => {
    const sb = createRecordingSupabase();
    sb.respond((c) =>
      c.target === "bottle_feedings"
        ? {
            data: [{ id: "b-1", start_time: "2026-01-01T10:00:00.000Z", volume_ml: 90, milk_type: "BREAST_MILK" }],
            error: null,
          }
        : { data: [], error: null }
    );
    const { data } = await getFeedingTimeline(
      sb.client as never,
      "baby-1",
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-01-02T00:00:00.000Z")
    );
    expect(data[0].summary).toBe("90ml · leite materno");
  });
});
