# Deployment & Production Setup Guide

Complete step-by-step guide to deploy Creative Studio to production.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Vercel Deployment](#vercel-deployment)
3. [Supabase Configuration](#supabase-configuration)
4. [Environment Variables](#environment-variables)
5. [API Integration](#api-integration)
6. [Post-Deployment](#post-deployment)

---

## Pre-Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] All tests passing
- [ ] No console errors in development
- [ ] Environment variables documented
- [ ] Supabase database created
- [ ] API keys obtained from providers
- [ ] Custom domain ready (optional)

---

## Vercel Deployment

### Step 1: Connect GitHub to Vercel
1. Go to [Vercel.com](https://vercel.com)
2. Click "New Project"
3. Select "Import Git Repository"
4. Authorize GitHub and select your repo
5. Click "Import"

### Step 2: Configure Build Settings
Vercel automatically detects Next.js and configures:
- **Framework:** Next.js
- **Build Command:** `npm run build`
- **Install Command:** `npm install`
- **Output Directory:** `.next`

Accept defaults and click "Deploy".

### Step 3: Add Environment Variables
1. In Vercel, go to **Settings → Environment Variables**
2. Add each variable from your `.env.local`:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGc...
OPENAI_API_KEY = sk-...
\`\`\`

3. Click "Save"
4. Trigger a redeployment for changes to take effect

---

## Supabase Configuration

### Step 1: Create Supabase Project
1. Go to [Supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - Organization: (create or select)
   - Project name: `beauty-ad-generator`
   - Database password: (generate secure password)
   - Region: (select closest to users)
5. Click "Create new project" and wait for setup

### Step 2: Setup Authentication
1. Go to **Authentication → Providers**
2. Ensure "Email" is enabled
3. Go to **Authentication → URL Configuration**
4. Add production redirect URL:
   \`\`\`
   https://yourdomain.com/auth/callback
   \`\`\`
5. Configure email templates if desired

### Step 3: Create Database Tables
1. Go to **SQL Editor**
2. Copy the contents of `/scripts/001_create_tables.sql`
3. Run the SQL
4. Verify tables appear in **Table Editor**

### Step 4: Enable Row Level Security
1. Go to **Authentication → Policies**
2. For each table, create RLS policies:
   - `SELECT`: Users can view their own records
   - `INSERT`: Users can insert into their own records
   - `UPDATE`: Users can update their own records
   - `DELETE`: Users can delete their own records

Example policy:
\`\`\`sql
-- Enable RLS on generations table
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Users can select their own generations
CREATE POLICY "Users can select own generations"
  ON generations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own generations
CREATE POLICY "Users can insert own generations"
  ON generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
\`\`\`

### Step 5: Get API Keys
1. Go to **Settings → API**
2. Copy and save:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

---

## Environment Variables

### Required Variables

| Variable | Value | Where to get |
|----------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Supabase Dashboard → Settings → API |
| `OPENAI_API_KEY` | Your OpenAI API key | platform.openai.com/api-keys |

### Optional Variables

| Variable | Value | For |
|----------|-------|-----|
| `REPLICATE_API_TOKEN` | Replicate API key | Image generation |
| `FAL_KEY` | Fal AI API key | Alternative image gen |
| `STRIPE_SECRET_KEY` | Stripe secret key | Payments (future) |

### Development vs Production

**Development (.env.local):**
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
\`\`\`

**Production (Vercel Environment Variables):**
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# NO localhost, NO DEV URLs
\`\`\`

---

## API Integration

### Enable Gemini for Prompt Enhancement

1. **Get API Key:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create new API key
   - Copy key

2. **Add to Vercel:**
   - Vercel → Settings → Environment Variables
   - Name: `OPENAI_API_KEY`
   - Value: Your Gemini API key
   - Click Save

3. **Update API Route:**
   - Open `/app/api/enhance/route.ts`
   - Uncomment Gemini integration code
   - Deploy

### Enable Image Generation

Choose one provider:

#### Option A: Replicate
1. Sign up at [Replicate.com](https://replicate.com)
2. Get API token from settings
3. Add to Vercel: `REPLICATE_API_TOKEN`
4. Update `/app/api/generate/route.ts`

#### Option B: Fal AI
1. Sign up at [Fal.ai](https://www.fal.ai)
2. Get API key
3. Add to Vercel: `FAL_KEY`
4. Update `/app/api/generate/route.ts`

#### Option C: Stability AI
1. Sign up at [Stability.ai](https://stability.ai)
2. Get API key
3. Add to Vercel: `STABILITY_API_KEY`
4. Update `/app/api/generate/route.ts`

---

## Post-Deployment

### Verification

1. **Test Authentication:**
   - Visit production URL
   - Sign up with new email
   - Verify email received
   - Log in

2. **Test Studio:**
   - Create a prompt
   - Click "Enhance Prompt"
   - Verify enhancement API works
   - Click "Generate Image"
   - Verify image generation works

3. **Check Performance:**
   - Use Vercel Analytics
   - Monitor database queries
   - Track API response times

4. **Security Check:**
   - Verify environment variables aren't exposed
   - Test RLS policies
   - Check CORS headers
   - Verify HTTPS enforced

### Monitoring Setup

1. **Vercel Analytics:**
   - Enable in Vercel Settings
   - Monitor Web Vitals
   - Track deployment health

2. **Supabase Logs:**
   - Monitor in Supabase Dashboard
   - Check for RLS policy errors
   - Review authentication logs

3. **Error Tracking (Optional):**
   - Set up Sentry or similar
   - Monitor production errors
   - Get alerts for critical errors

### Database Backups

1. **Supabase Automatic Backups:**
   - Enabled by default
   - Retained for 7 days (Pro plan)
   - Access via Backups section

2. **Manual Backup:**
   \`\`\`bash
   # Export database
   pg_dump postgres://user:password@host/database > backup.sql
   \`\`\`

### Scaling Considerations

- **Database:** Supabase auto-scales (upgrade plan if needed)
- **File Storage:** Use Supabase Storage or Vercel Blob
- **Rate Limiting:** Add middleware for API protection
- **Caching:** Enable response caching for API endpoints

---

## Troubleshooting Deployments

### "Build Failed"
- Check logs in Vercel Deployments tab
- Verify all dependencies in package.json
- Ensure TypeScript has no errors: `npm run typecheck`

### "Environment Variable Not Found"
- Confirm variable added in Vercel Settings
- Redeploy after adding variables
- Prefix public vars with `NEXT_PUBLIC_`

### "Database Connection Error"
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check firewall rules in Supabase
- Confirm API key is valid
- Test connection locally first

### "Authentication Not Working"
- Verify redirect URLs in Supabase
- Confirm cookies are being set
- Check browser console for errors
- Test auth endpoints with curl

### "Images Not Generating"
- Verify API key is valid
- Check API rate limits
- Ensure prompt is valid
- Test API endpoint directly

---

## Custom Domain

### Setup Custom Domain (with Vercel)

1. **Add Domain:**
   - Vercel Settings → Domains
   - Enter your domain
   - Follow DNS configuration

2. **Configure DNS:**
   - Log into domain registrar
   - Add CNAME record pointing to Vercel
   - Wait for DNS propagation (up to 48h)

3. **SSL Certificate:**
   - Automatic with Vercel
   - Issued by Let's Encrypt
   - Auto-renews

---

## Cost Estimation

| Service | Free Tier | Production Tier |
|---------|-----------|-----------------|
| Vercel | 100GB bandwidth | Pro: $20/mo |
| Supabase | 500MB database | Pro: $25/mo |
| Gemini API | 60 requests/min | Pay-as-you-go |
| Image Gen | Varies | Varies |
| **Total** | Free | ~$50-100/mo + API costs |

---

## Rollback Procedure

If issues occur in production:

1. **Vercel Rollback:**
   - Go to Deployments
   - Find previous working deployment
   - Click "Redeploy"

2. **Database Rollback:**
   - Use Supabase backups
   - Contact support for restore

3. **Communication:**
   - Update status page
   - Notify users if necessary

---

## Next Steps

- Monitor analytics and user feedback
- Gather usage data for optimization
- Plan feature iterations
- Consider scaling infrastructure
- Maintain security best practices

---

**Deployment successful! 🚀**

For issues, refer to:
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
