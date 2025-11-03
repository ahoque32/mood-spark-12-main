import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { User } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
  private static readonly REFRESH_SECRET = process.env.REFRESH_SECRET || 'fallback-refresh-secret';
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  static generateTokenPair(user: User) {
    const payload: TokenPayload = {
      userId: user.id,
      tokenVersion: user.tokenVersion
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY
    });

    const refreshToken = jwt.sign(payload, this.REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY
    });

    return { accessToken, refreshToken };
  }

  static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  static verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.REFRESH_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static async authenticateRequest(request: NextRequest): Promise<TokenPayload> {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : request.cookies.get('accessToken')?.value;

    if (!token) {
      throw new Error('Authentication required');
    }

    return this.verifyAccessToken(token);
  }

  static extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

// Legacy functions for compatibility
export async function getCurrentUser() {
  throw new Error("Use AuthService.authenticateRequest instead");
}

export async function isAuthenticated() {
  throw new Error("Use AuthService.authenticateRequest instead");
}

export async function requireAuth() {
  throw new Error("Use AuthService.authenticateRequest instead");
}