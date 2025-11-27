import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") || 14);
  const since = new Date(Date.now() - days*86400000).toISOString().slice(0,10);

  const { data: reg } = await supabase
    .from("model_registry").select("model_version, created_at").order("created_at", { ascending: false }).limit(1).single();
  if (!reg) return NextResponse.json({ series: [] });

  const { data, error } = await supabase
    .from("model_predictions")
    .select("day, y_true, y_pred")
    .eq("model_version", reg.model_version)
    .gte("day", since)
    .order("day");
  if (error) return NextResponse.json({ series: [] });
  return NextResponse.json({ modelVersion: reg.model_version, series: data||[] });
}