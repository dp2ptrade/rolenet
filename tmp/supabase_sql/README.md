# Message Reactions Migration

This directory contains SQL migration files to update the Supabase database schema.

## Current Migration: Add Reactions Column

The file `add_reactions_column.sql` adds a JSONB column called `reactions` to the `messages` table. This column is used to store emoji reactions to messages, with the format:

```json
{
  "emoji1": ["user_id1", "user_id2"],
  "emoji2": ["user_id3"]
}
```

## How to Apply the Migration

Since this project uses a remote-only Supabase setup, you need to apply the migration manually using one of these methods:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy the contents of `add_reactions_column.sql`
5. Paste and execute the SQL in the editor

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed and configured, you can run:

```bash
supabase db remote commit --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" < ./tmp/supabase_sql/add_reactions_column.sql
```

Replace `[YOUR-PASSWORD]` and `[YOUR-PROJECT-REF]` with your actual Supabase database password and project reference.

## Verification

After applying the migration, you can verify it worked by:

1. Going to the Supabase Dashboard
2. Navigating to Table Editor
3. Selecting the `messages` table
4. Confirming the `reactions` column exists

The error message `Error fetching message reactions: {"code": "42703", "details": null, "hint": null, "message": "column messages.reactions does not exist"}` should no longer appear after this migration is applied.