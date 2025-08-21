# Fix Reels Upload Error

## 🚨 **Error in handleUpload Function**

The error is occurring because the API route was not properly configured for your existing `videos` storage bucket.

## ✅ **Quick Fix: Create Storage Bucket**

### **Step 1: Verify Your Setup**
✅ **Storage bucket:** `videos` (already exists)
✅ **Environment variable:** `SUPABASE_SERVICE_KEY` (already set)
✅ **API route:** Now properly configured

### **Step 2: Set Basic Policy**
Run this in **Supabase SQL Editor**:

```sql
-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads to videos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'videos' AND 
  auth.role() = 'authenticated'
);

-- Allow public read access
CREATE POLICY "Allow public read access to videos" ON storage.objects
FOR SELECT USING (bucket_id = 'videos');
```

## 🎯 **What I Fixed in Your Code:**

1. ✅ **Environment variable** - Now uses your `SUPABASE_SERVICE_KEY`
2. ✅ **Storage bucket consistency** - All references now use `videos` bucket
3. ✅ **Cleanup consistency** - File removal uses same bucket name

## 🚀 **After Creating the Bucket:**

1. **Refresh your app**
2. **Try uploading a reel again**
3. **Error should be gone!** 🎉

## 📝 **Why This Happened:**

- Your code was trying to upload to a `videos` bucket but the API route was misconfigured
- The environment variable name was incorrect in the API route
- The `handleUpload` function failed at the API call due to configuration mismatch

**Create the bucket and your reels will upload perfectly!** ✨
