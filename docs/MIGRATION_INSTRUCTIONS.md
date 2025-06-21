# Database Migration Instructions for Pin Feature

## Overview

This document provides step-by-step instructions to add the pin feature to your RoleNet application by updating your Supabase database schema.

## Problem

You're encountering this error when trying to pin messages:
```
PATCH https://yxdckfvesuytndwjbtca.supabase.co/rest/v1/messages?id=eq.31169a49-a75e-475e-9b14-49cdca116b9d 400 (Bad Request)
Error: Could not find the 'is_pinned' column of 'messages' in the schema cache
```

## Solution

The application code is already implemented to support pinning messages, but the database schema is missing the required `is_pinned` column.

## Migration Steps

### Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Apply the Migration

1. Create a new query in the SQL Editor
2. Copy and paste the following SQL code:

```sql
-- Add is_pinned column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Create index for better performance when querying pinned messages
CREATE INDEX IF NOT EXISTS idx_messages_is_pinned ON messages(is_pinned) WHERE is_pinned = true;
```

3. Click **Run** to execute the migration

### Step 3: Verify the Migration

1. Go to **Table Editor** in the left sidebar
2. Select the `messages` table
3. Confirm that the `is_pinned` column now exists with type `BOOLEAN`
4. The default value should be `false`

### Step 4: Test the Feature

1. Restart your application if it's currently running
2. Try pinning a message in the chat interface
3. The error should no longer occur

## What This Migration Does

- **Adds `is_pinned` column**: A boolean field to track whether a message is pinned
- **Sets default value**: All existing messages will have `is_pinned = false`
- **Creates performance index**: Optimizes queries for pinned messages
- **Uses IF NOT EXISTS**: Safe to run multiple times without errors

## Files Updated

The following files have been updated to support the pin feature:

1. **`lib/database-schema.sql`** - Updated schema definition
2. **`lib/types.ts`** - Added `isPinned` property to Message interface
3. **`tmp/supabase_sql/add_is_pinned_column.sql`** - Migration file
4. **`tmp/supabase_sql/README.md`** - Updated documentation

## Troubleshooting

### If the migration fails:

1. Check that you have the correct permissions on your Supabase project
2. Ensure you're connected to the correct database
3. Try running the SQL commands one at a time

### If the error persists after migration:

1. Clear your browser cache
2. Restart your development server
3. Check that the column was actually created in the Table Editor

## Additional Notes

- This migration is safe to run on a production database
- Existing messages will not be affected (they'll have `is_pinned = false`)
- The feature is already implemented in the frontend code
- No application code changes are required after the database migration