import { describe, expect, it } from "vitest";
import { isInQuietHours, selectAlerts, type AlertPref, type SelectAlertsInput } from "./selectAlerts";

// 2026-11-16 12:00 in America/Sao_Paulo (UTC-3).
const NOW = new Date("2026-11-16T15:00:00Z");
// 19 weeks old at NOW -> wake window max 135 min.
const BIRTH = "2026-07-01";
const MAX = 135;

const FAMILY = "fam-1";
const BABY = "baby-1";
const SESSION = "sess-1";

function pref(user_id: string, over: Partial<AlertPref> = {}): AlertPref {
  return {
    user_id,
    enabled: true,
    alert_before_minutes: 15,
    quiet_hours_start: "22:00:00",
    quiet_hours_end: "07:00:00",
    timezone: "America/Sao_Paulo",
    ...over,
  };
}

function endedMinutesAgo(min: number, now = NOW): string {
  return new Date(now.getTime() - min * 60_000).toISOString();
}

function input(over: Partial<SelectAlertsInput> = {}): SelectAlertsInput {
  return {
    now: NOW,
    prefs: [pref("owner-1")],
    members: [{ family_id: FAMILY, user_id: "owner-1", role: "owner" }],
    babies: [{ id: BABY, family_id: FAMILY, birth_date: BIRTH, name: "Bia" }],
    lastEnded: { [BABY]: { sessionId: SESSION, endTime: endedMinutesAgo(MAX - 10) } },
    activeBabyIds: new Set(),
    ...over,
  };
}

describe("selectAlerts", () => {
  it("selects_owner_and_caregiver_only", () => {
    const alerts = selectAlerts(
      input({
        prefs: [pref("owner-1"), pref("care-1"), pref("viewer-1")],
        members: [
          { family_id: FAMILY, user_id: "owner-1", role: "owner" },
          { family_id: FAMILY, user_id: "care-1", role: "caregiver" },
          { family_id: FAMILY, user_id: "viewer-1", role: "viewer" },
        ],
      })
    );
    expect(alerts.map((a) => a.userId).sort()).toEqual(["care-1", "owner-1"]);
  });

  it("ignores members without enabled preferences", () => {
    const alerts = selectAlerts(
      input({
        prefs: [pref("owner-1"), pref("care-1", { enabled: false })],
        members: [
          { family_id: FAMILY, user_id: "owner-1", role: "owner" },
          { family_id: FAMILY, user_id: "care-1", role: "caregiver" },
          { family_id: FAMILY, user_id: "care-2", role: "caregiver" },
        ],
      })
    );
    expect(alerts.map((a) => a.userId)).toEqual(["owner-1"]);
  });

  it("respects_quiet_hours_per_user_timezone", () => {
    const members = [
      { family_id: FAMILY, user_id: "sp", role: "owner" as const },
      { family_id: FAMILY, user_id: "tokyo", role: "caregiver" as const },
      { family_id: FAMILY, user_id: "la", role: "caregiver" as const },
      { family_id: FAMILY, user_id: "lunch", role: "caregiver" as const },
    ];
    const prefs = [
      pref("sp"),
      pref("tokyo", { timezone: "Asia/Tokyo" }),
      pref("la", { timezone: "America/Los_Angeles" }),
      pref("lunch", { quiet_hours_start: "11:30", quiet_hours_end: "13:00" }),
    ];

    // 12:00 SP, 00:00 Tokyo (inside 22-07 across midnight), 07:00 LA (end is exclusive).
    // Ended 10:00 SP = 05:00 LA: the next-sleep inference runs in each
    // recipient's timezone, and an end before 05:00 would be a night waking.
    const noon = selectAlerts(
      input({
        prefs,
        members,
        lastEnded: { [BABY]: { sessionId: SESSION, endTime: endedMinutesAgo(MAX - 15) } },
      })
    );
    expect(noon.map((a) => a.userId).sort()).toEqual(["la", "sp"]);

    // 22:30 SP (quiet, after start), 10:30 Tokyo, 17:30 LA.
    const late = new Date("2026-11-17T01:30:00Z");
    const night = selectAlerts(
      input({
        now: late,
        prefs,
        members,
        lastEnded: { [BABY]: { sessionId: SESSION, endTime: endedMinutesAgo(MAX - 10, late) } },
      })
    );
    // "lunch" is outside its quiet hours, but in SP the baby woke at 20:15:
    // the next sleep is the night, so no nap alert (spec #6). Before this
    // change it expected an alert for "lunch" too.
    expect(isInQuietHours(late, "America/Sao_Paulo", "11:30", "13:00")).toBe(false);
    expect(night.map((a) => a.userId).sort()).toEqual(["la", "tokyo"]);
  });

  it("uses default quiet hours and timezone when unset or invalid", () => {
    const late = new Date("2026-11-17T01:30:00Z"); // 22:30 SP
    const alerts = selectAlerts(
      input({
        now: late,
        prefs: [
          pref("owner-1", { timezone: null, quiet_hours_start: null, quiet_hours_end: null }),
          pref("care-1", { timezone: "Not/AZone" }),
        ],
        members: [
          { family_id: FAMILY, user_id: "owner-1", role: "owner" },
          { family_id: FAMILY, user_id: "care-1", role: "caregiver" },
        ],
        lastEnded: { [BABY]: { sessionId: SESSION, endTime: endedMinutesAgo(MAX - 10, late) } },
      })
    );
    expect(alerts).toEqual([]);
  });

  it("skips_babies_with_active_sleep", () => {
    expect(selectAlerts(input({ activeBabyIds: new Set([BABY]) }))).toEqual([]);
  });

  it("skips babies without a completed session", () => {
    expect(selectAlerts(input({ lastEnded: {} }))).toEqual([]);
  });

  it("nap_soon_window", () => {
    const at = (elapsed: number, over: Partial<AlertPref> = {}) =>
      selectAlerts(
        input({
          prefs: [pref("owner-1", over)],
          lastEnded: { [BABY]: { sessionId: SESSION, endTime: endedMinutesAgo(elapsed) } },
        })
      );

    expect(at(MAX - 16)).toEqual([]);
    const [soon] = at(MAX - 15);
    expect(soon).toEqual({
      userId: "owner-1",
      babyId: BABY,
      sessionId: SESSION,
      eventType: "NAP_SOON",
      dedupeKey: `${BABY}:${SESSION}:NAP_SOON:owner-1`,
      title: "Hora da soneca chegando",
      body: "Faltam ~15 min para a janela de sono. Prepare o ambiente!",
      tag: `nap-soon-${BABY}`,
    });
    expect(at(MAX - 1).map((a) => a.eventType)).toEqual(["NAP_SOON"]);

    // Default of 15 when unset; custom value widens the window.
    expect(at(MAX - 15, { alert_before_minutes: null }).map((a) => a.eventType)).toEqual([
      "NAP_SOON",
    ]);
    expect(at(MAX - 30, { alert_before_minutes: 30 }).map((a) => a.eventType)).toEqual([
      "NAP_SOON",
    ]);
  });

  it("overdue_after_max", () => {
    const [alert, ...rest] = selectAlerts(
      input({ lastEnded: { [BABY]: { sessionId: SESSION, endTime: endedMinutesAgo(MAX + 7) } } })
    );
    expect(rest).toEqual([]);
    expect(alert).toEqual({
      userId: "owner-1",
      babyId: BABY,
      sessionId: SESSION,
      eventType: "OVERDUE",
      dedupeKey: `${BABY}:${SESSION}:OVERDUE:owner-1`,
      title: "Passou da janela de sono",
      body: "Já passou 7 min da janela ideal. O bebê pode estar muito cansado.",
      tag: `overdue-${BABY}`,
    });

    const [atMax] = selectAlerts(
      input({ lastEnded: { [BABY]: { sessionId: SESSION, endTime: endedMinutesAgo(MAX) } } })
    );
    expect(atMax.eventType).toBe("OVERDUE");
  });

  it("dedupes_per_user", () => {
    const alerts = selectAlerts(
      input({
        prefs: [pref("owner-1"), pref("care-1"), pref("owner-1")],
        members: [
          { family_id: FAMILY, user_id: "owner-1", role: "owner" },
          { family_id: FAMILY, user_id: "care-1", role: "caregiver" },
          { family_id: FAMILY, user_id: "owner-1", role: "owner" },
        ],
      })
    );
    const keys = alerts.map((a) => a.dedupeKey).sort();
    expect(keys).toEqual([
      `${BABY}:${SESSION}:NAP_SOON:care-1`,
      `${BABY}:${SESSION}:NAP_SOON:owner-1`,
    ]);
  });

  it("only alerts members of the baby's family", () => {
    const alerts = selectAlerts(
      input({
        prefs: [pref("owner-1"), pref("other")],
        members: [
          { family_id: FAMILY, user_id: "owner-1", role: "owner" },
          { family_id: "fam-2", user_id: "other", role: "owner" },
        ],
      })
    );
    expect(alerts.map((a) => a.userId)).toEqual(["owner-1"]);
  });

  describe("next sleep is the night (9 months)", () => {
    // 39 weeks at 2026-11-16 -> wake window 180–240 min.
    const nineMonths = [{ id: BABY, family_id: FAMILY, birth_date: "2026-02-16", name: "Bia" }];
    const napEnded15h = {
      [BABY]: { sessionId: SESSION, endTime: "2026-11-16T18:00:00Z", type: "NAP" as const },
    };
    const at = (localNow: string, alert_before_minutes = 15) =>
      selectAlerts(
        input({
          now: new Date(`2026-11-16T${localNow}:00-03:00`),
          prefs: [pref("owner-1", { alert_before_minutes })],
          babies: nineMonths,
          lastEnded: napEnded15h,
        })
      );

    it("last sleep ended 15:00, now 18:10 -> no alert", () => {
      expect(at("18:10")).toEqual([]);
    });

    it("no NAP_SOON nor OVERDUE before the night", () => {
      expect(at("18:10", 60)).toEqual([]); // inside a 60-min heads-up
      expect(at("18:50")).toEqual([]); // inside the default 15-min heads-up
      expect(at("19:10")).toEqual([]); // past the window
    });

    it("a morning nap still alerts", () => {
      const alerts = selectAlerts(
        input({
          now: new Date("2026-11-16T12:50:00-03:00"),
          babies: nineMonths,
          lastEnded: {
            [BABY]: { sessionId: SESSION, endTime: "2026-11-16T09:00:00-03:00", type: "NAP" },
          },
        })
      );
      expect(alerts.map((a) => a.eventType)).toEqual(["NAP_SOON"]);
    });
  });
});
