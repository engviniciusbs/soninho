import { describe, expect, it } from "vitest";
import { inferNextSleepKind } from "@/lib/sleep/inferNextSleepKind";
import { makeSession } from "@/lib/sleep/__fixtures__/session";

const tz = "America/Sao_Paulo";

type Params = Parameters<typeof inferNextSleepKind>[0];

function base(overrides: Partial<Params> = {}): Params {
  return {
    lastSessionType: "NAP",
    lastSleepEndIso: "2026-05-24T12:00:00Z", // 09:00 local
    recentSessions: [],
    ageWeeks: 10,
    timezone: tz,
    windowStartHour: 10.25,
    windowEndHour: 10.5,
    now: new Date("2026-05-24T12:30:00Z"), // 09:30 local
    ...overrides,
  };
}

/** Completed night sleeps starting at 19:00 local on consecutive days. */
function nights(count: number) {
  return Array.from({ length: count }, (_, i) =>
    makeSession({
      type: "NIGHT_SLEEP",
      start_time: `2026-05-${String(20 + i).padStart(2, "0")}T22:00:00Z`,
      end_time: `2026-05-${String(21 + i).padStart(2, "0")}T09:00:00Z`,
    })
  );
}

describe("inferNextSleepKind", () => {
  it("morning nap after a short wake -> NAP", () => {
    expect(inferNextSleepKind(base())).toBe("NAP");
  });

  describe("after night sleep", () => {
    it("woke before 13:00 -> NAP", () => {
      expect(inferNextSleepKind(base({ lastSessionType: "NIGHT_SLEEP" }))).toBe("NAP");
    });

    it("late wake, evening, no naps today -> NIGHT_SLEEP", () => {
      expect(
        inferNextSleepKind(
          base({
            lastSessionType: "NIGHT_SLEEP",
            lastSleepEndIso: "2026-05-24T17:00:00Z", // 14:00 local
            now: new Date("2026-05-24T20:30:00Z"), // 17:30 local
          })
        )
      ).toBe("NIGHT_SLEEP");
    });

    // Before: asserted NAP at 17:30 because a nap had happened today. At 17:30
    // the next sleep is the night, whatever the nap count.
    it("late wake, evening, a nap already today -> NIGHT_SLEEP", () => {
      expect(
        inferNextSleepKind(
          base({
            lastSessionType: "NIGHT_SLEEP",
            lastSleepEndIso: "2026-05-24T17:00:00Z",
            now: new Date("2026-05-24T20:30:00Z"),
            recentSessions: [
              makeSession({
                type: "NAP",
                start_time: "2026-05-24T13:00:00Z",
                end_time: "2026-05-24T14:00:00Z",
              }),
            ],
          })
        )
      ).toBe("NIGHT_SLEEP");
    });

    it("late wake before 17:00 -> NAP", () => {
      expect(
        inferNextSleepKind(
          base({
            lastSessionType: "NIGHT_SLEEP",
            lastSleepEndIso: "2026-05-24T17:00:00Z",
            now: new Date("2026-05-24T18:00:00Z"), // 15:00 local
          })
        )
      ).toBe("NAP");
    });
  });

  it("last nap ended at/after the age cutoff (17:00 for 10 weeks) -> NIGHT_SLEEP", () => {
    expect(
      inferNextSleepKind(
        base({
          lastSleepEndIso: "2026-05-24T20:00:00Z", // 17:00 local
          now: new Date("2026-05-24T20:30:00Z"),
          windowStartHour: 18.25,
          windowEndHour: 18.5,
        })
      )
    ).toBe("NIGHT_SLEEP");
    // One minute earlier stays under the cutoff (and under every other rule).
    expect(
      inferNextSleepKind(
        base({
          lastSleepEndIso: "2026-05-24T19:59:00Z",
          now: new Date("2026-05-24T20:00:00Z"), // 17:00 local, nowHour>=16
          windowStartHour: 15,
          windowEndHour: 16,
        })
      )
    ).toBe("NAP");
  });

  it("enough naps today (age 10 weeks -> max 5) -> NIGHT_SLEEP", () => {
    const naps = [8, 9, 10, 11, 12].map((h) =>
      makeSession({
        type: "NAP",
        start_time: `2026-05-24T${String(h + 3).padStart(2, "0")}:00:00Z`,
        end_time: `2026-05-24T${String(h + 3).padStart(2, "0")}:30:00Z`,
      })
    );
    const params = base({
      lastSleepEndIso: "2026-05-24T17:30:00Z", // 14:30 local
      now: new Date("2026-05-24T18:00:00Z"), // 15:00 local
      windowStartHour: 15.75,
      windowEndHour: 16,
    });
    expect(inferNextSleepKind({ ...params, recentSessions: naps })).toBe("NIGHT_SLEEP");
    expect(inferNextSleepKind({ ...params, recentSessions: naps.slice(0, 4) })).toBe("NAP");
  });

  it("window ending at/after 18:00 and now >= 16:00 -> NIGHT_SLEEP", () => {
    expect(
      inferNextSleepKind(
        base({
          lastSleepEndIso: "2026-05-24T18:00:00Z", // 15:00 local
          now: new Date("2026-05-24T19:00:00Z"), // 16:00 local
          windowStartHour: 17.75,
          windowEndHour: 18,
        })
      )
    ).toBe("NIGHT_SLEEP");
  });

  describe("bedtime history (median night start)", () => {
    const params = base({
      lastSleepEndIso: "2026-05-24T19:15:00Z", // 16:15 local
      now: new Date("2026-05-24T22:30:00Z"), // 19:30 local
      windowStartHour: 17.5,
      windowEndHour: 17.75,
    });

    it("with 3 nights starting ~19:00 -> NIGHT_SLEEP", () => {
      expect(inferNextSleepKind({ ...params, recentSessions: nights(3) })).toBe("NIGHT_SLEEP");
    });

    it("with only 2 nights the history is ignored -> NAP", () => {
      expect(inferNextSleepKind({ ...params, recentSessions: nights(2) })).toBe("NAP");
    });

    it("ignores open night sessions when counting", () => {
      const open = nights(3).map((s, i) => (i === 0 ? { ...s, end_time: null } : s));
      expect(inferNextSleepKind({ ...params, recentSessions: open })).toBe("NAP");
    });
  });

  describe("night wakings", () => {
    it("night ended at 23:00 -> NIGHT_SLEEP", () => {
      expect(
        inferNextSleepKind(
          base({
            lastSessionType: "NIGHT_SLEEP",
            lastSleepEndIso: "2026-05-25T02:00:00Z", // 23:00 local
            now: new Date("2026-05-25T02:10:00Z"), // 23:10 local
            windowStartHour: 0.25,
            windowEndHour: 0.5,
          })
        )
      ).toBe("NIGHT_SLEEP");
    });

    it("night ended at 02:00 -> NIGHT_SLEEP", () => {
      expect(
        inferNextSleepKind(
          base({
            lastSessionType: "NIGHT_SLEEP",
            lastSleepEndIso: "2026-05-24T05:00:00Z", // 02:00 local
            now: new Date("2026-05-24T05:05:00Z"), // 02:05 local
            windowStartHour: 3.25,
            windowEndHour: 3.5,
          })
        )
      ).toBe("NIGHT_SLEEP");
    });

    // The parent forgot to log the resumed night: at 09:00, seven hours after
    // the 02:00 waking, it is morning — not still "the night".
    it("night ended at 02:00, now 09:00 (resumed night not logged) -> NAP", () => {
      expect(
        inferNextSleepKind(
          base({
            lastSessionType: "NIGHT_SLEEP",
            lastSleepEndIso: "2026-05-24T05:00:00Z", // 02:00 local
            now: new Date("2026-05-24T12:00:00Z"), // 09:00 local
            windowStartHour: 3.25,
            windowEndHour: 3.5,
          })
        )
      ).toBe("NAP");
    });

    it("night ended at 23:00, now 04:30 (still night hours) -> NIGHT_SLEEP", () => {
      expect(
        inferNextSleepKind(
          base({
            lastSessionType: "NIGHT_SLEEP",
            lastSleepEndIso: "2026-05-25T02:00:00Z", // 23:00 local
            now: new Date("2026-05-25T07:30:00Z"), // 04:30 local
            windowStartHour: 0.25,
            windowEndHour: 0.5,
          })
        )
      ).toBe("NIGHT_SLEEP");
    });

    it("night ended at 04:00, now 06:00 (within 6 h of the waking) -> NIGHT_SLEEP", () => {
      expect(
        inferNextSleepKind(
          base({
            lastSessionType: "NIGHT_SLEEP",
            lastSleepEndIso: "2026-05-24T07:00:00Z", // 04:00 local
            now: new Date("2026-05-24T09:00:00Z"), // 06:00 local
            windowStartHour: 5.25,
            windowEndHour: 5.5,
          })
        )
      ).toBe("NIGHT_SLEEP");
    });

    it("woke at 04:45, now 07:30 (the hold ends at 07:00) -> NAP", () => {
      expect(
        inferNextSleepKind(
          base({
            lastSessionType: "NIGHT_SLEEP",
            lastSleepEndIso: "2026-05-24T07:45:00Z", // 04:45 local
            now: new Date("2026-05-24T10:30:00Z"), // 07:30 local
            windowStartHour: 7.75,
            windowEndHour: 8,
          })
        )
      ).toBe("NAP");
    });

    it("woke at 04:45, now 06:30 (before 07:00) -> NIGHT_SLEEP", () => {
      expect(
        inferNextSleepKind(
          base({
            lastSessionType: "NIGHT_SLEEP",
            lastSleepEndIso: "2026-05-24T07:45:00Z", // 04:45 local
            now: new Date("2026-05-24T09:30:00Z"), // 06:30 local
            windowStartHour: 7.75,
            windowEndHour: 8,
          })
        )
      ).toBe("NIGHT_SLEEP");
    });

    it("night ended at 05:00 (morning) -> NAP", () => {
      expect(
        inferNextSleepKind(
          base({
            lastSessionType: "NIGHT_SLEEP",
            lastSleepEndIso: "2026-05-24T08:00:00Z", // 05:00 local
            now: new Date("2026-05-24T08:10:00Z"),
            windowStartHour: 6.25,
            windowEndHour: 6.5,
          })
        )
      ).toBe("NAP");
    });
  });

  it("nap ended 15:00, now 15:10, < 3 nights, window 18:00-19:00 -> NIGHT_SLEEP", () => {
    expect(
      inferNextSleepKind(
        base({
          ageWeeks: 10,
          lastSleepEndIso: "2026-05-24T18:00:00Z", // 15:00 local
          now: new Date("2026-05-24T18:10:00Z"), // 15:10 local
          recentSessions: nights(2),
          windowStartHour: 18,
          windowEndHour: 19,
        })
      )
    ).toBe("NIGHT_SLEEP");
  });
});
