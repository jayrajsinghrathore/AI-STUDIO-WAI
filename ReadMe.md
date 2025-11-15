# Creative Studio — Beauty Ad Generator

## App Overview
A Next.js application for generating stunning AI-powered beauty product advertisements. Users can enhance prompts with AI and generate professional images instantly.

---

## 🔗 Live Demo  
[Creative Studio — Beauty Ad Generator](https://ai-studio-wai-jys5.vercel.app)  

---

## 🖼️ Screenshots / Demo  
![Home and Studio interface](/public/Screenshot%20from%202025-11-15%2022-26-45.png) 
![Login and Sign Up](/public/Screenshot%20from%202025-11-15%2022-26-58.png) 
![Gallery & Image Generation](/public/Screenshot%20from%202025-11-15%2022-52-58.png)  
*Add more GIF or screenshot if you like, e.g., prompt → image workflow.*

---

## 🎯 Features  
- Prompt enhancement: turn a raw user prompt into a refined one via AI.  
- Image generation: use the enhanced prompt to generate high-quality beauty ad visuals.  
- User authentication: Supabase Auth  
- Gallery view: browse, download, and manage generated images.  
- Responsive UI with modern design (desktop, tablet, mobile).  
- Deployment-ready: built with best practices for environment variables, API usage, and error handling.

---

## 🧰 Tech Stack  
- **Frontend / Framework:** Next.js (App Router) with TypeScript  
- **Styling & UI:** Tailwind CSS, Framer Motion (for animations)  
- **Authentication & Backend:** Supabase AUTH, PostgreSQL ( Supabase ) 
- **AI & External APIs:** Google AI Studio / Gemini (prompt enhancement(gemini 2.5 pro) + image generation (nano banana))  
- **Package Manager:** pnpm  
- **Hosting / Deployment:** Vercel  
- **Dev Tools:** ESLint, Prettier (optional), Husky (optional)  

---

---
## User Flow

\`\`\`
Home Page
    ↓
[Get Started] → Signup/Login
    ↓
Studio Page (Main App)
    ├─ Input Prompt
    ├─ Enhance → API Call → Enhanced Text
    ├─ Generate → API Call → Image Created
    ├─ View Generated Images
    ├─ Download Images
    └─ View Full Gallery [→ Gallery Page]
\`\`\`

---

## Features

- ✅ Signup/Login (demo validation)
- ✅ Prompt Enhancement (appends enhancement text)
- ✅ Image Generation (returns placeholder images)
- ✅ Download functionality (downloads placeholder)
- ✅ Gallery view with mock data
- ✅ All UI/UX flows working
- ✅ Gemini API integration 
- ✅ Real image generation 
- ✅ Database persistence 

---

## Running the App

### Local Development
\`\`\`bash
npm install
npm run dev
# Visit http://localhost:3000
\`\`\`

### Production Deployment
\`\`\`bash
# Set environment variables in Vercel
npm run build
npm start
\`\`\`

---

## File Structure

\`\`\`
app/
├── page.tsx              # Home page
├── layout.tsx            # Root layout
├── error.tsx             # Error boundary
├── loading.tsx           # Loading fallback
├── auth/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── signup-success/page.tsx
│   └── callback/route.ts
├── studio/page.tsx       # Main studio page
├── generations/page.tsx  # Gallery page
└── api/
    ├── enhance/route.ts  # Prompt enhancement API
    └── generate/route.ts # Image generation API

components/
├── header.tsx            # Navigation header
├── prompt-input.tsx      # Prompt input form
└── generations-client.tsx # Gallery client component

lib/
├── supabase/
│   ├── client.ts         # Browser client
│   ├── server.ts         # Server client
│   └── middleware.ts     # Auth middleware
└── utils.ts              # Utility functions
\`\`\`

---

This showcase represents the complete Creative Studio application structure and visual flow!

# Setup Guide - Creative Studio Beauty Ad Generator

Complete step-by-step guide to get the app running locally and deployed to production.

## Part 1: Local Development Setup

### Step 1: Clone the Repository

\`\`\`bash
git clone https://github.com/yourusername/creative-studio.git
cd creative-studio
npm install
\`\`\`

### Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details
4. Wait for project to initialize
5. Go to Settings → API
6. Copy:
   - Project URL
   - Anon Key
   - Service Role Key

### Step 3: Create Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API Key"
3. Create a new API key
4. Copy the key

### Step 4: Set Up Environment Variables

Create `.env.local`:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx
OPENAI_API_KEY=xxxx
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
\`\`\`

### Step 5: Initialize Database

\`\`\`bash
npm run setup:db
\`\`\`

This command:
1. Connects to your Supabase project
2. Creates the `generations` table
3. Sets up Row Level Security policies
4. Creates indexes for performance

### Step 6: Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Visit [http://localhost:3000](http://localhost:3000)

## Part 2: Production Deployment

### Step 1: Push to GitHub

\`\`\`bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/creative-studio.git
git push -u origin main
\`\`\`

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New" → "Project"
4. Select your repository
5. Click "Import"

### Step 3: Add Environment Variables

In Vercel project settings:

1. Go to Settings → Environment Variables
2. Add each variable:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
3. Set them for Production environment

### Step 4: Deploy

1. Click "Deploy"
2. Vercel builds and deploys automatically
3. Visit your production URL

## Part 3: Testing the App

### Create Account

1. Go to `/auth/signup`
2. Enter email and password
3. Check email for confirmation link
4. Click link to confirm
5. Go to `/auth/login` and sign in

### Test Prompt Enhancement

1. Go to `/studio`
2. Enter a prompt: "Pink lip gloss"
3. Click "Enhance Prompt"
4. See enhanced version

### Test Image Generation

1. Click "Generate Image"
2. Wait for image to generate
3. See image appear in gallery

### Check Gallery

1. Go to `/generations`
2. See all your generated images
3. Download or delete images

## Troubleshooting

### "Unauthorized" Error

- User not authenticated
- Check Supabase email is confirmed
- Clear browser cookies and try again

### "Failed to enhance prompt"

- Check OPENAI_API_KEY is valid
- Verify API key has necessary permissions
- Check network in browser DevTools

### Database connection error

- Verify Supabase credentials
- Ensure `supabase.ts` files are correct
- Test with: `psql $DATABASE_URL`

### Images not saving to database

- Check RLS policies are created
- Verify user is authenticated
- Check browser console for errors

## Next Steps

1. **Customize branding**: Update logo and colors
2. **Add more AI models**: Integrate DALL-E, Midjourney
3. **Implement payments**: Add Stripe for premium features
4. **Add analytics**: Track user behavior with Plausible
5. **Mobile app**: Build React Native version

## Security Checklist

- [ ] Environment variables set in Vercel
- [ ] RLS policies enabled in Supabase
- [ ] Email confirmation required
- [ ] API keys rotated regularly
- [ ] Database backups configured
- [ ] Error logging set up
- [ ] Rate limiting implemented
- [ ] CORS configured

## Performance Optimization

1. **Image optimization**: Use Next.js Image component
2. **Database queries**: Add indexes for frequently queried columns
3. **Caching**: Implement edge caching for generated images
4. **CDN**: Use Supabase Storage CDN for images
5. **API optimization**: Implement request batching

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vercel Deployment](https://vercel.com/docs)