import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  return NextResponse.json({
    summary: {},
    trends: [],
    patterns: []
  });
}
