# Supabase Storage RLS Setup Guide

## Overview

This guide explains how to set up Row Level Security (RLS) policies for Supabase Storage buckets in the RoleNet app, specifically for avatar uploads.

## Problem

When users try to upload avatars to the Supabase storage bucket, they may encounter the following error:

```
Unauthorized. new row violates row-level security policy for table "objects"
```

This occurs because Supabase Storage requires explicit RLS policies on the `storage.objects` table to allow operations like uploads, downloads, and deletions.

## Solution

We've created a SQL script that sets up the necessary RLS policies for the avatars storage bucket. The script is located at:

```
/scripts/fix-storage-rls.sql
```

### RLS Policies Created

The script creates four policies:

1. **INSERT Policy**: Allows authenticated users to upload avatars to their own folder
2. **SELECT Policy**: Allows anyone (authenticated or anonymous) to view avatars
3. **UPDATE Policy**: Allows authenticated users to update their own avatars
4. **DELETE Policy**: Allows authenticated users to delete their own avatars

Each policy (except SELECT) restricts access based on the user ID in the file path, ensuring users can only manage their own avatars.

## Implementation

### 1. Run the SQL Script

Execute the SQL script in your Supabase project's SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `/scripts/fix-storage-rls.sql`
4. Paste and run the script

### 2. Create the Avatars Bucket

If you haven't already created the avatars bucket:

1. Go to Storage in your Supabase Dashboard
2. Click "Create Bucket"
3. Name it "avatars"
4. Set it as public or private according to your needs (the RLS policies will still apply)

### 3. File Path Structure

The avatar upload code in `app/edit-profile.tsx` has been updated to use the correct file path structure:

```typescript
const filePath = `${user!.id}/${fileName}`;
```

This ensures that:
- The user ID is the first folder in the path
- The RLS policies can correctly identify which user owns which files

## Verification

After implementing these changes, users should be able to:

1. Upload their avatars without RLS policy violations
2. View their own and others' avatars
3. Update their own avatars
4. Delete their own avatars

## Troubleshooting

If you still encounter RLS policy violations:

1. Verify that the SQL script ran successfully
2. Check that the avatars bucket exists
3. Ensure the file path in the upload code matches the structure expected by the RLS policies
4. Confirm that users are properly authenticated before attempting uploads

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)