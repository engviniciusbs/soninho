import { NextResponse, type NextRequest } from "next/server";
import { dispatchWeeklyEmails } from "@/lib/email/weekly";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await dispatchWeeklyEmails();
    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[weekly-email route] Error:", err);
    return NextResponse.json(
      { error: "Weekly email dispatch failed" },
      { status: 500 }
    );
  }
}
