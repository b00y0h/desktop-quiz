# Database Setup Guide for PLAN-5.3

## Current Status
PLAN-5.3 execution is **blocked** waiting for Vercel Postgres database credentials.

## What You Need To Do

### Step 1: Create Vercel Postgres Database

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Navigate to your project (the one hosting this quiz app)
3. Go to the "Storage" tab
4. Click "Create Database"
5. Select "Postgres" as the database type
6. Choose your preferred region (ideally same region as your app deployment)
7. Click "Create" and wait for provisioning to complete

### Step 2: Get Database Credentials

After the database is created:

1. Click on your new Postgres database in the Storage tab
2. Go to the ".env.local" tab or "Quickstart" section
3. You'll see environment variables including:
   - `POSTGRES_URL` (pooled connection string)
   - `POSTGRES_URL_NON_POOLING` (direct connection string)
4. Copy both values

### Step 3: Configure Local Environment

1. In your project root directory (where this file is), create a `.env.local` file:
   ```bash
   touch .env.local
   ```

2. Open `.env.local` and add the credentials you copied:
   ```bash
   # Vercel Postgres
   POSTGRES_URL="postgres://..."
   POSTGRES_URL_NON_POOLING="postgres://..."

   # Keep your existing Blob token if you have one
   BLOB_READ_WRITE_TOKEN="..."
   ```

3. Save the file

**Note:** `.env.local` is already in `.gitignore`, so your credentials won't be committed to git.

### Step 4: Verify Setup

After creating `.env.local`, verify the environment variables are set:

```bash
# Check if variables are loaded (restart your terminal if needed)
echo $POSTGRES_URL
```

If you see the connection string, you're ready to proceed!

### Step 5: Resume Execution

Once the credentials are configured, you can resume PLAN-5.3 execution:

```bash
# Run the plan again
# It will now be able to connect to the database and push the schema
```

## What Will Happen Next

When PLAN-5.3 runs with proper credentials, it will:

1. ✅ Verify database connection
2. ✅ Push the Drizzle schema to create 5 tables:
   - `quizzes` - Main quiz data
   - `questions` - Quiz questions
   - `participants` - Quiz participants
   - `answers` - Submitted answers
   - `submissions` - Submission metadata
3. ✅ Create the `quiz_status` enum (draft, collecting, active, closed)
4. ✅ Verify tables were created correctly
5. ✅ Test basic CRUD operations

## Troubleshooting

### "Connection refused" or "Connection timeout"
- Verify the `POSTGRES_URL` is correct (no typos)
- Check your network/firewall isn't blocking Postgres connections
- Ensure the database is in "Active" state in Vercel dashboard

### "Authentication failed"
- Double-check you copied the full connection string including password
- Try regenerating credentials in Vercel dashboard

### "Cannot find module" errors
- Run `npm install` to ensure Drizzle dependencies are installed
- The previous plans (5.1 and 5.2) should have installed everything needed

## Already Have Environment Variables in Vercel?

If your app is already deployed to Vercel with the database connected:

1. You can pull the environment variables:
   ```bash
   vercel env pull .env.local
   ```

2. This will create `.env.local` with all your production environment variables

## Need Help?

If you encounter issues:
1. Check the Vercel Postgres logs in the dashboard
2. Verify your database is in "Active" state
3. Try testing the connection with a simple query (PLAN-5.3 task 5.3.1 does this)
