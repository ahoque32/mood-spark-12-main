import { NextRequest, NextResponse } from "next/server";
import { AuthService } from '@/lib/auth';
import { MoodService } from '@/lib/services/mood-service';
import { handleDatabaseError } from '@/lib/db/errors';

export async function GET(request: NextRequest) {
  try {
    const payload = await AuthService.authenticateRequest(request);
    const todayEntry = await MoodService.getTodayEntry(payload.userId);
    
    return NextResponse.json({ 
      entry: todayEntry,
      hasEntry: !!todayEntry 
    });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      { error: dbError.message },
      { status: dbError.statusCode }
    );
  }
}