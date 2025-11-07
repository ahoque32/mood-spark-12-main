# Vercel Deployment Setup Guide

## Environment Variables to Set in Vercel Dashboard

Go to your Vercel project → Settings → Environment Variables and add:

### 1. Supabase Configuration
```
SUPABASE_URL = https://uehnsuobbybwtutcngfq.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlaG5zdW9iYnlid3R1dGNuZ2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTc1NjIsImV4cCI6MjA3NzY5MzU2Mn0.P9aeQxAtBH_OrrdtLVOzdswLr_82BEAF_Dtv5h_xhaA
```

### 2. Authentication Secrets (CHANGE THESE!)
```
JWT_SECRET = [generate-a-secure-32-character-string]
REFRESH_SECRET = [generate-another-secure-32-character-string]
```

Generate secure secrets using:
```bash
openssl rand -base64 32
```

### 3. Node Environment
```
NODE_ENV = production
```

### 4. Optional: Service Role Key (for admin operations)
```
SUPABASE_SERVICE_ROLE_KEY = [your-service-role-key-from-supabase]
```

## Deployment Steps

### 1. Set up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the schema from `supabase/schema.sql`
4. Verify tables are created in Table Editor

### 2. Push to GitHub
```bash
git add .
git commit -m "Migrate from Prisma to Supabase client"
git push origin main
```

### 3. Deploy on Vercel

1. Import your GitHub repo
2. Add all environment variables above
3. Deploy

## Troubleshooting

### Error: 503 Service Unavailable
- Verify Supabase project is active (not paused)
- Check environment variables are set correctly
- Ensure Supabase tables exist (run schema.sql)

### Error: 401 Unauthorized  
- Verify JWT_SECRET and REFRESH_SECRET match between local and Vercel
- Check cookies are being set with secure: true in production
- Ensure SUPABASE_ANON_KEY is correct

### Error: Database operation failed
- Check Supabase logs for specific error
- Verify RLS policies are configured correctly
- Ensure service role key is set if needed

## Test Checklist

After deployment, test these endpoints:

1. **Health Check**: `https://your-app.vercel.app/api/auth/me`
   - Should return 401 if not logged in

2. **Registration**: POST to `/api/auth/register`
   ```json
   {
     "email": "test@example.com",
     "password": "TestPassword123",
     "name": "Test User"
   }
   ```

3. **Login**: POST to `/api/auth/login`
   ```json
   {
     "email": "test@example.com",
     "password": "TestPassword123"
   }
   ```

4. **Create Mood**: POST to `/api/moods`
   ```json
   {
     "mood": 4,
     "note": "Testing on Vercel"
   }
   ```

## Security Notes

- Never commit `.env` files with real credentials
- Use different JWT secrets for development and production
- Enable Supabase Row Level Security (RLS) for production
- Consider adding rate limiting for API routes
- Use Vercel's built-in DDoS protection

## Benefits of Direct Supabase Connection

- No connection pooling issues
- Simpler deployment (no Prisma migrations)
- Direct access to Supabase features (realtime, storage, etc.)
- Better performance with Supabase's built-in optimizations
- Reduced complexity and dependencies