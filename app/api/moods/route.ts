import { NextRequest, NextResponse } from "next/server";
import { AuthService } from '@/lib/auth';
import { MoodService } from '@/lib/services/mood-service';
import { moodEntrySchema, moodQuerySchema } from '@/lib/validators/mood-validator';
import { handleDatabaseError } from '@/lib/db/errors';

export async function GET(request: NextRequest) {
  try {
    const payload = await AuthService.authenticateRequest(request);
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    
    const validation = moodQuerySchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const moods = await MoodService.getMoodEntries(payload.userId, validation.data);
    
    return NextResponse.json({ moods });
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

export async function POST(request: NextRequest) {
  try {
    const payload = await AuthService.authenticateRequest(request);
    const body = await request.json();
    const validation = moodEntrySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid mood entry data', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const moodEntry = await MoodService.createMoodEntry(payload.userId, {
      mood: validation.data.mood,
      note: validation.data.note
    });
    
    return NextResponse.json({ mood: moodEntry }, { status: 201 });
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