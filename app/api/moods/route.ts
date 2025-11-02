import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {

  return NextResponse.json({ moods: [] });
}


export async function POST(request: NextRequest) {

  const body = await request.json();

  return NextResponse.json(
    { success: true, mood: body },
    { status: 201 }
  );
}
