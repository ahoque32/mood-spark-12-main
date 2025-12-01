import { NextRequest, NextResponse } from "next/server";
import { supabase } from '@/lib/db/client';
import { handleDatabaseError } from '@/lib/db/errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    // Check if we have a user session for this device
    // First try to find an active user session
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .select('user_id, device_id')
      .eq('device_id', deviceId)
      .eq('is_active', true)
      .single();

    if (!sessionError && sessionData) {
      return NextResponse.json({ 
        userId: sessionData.user_id,
        deviceId: sessionData.device_id,
        isAnonymous: false 
      });
    }

    // If no active session, create anonymous tracking session
    const anonymousUserId = `anonymous_${deviceId}`;
    
    return NextResponse.json({ 
      userId: anonymousUserId,
      deviceId: deviceId,
      isAnonymous: true 
    });

  } catch (error: any) {
    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      { error: dbError.message },
      { status: dbError.statusCode }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { deviceId, userId, isAnonymous = false } = await request.json();
    
    if (!deviceId || !userId) {
      return NextResponse.json({ error: 'Device ID and User ID required' }, { status: 400 });
    }

    // Store or update device session
    if (!isAnonymous) {
      const { data, error } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: userId,
          device_id: deviceId,
          is_active: true,
          last_seen: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ 
        success: true, 
        session: data 
      });
    } else {
      // For anonymous sessions, just confirm the mapping
      return NextResponse.json({ 
        success: true, 
        userId: userId,
        isAnonymous: true 
      });
    }

  } catch (error: any) {
    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      { error: dbError.message },
      { status: dbError.statusCode }
    );
  }
}