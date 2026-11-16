import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const BABY = "00000000-0000-4000-8000-0000000000b1";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
  }),
}));
vi.mock("@/lib/supabase/queries/family", () => ({ getUserRoleForBaby: async () => "owner" }));
vi.mock("@/lib/supabase/queries/sleep", () => ({
  getSleepActivityLog: async () => ({
    data: [
      {
        id: "s1",
        action: "started",
        created_at: "2026-11-16T10:00:00Z",
        actor_user_id: "u2",
        actor_name: "Bia",
        actor_relation: null,
        sleep_type: "NAP",
      },
    ],
    error: null,
  }),
}));
vi.mock("@/lib/supabase/feedingQueries", () => ({
  getFeedingActivityLog: async () => ({
    data: [
      {
        id: "f1",
        action: "logged",
        created_at: "2026-11-16T11:00:00Z",
        actor_user_id: "u1",
        actor_name: "Ana",
        actor_relation: null,
        feeding_type: "BOTTLE",
      },
    ],
    error: null,
  }),
}));

import { GET } from "./route";

describe("GET /api/family/activity", () => {
  it("returns who acted and the kind of each item", async () => {
    const res = await GET(new NextRequest(`http://localhost/api/family/activity?babyId=${BABY}`));
    const { data } = await res.json();
    expect(data).toEqual([
      expect.objectContaining({ id: "f1", kind: "feeding", actor_user_id: "u1" }),
      expect.objectContaining({ id: "s1", kind: "sleep", actor_user_id: "u2" }),
    ]);
  });
});
