# Query - Deployment Guide

Step-by-step instructions for deploying Query to Vercel.

## Prerequisites

- A [Vercel](https://vercel.com) account
- A GitHub repository with the Query codebase pushed
- A Supabase project with the schema applied (see `supabase-schema.sql`)
- A Google Gemini API key for AI clustering

## 1. Connect GitHub Repository

1. Log in to [vercel.com](https://vercel.com) and click **Add New Project**
2. Select **Import Git Repository** and choose your Query repo
3. Vercel will auto-detect it as a **Next.js** project — no build settings changes needed
4. Click **Deploy** (it will fail initially until env vars are set)

## 2. Environment Variables

Navigate to **Project Settings > Environment Variables** and add the following:

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGciOi...` |
| `GEMINI_API_KEY` | Google Gemini API key for AI clustering | `AIzaSy...` |

### Using Vercel Secrets (recommended for production)

Instead of plain-text env vars, use Vercel encrypted secrets:

```bash
vercel secrets add supabase-url "https://your-project.supabase.co"
vercel secrets add supabase-anon-key "your-anon-key"
vercel secrets add gemini-api-key "your-gemini-key"
```

The `vercel.json` file references these secrets with the `@` prefix (e.g., `@supabase-url`).

## 3. Build Settings

Vercel auto-detects Next.js projects. The default settings work out of the box:

- **Framework Preset:** Next.js
- **Build Command:** `next build` (automatic)
- **Output Directory:** `.next` (automatic)
- **Install Command:** `npm install` (automatic)

No changes needed.

## 4. Region Configuration

The `vercel.json` is configured to deploy to `iad1` (US East - Washington, D.C.). To change the region:

1. Edit `vercel.json` and update the `regions` array
2. Choose a region close to your Supabase instance for lowest latency
3. Available regions: `iad1` (US East), `sfo1` (US West), `lhr1` (London), `hnd1` (Tokyo), etc.

## 5. Custom Domain Setup

1. Go to **Project Settings > Domains**
2. Enter your custom domain (e.g., `query.yourdomain.com`)
3. Vercel will provide DNS records to configure:
   - For apex domains (`yourdomain.com`): Add an `A` record pointing to `76.76.21.21`
   - For subdomains (`query.yourdomain.com`): Add a `CNAME` record pointing to `cname.vercel-dns.com`
4. Vercel automatically provisions an SSL certificate via Let's Encrypt

## 6. Redeployment

After the initial setup, every push to `main` triggers an automatic deployment. Vercel also creates **Preview Deployments** for pull requests.

To manually trigger a redeploy:

```bash
vercel --prod
```

## Troubleshooting

- **Build fails:** Check that all environment variables are set correctly
- **Supabase connection errors:** Ensure `NEXT_PUBLIC_SUPABASE_URL` includes the `https://` prefix
- **AI clustering not working:** Verify `GEMINI_API_KEY` is valid and has the Gemini API enabled
- **Slow responses:** Ensure the Vercel region matches your Supabase region for low latency
