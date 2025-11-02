import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware runs before every request
export function middleware(request: NextRequest) {
  // TODO: Add your middleware logic here
  // Examples:
  // - Authentication checks
  // - Rate limiting
  // - Request logging
  // - CORS headers
  // - Redirects based on conditions

  // Example: Add custom headers
  const response = NextResponse.next();
  response.headers.set("x-custom-header", "mood-tracker");

  return response;
}

// Configure which paths the middleware should run on
export const config = {
  // Run middleware on all API routes
  matcher: [
    "/api/:path*",
    // Add other paths as needed
    // "/dashboard/:path*",
  ],
};
