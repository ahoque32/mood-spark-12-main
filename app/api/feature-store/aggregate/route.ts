// app/api/feature-store/aggregate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { aggregateAllUsersForDay } from "src/lib/services/feature-store";

export async function POST(req: NextRequest) {
  try {
    const { day } = await req.json(); // YYYY-MM-DD
    if (!day) return NextResponse.json({ error: "Missing 'day'" }, { status: 400 });
    await aggregateAllUsersForDay(day);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}