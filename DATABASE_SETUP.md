# Database Setup Guide

## Overview
Your application is already configured to use Vercel Postgres with the `@vercel/postgres` package. The database connection is handled automatically through environment variables.

## Required Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```env
# Vercel Postgres Database Connection
# Get these from your Vercel dashboard: Project Settings > Storage > Postgres
POSTGRES_URL="postgres://default:password@host:5432/verceldb"
POSTGRES_PRISMA_URL="postgres://default:password@host:5432/verceldb?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgres://default:password@host:5432/verceldb"

# The Blue Alliance API Key (for fetching team/match data)
TBA_AUTH_KEY="your_tba_api_key_here"

# Sudo password for admin operations (used in delete-row route)
SUDO_PASSWORD="your_sudo_password_here"
```

## How It Works

The `@vercel/postgres` package automatically reads from these environment variables when you use the `sql` template tag. No additional configuration is needed!

Example usage (already in your code):
```javascript
import { sql } from "@vercel/postgres";

// This automatically uses POSTGRES_URL from your environment
const data = await sql`SELECT * FROM phd2026;`;
```

## Getting Your Database Credentials

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** > **Storage** > **Postgres**
4. Click on your database
5. Go to the **.env.local** tab
6. Copy the connection strings

## Verifying the Connection

Your API routes are already set up to use the database:
- `/api/get-data` - Fetches all data
- `/api/get-team-data` - Fetches team-specific data
- `/api/add-match-data` - Inserts new match data
- `/api/delete-row` - Deletes rows
- `/api/get-alliance-data` - Fetches alliance data

## Local Development

1. Make sure your `.env.local` file is in the root directory
2. Restart your Next.js dev server: `npm run dev`
3. The database connection will work automatically

## Production (Vercel)

When deploying to Vercel:
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add all the required variables listed above
4. Redeploy your application

## Troubleshooting

If you're getting connection errors:
1. Verify your `.env.local` file exists and has the correct variables
2. Check that your Vercel Postgres database is running
3. Ensure the connection strings match exactly what's in your Vercel dashboard
4. Restart your dev server after changing environment variables

