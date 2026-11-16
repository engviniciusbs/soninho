import { NextResponse, type NextRequest } from "next/server";
import { dbErrorToResponse } from "@/lib/http/errors";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { isAllowedPushEndpoint } from "@/lib/notifications/pushEndpoint";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().optional(),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { endpoint, p256dh, auth, userAgent } = parsed.data;

  if (!isAllowedPushEndpoint(endpoint)) {
    return NextResponse.json(
      { error: "Endpoint de notificação inválido" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent ?? null,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return dbErrorToResponse(error);
  }

  // Create the default preference row only when missing: the page re-syncs the
  // subscription on every load and must not turn alerts back on.
  await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      enabled: true,
    },
    { onConflict: "user_id", ignoreDuplicates: true }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  await supabase
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("endpoint", parsed.data.endpoint)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
