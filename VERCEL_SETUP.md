# Vercel Deployment Setup Guide

## Environment Variables to Set in Vercel Dashboard

Go to your Vercel project → Settings → Environment Variables and add:

### 1. Database Connection (CRITICAL)
```
DATABASE_URL = postgresql://postgres:Gtechmood123@db.uehnsuobbybwtutcngfq.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL = postgresql://postgres:Gtechmood123@db.uehnsuobbybwtutcngfq.supabase.co:5432/postgres
```

**IMPORTANT**: 
- Use port `6543` (connection pooler) not `5432` for DATABASE_URL
- Add `?pgbouncer=true&connection_limit=1` to DATABASE_URL
- DIRECT_URL uses port `5432` for migrations

### 2. Supabase Keys
```
SUPABASE_URL = https://uehnsuobbybwtutcngfq.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlaG5zdW9iYnlid3R1dGNuZ2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTc1NjIsImV4cCI6MjA3NzY5MzU2Mn0.P9aeQxAtBH_OrrdtLVOzdswLr_82BEAF_Dtv5h_xhaA
```

### 3. Authentication Secrets (CHANGE THESE!)
```
JWT_SECRET = [generate-a-secure-32-character-string]
REFRESH_SECRET = [generate-another-secure-32-character-string]
```

Generate secure secrets using:
```bash
openssl rand -base64 32
```

### 4. Node Environment
```
NODE_ENV = production
```

## Deployment Steps

### 1. Update Local Files

The following files have been updated for Vercel deployment:
- `prisma/schema.prisma` - Added `directUrl` for connection pooling
- `.env.production` - Production environment template

### 2. Push to GitHub
```bash
git add .
git commit -m "Configure for Vercel deployment with connection pooling"
git push origin main
```

### 3. Generate Prisma Client
Add this build command in Vercel:
```
npx prisma generate && next build
```

Or update `package.json`:
```json
{
  "scripts": {
    "build": "prisma generate && next build"
  }
}
```

### 4. In Supabase Dashboard

1. Go to Settings → Database
2. Enable "Connection Pooling" 
3. Pool Mode: Transaction
4. Pool Size: 15 (default)

### 5. Deploy on Vercel

1. Import your GitHub repo
2. Add all environment variables above
3. Deploy

## Troubleshooting

### Error: 503 Service Unavailable
- Check DATABASE_URL uses port 6543 with pgbouncer=true
- Verify Supabase connection pooling is enabled
- Check password doesn't have special characters that need encoding

### Error: 401 Unauthorized  
- Verify JWT_SECRET and REFRESH_SECRET match between local and Vercel
- Check cookies are being set with secure: true in production
- Ensure SUPABASE_ANON_KEY is correct

### Error: P1001 Can't reach database
- Verify Supabase project is active (not paused)
- Check IP allowlist in Supabase (should allow 0.0.0.0/0 for Vercel)
- Confirm connection pooler port is 6543

### Database Migrations
Run migrations locally then push schema:
```bash
npx prisma migrate dev
npx prisma db push --skip-generate
```

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