# Lotz Landgoed Token Management System - Deployment Guide

This guide provides step-by-step instructions for deploying the Lotz Landgoed Token Management System using Supabase, GitHub, and Vercel.

## Prerequisites

- A Supabase account (https://supabase.com)
- A GitHub account (https://github.com)
- A Vercel account (https://vercel.com)
- Node.js 18+ installed locally

---

## Part 1: Supabase Setup

### 1.1 Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: `lotz-landgoed-tokens`
   - **Database Password**: Generate a strong password and **save it securely**
   - **Region**: Choose the closest region to South Africa (e.g., EU West)
4. Click **"Create new project"** and wait for it to initialize

### 1.2 Get Database Connection String

1. In your Supabase project, go to **Settings** > **Database**
2. Scroll to **Connection string** section
3. Select **URI** tab
4. Copy the connection string. It looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password

### 1.3 Configure Connection Pooling (Recommended)

For production, use connection pooling:

1. Go to **Settings** > **Database** > **Connection Pooling**
2. Enable **Session Mode**
3. Copy the pooler connection string:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

---

## Part 2: Local Development Setup

### 2.1 Clone and Install

```bash
# Clone your repository
git clone https://github.com/YOUR-USERNAME/lotz-landgoed-tokens.git
cd lotz-landgoed-tokens/nextjs_space

# Install dependencies
yarn install
```

### 2.2 Configure Environment Variables

Create a `.env` file in the `nextjs_space` directory:

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_SECRET="your-random-secret-string-here"
NEXTAUTH_URL="http://localhost:3000"

# AWS S3 (for file uploads - provided by deployment platform)
AWS_BUCKET_NAME="your-bucket-name"
AWS_FOLDER_PREFIX="lotz-landgoed/"
AWS_REGION="us-east-1"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 2.3 Initialize Database Schema

```bash
# Generate Prisma client
yarn prisma generate

# Push schema to database
yarn prisma db push

# Seed initial data
yarn prisma db seed
```

### 2.4 Run Locally

```bash
yarn dev
```

Open http://localhost:3000 and test with:
- **Admin**: phone `0000000000`
- **Test User**: phone `0712345678`

---

## Part 3: GitHub Repository Setup

### 3.1 Create Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `lotz-landgoed-tokens`
3. Set visibility (private recommended for production)
4. Don't initialize with README (we have existing code)

### 3.2 Push Code

```bash
# In your project root directory
git init
git add .
git commit -m "Initial commit - Lotz Landgoed Token System"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/lotz-landgoed-tokens.git
git push -u origin main
```

### 3.3 Add .gitignore

Ensure these are in your `.gitignore`:
```
node_modules/
.env
.env.local
.next/
.prisma/
```

---

## Part 4: Vercel Deployment

### 4.1 Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** > **"Project"**
3. Import your GitHub repository
4. Select the `lotz-landgoed-tokens` repo

### 4.2 Configure Build Settings

- **Framework Preset**: Next.js
- **Root Directory**: `nextjs_space`
- **Build Command**: `yarn build`
- **Output Directory**: `.next`

### 4.3 Set Environment Variables

In Vercel project settings, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Supabase connection string |
| `NEXTAUTH_SECRET` | Your generated secret |
| `NEXTAUTH_URL` | Your Vercel deployment URL (e.g., https://your-app.vercel.app) |
| `AWS_BUCKET_NAME` | Your S3 bucket name |
| `AWS_FOLDER_PREFIX` | `lotz-landgoed/` |
| `AWS_REGION` | Your AWS region |
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |

### 4.4 Deploy

1. Click **"Deploy"**
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

### 4.5 Post-Deployment

After the first deployment:

1. Update `NEXTAUTH_URL` to your actual Vercel URL
2. Redeploy if needed
3. Run database seed if not done:
   ```bash
   # Locally with production DATABASE_URL
   DATABASE_URL="your-prod-url" yarn prisma db seed
   ```

---

## Part 5: Custom Domain (Optional)

### 5.1 Add Domain in Vercel

1. Go to your project settings in Vercel
2. Navigate to **"Domains"**
3. Add your custom domain (e.g., `tokens.lotzlandgoed.co.za`)

### 5.2 Update DNS

Add these DNS records at your domain registrar:

| Type | Name | Value |
|------|------|-------|
| CNAME | tokens | cname.vercel-dns.com |

Or for apex domain:
| Type | Name | Value |
|------|------|-------|
| A | @ | 76.76.21.21 |

### 5.3 Update NEXTAUTH_URL

Update the `NEXTAUTH_URL` environment variable to your custom domain:
```
NEXTAUTH_URL=https://tokens.lotzlandgoed.co.za
```

---

## Part 6: Initial Admin Setup

### 6.1 First Login

1. Go to your deployed app URL
2. Login with the default admin credentials
3. **Immediately change the password**

### 6.2 Create Users

1. Navigate to **Admin Dashboard** > **Users**
2. Click **"Add User"**
3. Fill in:
   - Phone number
   - Name
   - Initial password
   - Meter number (if applicable)
4. Share credentials securely with the user

### 6.3 Upload Tokens

1. Navigate to **Admin Dashboard** > **Token Sheets**
2. Click **"Upload Tokens"**
3. Enter token values (CSV format)
4. Link to specific meter if needed

---

## Security Checklist

- [ ] Change default admin password immediately
- [ ] Use strong, unique passwords for all accounts
- [ ] Enable 2FA on Supabase, GitHub, and Vercel accounts
- [ ] Keep DATABASE_URL and other secrets secure
- [ ] Set up regular database backups in Supabase
- [ ] Review and restrict Row Level Security (RLS) policies if needed
- [ ] Monitor usage and set up alerts

---

## Troubleshooting

### Database Connection Issues

1. Check DATABASE_URL is correct
2. Verify password has no special characters that need encoding
3. Check Supabase project is not paused
4. Try the pooler connection string

### Build Failures

1. Check `yarn build` works locally
2. Verify all environment variables are set in Vercel
3. Check Prisma client is generated in build step

### Authentication Issues

1. Verify NEXTAUTH_URL matches your deployment URL
2. Check NEXTAUTH_SECRET is set
3. Clear browser cookies and try again

### File Upload Issues

1. Verify AWS credentials are correct
2. Check S3 bucket permissions and CORS settings
3. Ensure bucket policy allows public access for public files

---

## Support

For issues specific to:
- **Database**: Check [Supabase Documentation](https://supabase.com/docs)
- **Deployment**: Check [Vercel Documentation](https://vercel.com/docs)
- **Application**: Review logs in Vercel dashboard

---

## Maintenance

### Database Backups

Supabase provides automatic daily backups. For additional protection:
1. Go to Supabase Dashboard > Database > Backups
2. Enable Point-in-Time Recovery (PITR) for Pro plans

### Updates

1. Pull latest changes locally
2. Test thoroughly
3. Push to GitHub - Vercel will auto-deploy

### Monitoring

Set up monitoring in Vercel:
1. Go to project settings > Monitoring
2. Enable Web Analytics
3. Set up alert notifications
