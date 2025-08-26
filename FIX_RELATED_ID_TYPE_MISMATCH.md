# Fix Related ID Type Mismatch Error

## Problem
Error: "Failed to create post: column "related_id" is of type uuid but expression is of type bigint"

This occurs because:
- The `posts` table has an `id` column of type `bigint`
- The `notifications` table has a `related_id` column of type `uuid`
- There's likely a database trigger that automatically creates notifications when posts are created

## Solution Options

### Option 1: Fix the notifications table (Recommended)
Change the `related_id` column in notifications table to accept bigint instead of uuid.

### Option 2: Fix the posts table
Change the `id` column in posts table to use UUID instead of bigint.

### Option 3: Disable automatic notifications
Remove or modify the database trigger that creates notifications.

## Recommended Fix (Option 1)

Run this SQL in your Supabase SQL Editor:

```sql
-- Fix the notifications table to accept bigint for related_id
ALTER TABLE public.notifications 
ALTER COLUMN related_id TYPE bigint;

-- Update any existing foreign key constraints if they exist
-- (This will depend on your current schema)
```

## Alternative Fix (Option 2)

If you prefer to keep UUIDs, run this SQL:

```sql
-- Change posts table to use UUID
ALTER TABLE public.posts 
ALTER COLUMN id TYPE uuid USING gen_random_uuid();

-- Update post_media table to match
ALTER TABLE public.post_media 
ALTER COLUMN post_id TYPE uuid;

-- Update foreign key constraint
ALTER TABLE public.post_media 
DROP CONSTRAINT IF EXISTS post_media_post_id_fkey;

ALTER TABLE public.post_media 
ADD CONSTRAINT post_media_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
```

## Check Current Schema

To see your current table structure, run:

```sql
-- Check posts table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'posts' AND table_schema = 'public';

-- Check notifications table structure  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' AND table_schema = 'public';
```

## After Fix

1. Test post creation to ensure the error is resolved
2. Verify that notifications still work correctly
3. Check that existing data is not affected

## Notes

- Option 1 is recommended as it's less disruptive
- Make sure to backup your database before making schema changes
- Test thoroughly after applying the fix
