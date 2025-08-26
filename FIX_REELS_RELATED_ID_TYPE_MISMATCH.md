# Fix Reels Related ID Type Mismatch Error

## Problem
Error: "Failed to upload reel: Failed to create reel: column "related_id" is of type bigint but expression is of type uuid"

This occurs because:
- The `posts` table uses `bigint` for IDs (1, 2, 3, etc.)
- The `reels` table uses `UUID` for IDs (long strings like "123e4567-e89b-12d3-a456-426614174000")
- The `notifications` table now expects `bigint` for `related_id` (after the previous fix)
- There's a database trigger that automatically creates notifications when reels are created

## Root Cause
When you fixed the posts issue by changing `notifications.related_id` from `uuid` to `bigint`, it broke reels because reels use UUID IDs.

## Solution Options

### Option 1: Change notifications.related_id to TEXT (Recommended)
This allows the notifications table to accept both bigint (for posts) and UUID (for reels).

```sql
-- Change notifications.related_id to accept both bigint and UUID
ALTER TABLE public.notifications 
ALTER COLUMN related_id TYPE text;
```

### Option 2: Change reels table to use bigint (Alternative)
This would make reels consistent with posts, but is more disruptive.

```sql
-- Change reels table to use bigint instead of UUID
ALTER TABLE public.reels 
ALTER COLUMN id TYPE bigint USING gen_random_uuid()::text::bigint;

-- Update all related tables
ALTER TABLE public.reel_likes 
ALTER COLUMN reel_id TYPE bigint;

ALTER TABLE public.reel_comments 
ALTER COLUMN reel_id TYPE bigint;

ALTER TABLE public.reel_shares 
ALTER COLUMN reel_id TYPE bigint;

ALTER TABLE public.reel_views 
ALTER COLUMN reel_id TYPE bigint;
```

### Option 3: Create separate notification tables (Complex)
Create separate notification tables for posts and reels, but this is overly complex.

## Recommended Fix (Option 1)

Run this SQL in your Supabase SQL Editor:

```sql
-- Fix the notifications table to accept both bigint and UUID
ALTER TABLE public.notifications 
ALTER COLUMN related_id TYPE text;
```

## Why This Works

- **Posts**: Will store their bigint IDs as text (e.g., "1", "2", "3")
- **Reels**: Will store their UUID IDs as text (e.g., "123e4567-e89b-12d3-a456-426614174000")
- **Notifications**: Can now reference both types of content
- **Backward Compatible**: Existing data will be preserved

## After Fix

1. Test reel creation to ensure the error is resolved
2. Test post creation to ensure it still works
3. Verify that notifications work for both posts and reels

## Files Modified

- `src/app/api/reels/route.js` - Added specific error handling for type mismatch
- `src/app/api/reels/upload/route.js` - Added specific error handling for type mismatch

## Benefits

- ✅ **Unified Solution**: One notifications table for all content types
- ✅ **Flexible**: Can handle any ID type (bigint, UUID, text, etc.)
- ✅ **Future-Proof**: Easy to add new content types
- ✅ **Minimal Disruption**: No need to change existing table structures
