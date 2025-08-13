# Media Upload Setup Instructions

## 1. Database Changes Required

Run these SQL commands in your Supabase SQL editor:

```sql
-- Add new columns to posts table
ALTER TABLE public.posts 
ADD COLUMN feeling text,
ADD COLUMN activity text,
ADD COLUMN media_count integer DEFAULT 0;

-- Fix post_media table foreign key
ALTER TABLE public.post_media 
ALTER COLUMN post_id TYPE bigint;

-- Update foreign key constraint
ALTER TABLE public.post_media 
DROP CONSTRAINT IF EXISTS post_media_post_id_fkey;

ALTER TABLE public.post_media 
ADD CONSTRAINT post_media_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
```

## 2. Supabase Storage Setup

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **Create a new bucket**
4. Name it: `post-media`
5. Make it **Public**
6. Click **Create bucket**

## 3. Storage Policies

Run these SQL commands to set up storage policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'post-media' AND 
  auth.role() = 'authenticated'
);

-- Allow public read access
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'post-media');

-- Allow users to update their own uploads
CREATE POLICY "Allow users to update own uploads" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'post-media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own uploads
CREATE POLICY "Allow users to delete own uploads" ON storage.objects
FOR DELETE USING (
  bucket_id = 'post-media' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## 4. Environment Variables

Make sure these environment variables are set in your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
```

## 5. Testing Authentication

To test if authentication is working:

1. Open browser console
2. Run this test:
```javascript
// Get current session
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)

// Test API call
const response = await fetch('/api/test-auth', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
})
const result = await response.json()
console.log('Auth test result:', result)
```

## 6. Troubleshooting

### "Unauthorized" Error
- Make sure you're logged in
- Check browser console for session details
- Verify environment variables are correct
- Ensure Supabase storage bucket exists

### Upload Fails
- Check if `post-media` bucket exists
- Verify storage policies are set correctly
- Check file size (max 50MB)
- Check file type (images/videos only)

### Database Errors
- Run the SQL commands above
- Check if all tables exist
- Verify foreign key relationships

## 7. Features Implemented

✅ **Image/Video Upload** (Max 10 files, 50MB each)
✅ **Feeling Selection** (16 predefined feelings with emojis)
✅ **Activity Selection** (20 predefined activities with icons)
✅ **Media Preview** in create post
✅ **Responsive Media Display** (1, 2, 3, 4+ media layouts)
✅ **Media Viewer Modal** (full-screen image/video view)
✅ **File Validation** (size, type, count)
✅ **Drag & Drop Upload**
✅ **Progress Indicators**
✅ **Mobile Responsive Design**

## 8. File Types Supported

- **Images:** JPG, PNG, GIF, WebP
- **Videos:** MP4, WebM, OGG, QuickTime
