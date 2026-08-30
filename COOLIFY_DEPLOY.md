# Deploy Tesla Platform on Coolify

## Step 1: Get Your API Keys

### Supabase (Database — Free)
1. Go to **https://supabase.com** → "Start your project" → Sign in with GitHub
2. Click **"New Project"** → Name: `tesla-db`, pick a strong password, choose closest region
3. Wait ~2 min for provisioning
4. Left sidebar → **Settings** → **Database**
5. Under **"Connection string"** choose **"URI"** format
6. Copy it — looks like:
   ```
   postgresql://postgres.abc123:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
7. Replace `[YOUR-PASSWORD]` with what you set in step 2
8. **Save this** — you'll need it

### Cloudinary (File Storage — Free)
1. Go to **https://cloudinary.com/users/register_free**
2. Sign up (email or Google)
3. Dashboard shows your **Cloud Name** at the top
4. Profile icon (top right) → **Dashboard Settings**
5. Scroll to **API Keys** → Copy **API Key** and **API Secret** (click Show)
6. Save all three values

### Resend (Email — Free, 3,000/month)
1. Go to **https://resend.com/signup**
2. Sign up
3. Go to **https://resend.com/api-keys** → **Create API Key** → name it `tesla`
4. Copy the key (starts with `re_`)

---

## Step 2: Push Code to GitHub

```bash
git init
git add .
git commit -m "Tesla platform ready for deploy"
git remote add origin https://github.com/YOUR_USERNAME/tesla-platform.git
git push -u origin main
```

---

## Step 3: Deploy on Coolify

### If you self-host Coolify:
1. Open your Coolify panel (usually `https://your-coolify-domain.com`)
2. Click **"Add New Resource"** → **"Public Repository"** (or Private if your repo is private)
3. Paste your GitHub repo URL
4. Coolify will detect it as a **Node.js** project

### If you use coolify.io hosted:
1. Go to **https://coolify.io** → Sign in
2. Click **"+ Add Resource"** → Connect GitHub
3. Select your `tesla-platform` repo

### Configure the Deploy:
1. **Build Command:**
   ```
   npm run build
   ```
2. **Start Command:**
   ```
   node server.js
   ```
3. **Port:** `3000`

### Add Environment Variables:
In Coolify, go to your service → **Environment** → Add these:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Supabase connection string |
| `JWT_SECRET` | Run `openssl rand -hex 32` in terminal to generate |
| `NEXT_PUBLIC_APP_URL` | Your Coolify domain (e.g., `https://tesla.yourcoolify.com`) |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `CLOUDINARY_FOLDER` | `tesla-kyc` |
| `RESEND_API_KEY` | From Resend (starts with `re_`) |
| `EMAIL_FROM` | `noreply@onboarding.resend.dev` |
| `NODE_ENV` | `production` |

### Deploy:
1. Click **"Save"** on environment variables
2. Click **"Deploy"**
3. Coolify will: install deps → generate Prisma → push schema to Supabase → build Next.js
4. Wait 2-3 minutes for the build

---

## Step 4: Seed the Database (One Time)

After the first deploy succeeds, you need to seed the admin/demo user:

**Option A:** Coolify Terminal
1. In Coolify → your service → **Terminal**
2. Run: `npx tsx prisma/seed.ts`

**Option B:** Locally with the production DB
1. Put your Supabase DATABASE_URL in your local `.env`
2. Run: `npx tsx prisma/seed.ts`

You should see:
```
Database seeded successfully!
Admin: admin@tesla.com / Admin@123
Demo:  demo@tesla.com / Demo@123
```

---

## Step 5: Done!

- Open your Coolify domain → Landing page loads
- `/login` → Use **Demo User** button
- `/login` → Use **Admin Panel** button
- Admin can manage users, deposits, withdrawals, KYC

### Custom Domain (Optional)
1. In Coolify → your service → **Domains**
2. Add your domain (e.g., `tesla.com`)
3. Point your domain's DNS A record to your Coolify server IP
4. Coolify auto-provisions SSL with Let's Encrypt
