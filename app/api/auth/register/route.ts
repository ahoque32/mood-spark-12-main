import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '@/lib/services/user-service';
import { SessionService } from '@/lib/services/session-service';
import { AuthService } from '@/lib/auth';
import { handleDatabaseError } from '@/lib/db/errors';
import { cookies } from 'next/headers';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;
    
    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    const user = await UserService.createUser({ email, password, name });
    const { accessToken, refreshToken } = AuthService.generateTokenPair(user);
    
    await SessionService.createSession(user.id, refreshToken);
    
    const cookieStore = await cookies();
    cookieStore.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60
    });
    
    cookieStore.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      accessToken
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      { error: dbError.message, details: error instanceof Error ? error.message : 'Unknown error' },
      { status: dbError.statusCode }
    );
  }
}