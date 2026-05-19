import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const { visit_id, new_date, rep_id = "demo-rep" } = await req.json();
  if (!visit_id || !new_date) {
    return NextResponse.json(
      { error: "visit_id and new_date required" },
      { status: 400 }
    );
  }

  const db = createServerClient();

  const { data: original, error: fetchErr } = await db
    .from("rep_schedule")
    .select("*")
    .eq("id", visit_id)
    .single();

  if (fetchErr || !original) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  const { data: existing } = await db
    .from("rep_schedule")
    .select("visit_order")
    .eq("visit_date", new_date)
    .eq("rep_id", rep_id)
    .order("visit_order", { ascending: false })
    .limit(1);

  const nextOrder =
    ((existing?.[0] as { visit_order: number } | undefined)?.visit_order ?? 0) + 1;

  const newId = crypto.randomUUID();

  await Promise.all([
    db.from("rep_schedule").update({ status: "rescheduled" }).eq("id", visit_id),
    db.from("visits").update({ status: "rescheduled" }).eq("id", visit_id),
  ]);

  await Promise.all([
    db.from("rep_schedule").insert({
      id: newId,
      rep_id,
      visit_date: new_date,
      visit_order: nextOrder,
      hcp_id: original.hcp_id,
      status: "upcoming",
      region: original.region,
    }),
    db.from("visits").insert({
      id: newId,
      hcp_id: original.hcp_id,
      visit_date: new_date,
      visit_order: nextOrder,
      status: "upcoming",
    }),
  ]);

  return NextResponse.json({ ok: true, new_id: newId });
}
