# Nick Meyer UGC Portfolio

One-page UGC portfolio with a Supabase-powered dashboard for adding photo and video work. The site is ready to deploy on Vercel from GitHub.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example:

```bash
cp .env.example .env
```

3. Add your Supabase project URL and anon key to `.env`.

4. Run the local site:

```bash
npm run dev
```

## Supabase Setup

1. Open your Supabase project.
2. Go to SQL Editor.
3. Run the SQL in `supabase/schema.sql`.
4. Go to Authentication, then Users, and create the login user for the dashboard.
5. Make sure the `ugc-media` storage bucket exists and is public. The SQL creates it automatically.

The public site reads work from `portfolio_work` and package pricing from `portfolio_rates`. The dashboard uploads files to the `ugc-media` bucket, then creates the database row.

## Vercel Setup

1. Push this folder to GitHub.
2. Import the GitHub repo into Vercel.
3. Use Vercel's Vite defaults:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add these environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

## Host King DNS

Once the Vercel deployment works on the temporary `.vercel.app` URL, add your domain in Vercel. Vercel will show the DNS records to place in Host King, usually:

- An `A` record for the root domain.
- A `CNAME` record for `www`.

Use the exact values Vercel gives you for your project.
