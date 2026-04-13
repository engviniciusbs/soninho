import { NextResponse, type NextRequest } from "next/server";
import { dispatchNotifications } from "@/lib/notifications/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sentCount = await dispatchNotifications();
    return NextResponse.json({
      ok: true,
      sent: sentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[dispatch route] Error:", err);
    return NextResponse.json({ error: "Dispatch failed" }, { status: 500 });
  }
}
