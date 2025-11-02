# Backend Structure Guide

This document explains the backend structure and where to implement different types of backend code.

## Directory Structure

```
mood-spark-12-main/
├── app/
│   ├── api/                      # REST API endpoints
│   │   ├── moods/
│   │   │   ├── route.ts          # GET, POST /api/moods
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET, PUT, DELETE /api/moods/[id]
│   │   ├── insights/
│   │   │   └── route.ts          # GET /api/insights
│   │   └── settings/
│   │       └── route.ts          # GET, PUT /api/settings
│   │
│   └── actions/                  # Server Actions
│       ├── mood-actions.ts       # saveMood, updateMood, deleteMood
│       ├── insight-actions.ts    # generateInsights, getWeeklySummary
│       └── settings-actions.ts   # updateSettings, getSettings
│
├── src/lib/
│   ├── db.ts                     # Database connection
│   ├── auth.ts                   # Authentication utilities
│   ├── config.ts                 # App configuration
│   │
│   ├── services/                 # Business logic layer
│   │   ├── mood-service.ts       # Mood business logic
│   │   ├── insight-service.ts    # Analytics and insights logic
│   │   └── user-service.ts       # User management logic
│   │
│   ├── queries/                  # Database queries
│   │   ├── mood-queries.ts       # Mood database operations
│   │   └── user-queries.ts       # User database operations
│   │
│   └── validators/               # Input validation
│       ├── mood-validator.ts     # Mood data validation
│       └── settings-validator.ts # Settings validation
│
├── middleware.ts                 # Request/response middleware
└── .env.example                  # Environment variables template

```

## Implementation Guide

### 1. API Routes (app/api/)

Use for traditional REST API endpoints that need to be called from the frontend.

**When to use:**
- External API integrations


**Example:**
```typescript
// app/api/moods/route.ts
export async function GET(request: NextRequest) {
  const moods = await MoodService.getMoodsByUser(userId);
  return NextResponse.json(moods);
}
```

### 2. Server Actions (app/actions/)

Use for server-side mutations and data fetching from React components.

**When to use:**
- Form submissions
- Data mutations (create, update, delete)
- Progressive enhancement
- Direct component integration

**Example:**
```typescript
// app/actions/mood-actions.ts
"use server";
export async function saveMood(mood: string, note: string) {
  await MoodService.createMood(userId, mood, note);
  revalidatePath("/");
}
```

### 3. Services (src/lib/services/)

Business logic layer that handles complex operations and orchestrates queries.

**Implement:**
- Data validation and transformation
- Business rules


### 4. Queries (src/lib/queries/)

Direct database operations and data access.

**Implement:**
- CRUD operations
- Complex database queries
- Joins and aggregations
- Data retrieval

### 5. Validators (src/lib/validators/)

Input validation using Zod schemas.

**Implement:**
- Request body validation
- Query parameter validation
- Type-safe validation schemas

### 6. Middleware (middleware.ts)

Request/response processing before routes.

**Use for:**
- Authentication checks
- Rate limiting
- Request logging


## Next Steps

1. **Set up Database:**
   - Choose a database (PostgreSQL, MongoDB, etc.)
   - Update `src/lib/db.ts` with connection
   - Consider using Prisma or Drizzle ORM

2. **Implement Authentication:**
   - Choose auth provider (NextAuth, Clerk, Auth0)
   - Update `src/lib/auth.ts`
   - Add auth checks to middleware

3. **Implement Business Logic:**
   - Fill in service methods in `src/lib/services/`
   - Implement database queries in `src/lib/queries/`
   - Connect API routes to services

4. **Environment Variables:**
   - Copy `.env.example` to `.env.local`
   - Fill in your environment variables

## Database Options



## Authentication Options

- **NextAuth.js:** Most popular Next.js auth solution
- **Clerk:** Complete authentication platform
- **Auth0:** Enterprise-grade auth
- **Supabase Auth:** Built-in with Supabase

## Testing

Consider adding tests for:
- API routes: Integration tests
- Server actions: Unit tests
- Services: Unit tests
- Validators: Unit tests
