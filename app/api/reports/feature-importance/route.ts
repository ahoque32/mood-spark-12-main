import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

export async function GET() {
  // get the latest model by created_at
  const { data: reg, error: e1 } = await supabase
    .from("model_registry").select("model_version, created_at").order("created_at", { ascending: false }).limit(1).single();
  if (e1 || !reg) return NextResponse.json({ items: [] });

  const { data: items, error: e2 } = await supabase
    .from("model_feature_importance")
    .select("feature, importance")
    .eq("model_version", reg.model_version)
    .order("importance", { ascending: false });
  if (e2) return NextResponse.json({ items: [] });

  return NextResponse.json({ modelVersion: reg.model_version, items });
}