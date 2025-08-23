# Supabase Setup Guide for MetricPal Authentication

## Task 2 Status: Code Complete ✅ - Database Setup Required

The authentication system is **fully implemented** and ready to use. You just need to set up a Supabase project and run the database migration.

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: `metricpal` (or any name you prefer)
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your location
6. Click "Create new project"
7. Wait for the project to be created (takes ~2 minutes)

## Step 2: Get Your Project Credentials

Once your project is ready:

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public** key
   - **service_role** key (click "Reveal" to see it)

## Step 3: Update Environment Variables

Update your `.env.local` file with your real credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here

# Development Environment
NODE_ENV=development

# API Configuration
API_BASE_URL=http://localhost:3000/api
```

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire contents of `supabase/migrations/001_create_workspaces.sql`
4. Click "Run" to execute the migration

The migration will create:
- `workspaces` table with RLS policies
- `workspace_members` table with RLS policies
- Database functions for workspace creation
- Proper indexes and triggers

## Step 5: Test the Authentication System

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Test the complete flow:
   - Click "Sign Up"
   - Create an account with email/password + workspace name
   - Check your email for confirmation (if email confirmation is enabled)
   - Sign in with your credentials
   - Verify you can access the dashboard
   - Test sign out functionality

## Step 6: Verify Database Setup

In your Supabase dashboard:

1. Go to **Table Editor**
2. You should see:
   - `workspaces` table
   - `workspace_members` table
3. After creating a user, you should see:
   - A new user in **Authentication** → **Users**
   - A new workspace in the `workspaces` table
   - A new membership record in `workspace_members` table

## Troubleshooting

### Common Issues:

1. **"Invalid URL" error in middleware**
   - Make sure your `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Ensure it starts with `https://` and ends with `.supabase.co`

2. **Authentication not working**
   - Verify your `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
   - Check that email confirmation is disabled in Supabase Auth settings (for testing)

3. **Database errors**
   - Ensure you ran the complete migration script
   - Check that RLS is enabled on both tables
   - Verify the database functions were created

4. **Workspace creation fails**
   - Check that your `SUPABASE_SERVICE_ROLE_KEY` is correct
   - Ensure the `create_workspace_for_user` function exists

### Enable Email Confirmation (Optional)

By default, the system is set up for immediate user confirmation. To enable email confirmation:

1. Go to **Authentication** → **Settings** in Supabase
2. Turn on "Enable email confirmations"
3. Configure your email templates if desired

## What's Already Implemented

✅ **Complete Authentication System**
- User registration with workspace creation
- Email/password sign in/out
- JWT token management
- Route protection middleware
- Workspace isolation with RLS

✅ **Database Schema**
- Workspaces table with auto-generated API keys
- Workspace members with role management
- Row Level Security policies
- Database functions and triggers

✅ **UI Components**
- Sign up form with workspace creation
- Sign in form
- Protected dashboard
- Proper error handling

✅ **API Routes**
- User registration endpoint
- Proper error handling and validation

## Next Steps

Once your Supabase project is set up and the authentication is working:

1. **Task 3**: Unified API service foundation
2. **Task 4**: Event collection endpoint
3. **Task 5**: Data source integrations

The authentication foundation is solid and ready to support all future MetricPal features!

## Security Notes

- All database tables use Row Level Security (RLS)
- Users can only access their own workspace data
- API keys are automatically generated and unique
- JWT tokens are handled securely by Supabase Auth
- Service role key is only used server-side for user creation