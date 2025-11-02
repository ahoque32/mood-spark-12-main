import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {

  return NextResponse.json({
    analyzeTone: false,
    correlateSocial: false,
    shareWithTherapist: false
  });
}


export async function PUT(request: NextRequest) {

  const body = await request.json();

  return NextResponse.json({
    success: true,
    settings: body
  });
}
