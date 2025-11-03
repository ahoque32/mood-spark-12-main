import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/lib/services/session-service';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken');
    
    if (refreshToken) {
      await SessionService.invalidateSession(refreshToken.value);
    }
    
    cookieStore.delete('accessToken');
    cookieStore.delete('refreshToken');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: true });
  }
}