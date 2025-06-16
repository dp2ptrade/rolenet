# Supabase Setup - Remote Only Configuration

This project is configured to use **remote Supabase only** (Solution 7), which means:

## ✅ What's Configured

- **Project Linked**: Connected to Supabase project `yxdckfvesuytndwjbtca`
- **Environment Variables**: Configured in `.env` file
- **Supabase Client**: Set up in `lib/supabase.ts`
- **Edge Functions**: Deployed to remote Supabase with proper dependency management
  - `process-ping`: Handles ping requests between users
  - `send-notification`: Sends push notifications
- **Deno Configuration**: Each function has its own `deno.json` for isolated dependency management
- **Database Schema**: Defined in `lib/database-schema.sql`

## 🚀 Edge Functions Deployment

Edge Functions are deployed using the `--use-api` flag to avoid Docker dependency:

```bash
# Deploy all functions
supabase functions deploy --project-ref yxdckfvesuytndwjbtca --use-api

# Deploy specific function
supabase functions deploy send-notification --project-ref yxdckfvesuytndwjbtca --use-api
```

### Dependency Management

Each function has its own `deno.json` file for proper dependency isolation:

- **process-ping/deno.json**: Manages dependencies for ping processing
- **send-notification/deno.json**: Manages dependencies for notifications

This approach follows Supabase best practices for Edge Functions and ensures:
- Proper TypeScript support
- Isolated dependencies per function
- Better deployment reliability
- NPM package compatibility

## 📁 Removed Files/Folders

The following local development files have been removed as they're not needed for remote-only setup:

- `supabase/.temp/` - Local CLI cache and temporary files
- `supabase/.branches/` - Local branch tracking
- No `config.toml` - Local development configuration not needed

## 🔐 Environment Variables for Edge Functions

Supabase Edge Functions automatically have access to these environment variables: <mcreference link="https://supabase.com/docs/guides/functions/secrets" index="2">2</mcreference>

- `SUPABASE_URL`: Your Supabase project URL (automatically set)
- `SUPABASE_ANON_KEY`: Your anon key (automatically set)
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (automatically set)
- `SUPABASE_DB_URL`: Direct database connection URL (automatically set)

### Setting Additional Secrets

For additional environment variables, you can manage them via:

#### Using the Dashboard <mcreference link="https://supabase.com/docs/guides/functions/quickstart" index="1">1</mcreference>
1. Navigate to your project > Edge Functions > Secrets
2. Add new environment variables with key-value pairs
3. Click Save

#### Using the CLI <mcreference link="https://supabase.com/docs/guides/functions/secrets" index="2">2</mcreference>
```bash
# Set individual secrets
supabase secrets set MY_SECRET_KEY=my_secret_value

# Set multiple secrets from .env file
supabase secrets set --env-file ./supabase/.env

# List all secrets
supabase secrets list
```

**Important**: The `SUPABASE_SERVICE_ROLE_KEY` is automatically available in Edge Functions and should NEVER be used in browser environments as it bypasses Row Level Security. <mcreference link="https://supabase.com/docs/guides/functions/secrets" index="2">2</mcreference>

## 🗄️ Database Schema Setup

Since this project uses remote-only Supabase (no local Docker), you need to apply the database schema manually:

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/yxdckfvesuytndwjbtca)
2. Navigate to SQL Editor
3. Copy the contents of `lib/database-schema.sql`
4. Paste and execute the SQL in the editor

### Option 2: Using Supabase CLI (if you have local PostgreSQL)
```bash
# This requires Docker/local PostgreSQL setup
supabase db reset
```

### Required Tables for Edge Functions
The Edge Functions require these tables to exist:
- `users` - User profiles and push tokens
- `pings` - Ping requests between users
- `notifications` - Notification logs
- `activity_logs` - User activity tracking
- `user_stats` - User statistics

**Verify Setup**: After applying the schema, check that all tables exist in your Supabase dashboard under Database > Tables.

## 🔧 Development Workflow

1. **Code Changes**: Edit Edge Functions in `supabase/functions/`
2. **Deploy**: Use `supabase functions deploy --use-api`
3. **Test**: Use Supabase Dashboard or direct API calls
4. **Monitor**: Check logs in Supabase Dashboard

## 📋 Next Steps

1. **Deploy Database Schema**: Run the SQL in `lib/database-schema.sql` in Supabase Dashboard
2. **Configure Storage**: Set up storage buckets if needed
3. **Environment Variables**: Ensure all required env vars are set in production

## 🌐 Dashboard Access

- **Functions**: https://supabase.com/dashboard/project/yxdckfvesuytndwjbtca/functions
- **Database**: https://supabase.com/dashboard/project/yxdckfvesuytndwjbtca/editor
- **Storage**: https://supabase.com/dashboard/project/yxdckfvesuytndwjbtca/storage

## 🚫 What's NOT Needed

- Docker Desktop
- Local Supabase instance
- `supabase start` command
- Local database setup

This configuration provides a streamlined development experience focused on remote Supabase services.