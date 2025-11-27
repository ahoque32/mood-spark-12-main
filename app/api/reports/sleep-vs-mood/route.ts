import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") || 14);
  const since = new Date(Date.now() - days*86400000).toISOString().slice(0,10);
  const { data, error } = await supabase
    .from("daily_features")
    .select("day, hours_slept, mood_label")
    .gte("day", since)
    .order("day");
  if (error) return NextResponse.json({ points: [] });
  const points = (data||[]).filter(r=> r.hours_slept!=null && r.mood_label!=null);
  return NextResponse.json({ points });
}