import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWebPush, PUSH_ICON } from "@/lib/notifications/webpush";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webpush = getWebPush();
  if (!webpush) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: "No active subscriptions" }, { status: 404 });
  }

  const payload = JSON.stringify({
    title: "🧪 Teste — Soninho",
    body: "As notificações estão funcionando! Você receberá alertas sobre sonecas.",
    icon: PUSH_ICON,
    tag: "test-notification",
    url: "/settings",
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err) {
      console.error("[test push] Failed:", err);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
