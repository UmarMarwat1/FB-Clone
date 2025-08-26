# Troubleshooting Profile Photo Archiving

## Problem: Previous avatar/cover photos are not being saved to the photos section

## 🔍 **Step 1: Check Browser Console Logs**

After updating your avatar, check the browser console for these logs:

```
Current profile data: { userId: "...", type: "avatar", currentAvatarUrl: "...", currentCoverUrl: "..." }
Old photo URL to archive: "..."
Attempting to save old photo to user_media table...
Old avatar photo saved to user_media table successfully: [...]
```

**If you don't see these logs:**
- The profile upload API might not be calling the new code
- Check if there are any JavaScript errors

**If you see error logs:**
- Look for "Failed to save old photo to user_media" messages
- Check the error details for specific database issues

## 🗄️ **Step 2: Check Database Table Structure**

Run this SQL in your Supabase SQL Editor:

```sql
-- Check if user_media table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_media'
);

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_media'
ORDER BY ordinal_position;

-- Check if table has any data
SELECT COUNT(*) FROM user_media;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_media';
```

## 🔐 **Step 3: Check RLS Policies**

The `user_media` table needs these RLS policies:

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_media';

-- If RLS is enabled but policies are missing, create them:
CREATE POLICY "Users can create their own media" ON user_media
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own media" ON user_media
    FOR SELECT USING (user_id = auth.uid());
```

## 📊 **Step 4: Check Profile Data**

Verify your profile has an existing avatar URL:

```sql
-- Check your current profile
SELECT id, username, avatar_url, cover_url 
FROM profiles 
WHERE id = 'your-user-id-here';
```

**If `avatar_url` is NULL or empty:**
- The archiving won't work because there's no old photo to save
- This is expected for first-time avatar uploads

## 🧪 **Step 5: Test the Feature**

1. **First, ensure you have an existing avatar:**
   - Upload an avatar if you don't have one
   - Wait for it to complete

2. **Then update your avatar:**
   - Upload a new avatar
   - Check browser console for logs
   - Check photos section for archived photo

3. **Check the database:**
   ```sql
   -- Look for archived photos
   SELECT * FROM user_media 
   WHERE user_id = 'your-user-id-here' 
   AND source = 'profile_archive'
   ORDER BY created_at DESC;
   ```

## 🚨 **Common Issues & Solutions**

### Issue 1: "No existing avatar URL found to archive"
**Cause:** This is your first avatar upload
**Solution:** This is normal. The feature only archives when replacing existing photos.

### Issue 2: "Failed to save old photo to user_media"
**Cause:** Database permission or structure issue
**Solutions:**
- Check RLS policies
- Verify table structure
- Check if `user_media` table exists

### Issue 3: "Media API failed"
**Cause:** API endpoint issue
**Solutions:**
- Check if `/api/media/[userId]` route exists
- Verify the route is working
- Check for JavaScript errors

### Issue 4: Photos section not showing archived photos
**Cause:** Media API not fetching from `user_media` table
**Solutions:**
- Check if the media API was updated
- Verify the API includes archived photos
- Check browser network tab for API calls

## 🔧 **Manual Fixes**

### Fix 1: Create user_media table if missing
```sql
-- Run the setup from USER_MEDIA_SETUP.md
```

### Fix 2: Fix RLS policies
```sql
-- Enable RLS
ALTER TABLE user_media ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own media" ON user_media
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own media" ON user_media
    FOR SELECT USING (user_id = auth.uid());
```

### Fix 3: Test with a simple insert
```sql
-- Test inserting a record manually
INSERT INTO user_media (user_id, media_url, media_type, title, is_public, source)
VALUES ('your-user-id', 'test-url', 'image', 'Test Photo', true, 'test');
```

## 📞 **Still Having Issues?**

If none of the above solutions work:

1. **Share the browser console logs** from when you update your avatar
2. **Share any error messages** you see
3. **Check the Network tab** in browser dev tools for failed API calls
4. **Verify your user_media table structure** matches the setup guide

## ✅ **Expected Behavior**

When working correctly:
1. Upload new avatar → Old avatar gets saved to `user_media` table
2. Old avatar appears in photos section with title "Previous Profile Avatar"
3. Photo count increases to include archived photos
4. Old file gets deleted from storage (but remains accessible via `user_media`)
