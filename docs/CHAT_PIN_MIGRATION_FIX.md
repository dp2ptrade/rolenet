# Chat Pin Feature Migration Fix

## Problem
You're encountering the following error when trying to pin/unpin chats:

```
Toggle pin chat error: {code: 'PGRST204', details: null, hint: null, message: "Could not find the 'isPinned' column of 'chats' in the schema cache"}
```

This error occurs because the `is_pinned` column is missing from the `chats` table in your Supabase database.

## Solution

The database schema has been updated and a migration file has been created to fix this issue.

### Files Updated:

1. **`lib/database-schema.sql`** - Added `is_pinned BOOLEAN DEFAULT false` to the chats table
2. **`tmp/supabase_sql/add_is_pinned_column.sql`** - Updated to include migration for both messages and chats tables
3. **`tmp/supabase_sql/README.md`** - Updated documentation

### Apply the Migration

To fix this error, you need to apply the migration to your Supabase database:

#### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the following SQL code:

```sql
-- Add is_pinned column to messages table for pinning functionality
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add is_pinned column to chats table for pinning functionality
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Create index for better performance when querying pinned messages
CREATE INDEX IF NOT EXISTS idx_messages_is_pinned ON messages(is_pinned) WHERE is_pinned = true;

-- Create index for better performance when querying pinned chats
CREATE INDEX IF NOT EXISTS idx_chats_is_pinned ON chats(is_pinned) WHERE is_pinned = true;
```

6. Click **Run** to execute the migration
7. You should see a success message

#### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
cd /path/to/your/project
supabase db push
```

### Verification

After applying the migration:

1. Go to **Table Editor** in your Supabase Dashboard
2. Select the **chats** table
3. Confirm that the `is_pinned` column exists (BOOLEAN type)
4. Select the **messages** table
5. Confirm that the `is_pinned` column exists (BOOLEAN type)

### Test the Fix

1. Restart your development server:
   ```bash
   npm start
   # or
   expo start
   ```

2. Try pinning/unpinning a chat - the error should no longer occur

## What This Migration Does

- Adds an `is_pinned` boolean column to both `messages` and `chats` tables
- Sets the default value to `false` for all existing and new records
- Creates database indexes for better performance when querying pinned items
- Uses `IF NOT EXISTS` to prevent errors if the columns already exist

## Troubleshooting

If you still encounter issues after applying the migration:

1. **Clear your app cache**: Sometimes the schema cache needs to be refreshed
2. **Restart your development server**: This ensures the latest schema is loaded
3. **Check column names**: Ensure your code uses `is_pinned` (snake_case) in SQL queries and `isPinned` (camelCase) in TypeScript interfaces
4. **Verify migration**: Double-check that the migration was applied successfully in your Supabase dashboard

The error should be resolved once the migration is applied successfully to your Supabase database.