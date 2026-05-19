import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const { visit_id } = await req.json();
  if (!visit_id) {
    return NextResponse.json({ error: "visit_id required" }, { status: 400 });
  }

  const db = createServerClient();

  const [scheduleRes, visitRes] = await Promise.all([
    db.from("rep_schedule").update({ status: "skipped" }).eq("id", visit_id),
    db.from("visits").update({ status: "skipped" }).eq("id", visit_id),
  ]);

  if (scheduleRes.error || visitRes.error) {
    return NextResponse.json(
      { error: scheduleRes.error?.message || visitRes.error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
