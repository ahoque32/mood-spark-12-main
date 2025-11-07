import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { UserService } from '@/lib/services/user-service';
import { handleDatabaseError } from '@/lib/db/errors';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? 
      authHeader.substring(7) : 
      request.cookies.get('accessToken')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = AuthService.verifyAccessToken(token);
    const user = await UserService.getUserById(payload.userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        settings: user.settings
      }
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