import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '@/lib/services/user-service';
import { SessionService } from '@/lib/services/session-service';
import { AuthService } from '@/lib/auth';
import { cookies } from 'next/headers';
import { handlePrismaError } from '@/lib/db/errors';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    
    const user = await UserService.getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isValidPassword = await UserService.verifyPassword(user, password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

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
    });
  } catch (error) {
    const dbError = handlePrismaError(error);
    return NextResponse.json(
      { error: dbError.message },
      { status: dbError.statusCode }
    );
  }
}