import { NextRequest } from 'next/server';

export async function authMiddleware(request: NextRequest) {
  try {
    // For now, return null to allow anonymous tracking
    // This can be enhanced later with proper JWT verification
    return null;
  } catch (error) {
    return null;
  }
}