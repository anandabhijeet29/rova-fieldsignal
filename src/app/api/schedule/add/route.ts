import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const {
    hcp_id,
    visit_date,
    region = "northeast",
    rep_id = "demo-rep",
  } = await req.json();

  if (!hcp_id || !visit_date) {
    return NextResponse.json(
      { error: "hcp_id and visit_date required" },
      { status: 400 }
    );
  }

  const db = createServerClient();

  const { data: existing } = await db
    .from("rep_schedule")
    .select("visit_order")
    .eq("visit_date", visit_date)
    .eq("rep_id", rep_id)
    .order("visit_order", { ascending: false })
    .limit(1);

  const nextOrder =
    ((existing?.[0] as { visit_order: number } | undefined)?.visit_order ?? 0) + 1;

  const newId = crypto.randomUUID();

  await Promise.all([
    db.from("rep_schedule").insert({
      id: newId,
      rep_id,
      visit_date,
      visit_order: nextOrder,
      hcp_id,
      status: "upcoming",
      region,
    }),
    db.from("visits").insert({
      id: newId,
      hcp_id,
      visit_date,
      visit_order: nextOrder,
      status: "upcoming",
    }),
  ]);

  return NextResponse.json({ ok: true, new_id: newId });
}
