# Storage Buckets Setup for Profile Images

## 🚨 **Issue Identified**
Your profile image upload is failing because the required storage buckets don't exist in your Supabase project.

**Error:** `uploadError: {...}` in console - Upload failed because `avatars` and `covers` buckets are missing.

## ✅ **Solution: Create Missing Storage Buckets**

### **Step 1: Create Storage Buckets**

1. **Go to your Supabase Dashboard**
2. **Navigate to Storage** (left sidebar)
3. **Create these buckets:**

#### **A. Create `avatars` bucket:**
- Click **"New bucket"**
- **Name:** `avatars`
- **Public bucket:** ✅ **Yes** (check this)
- **File size limit:** 10MB
- **Allowed MIME types:** `image/png,image/jpeg,image/jpg,image/webp,image/gif`
- Click **"Create bucket"**

#### **B. Create `covers` bucket:**
- Click **"New bucket"** 
- **Name:** `covers`
- **Public bucket:** ✅ **Yes** (check this)
- **File size limit:** 10MB  
- **Allowed MIME types:** `image/png,image/jpeg,image/jpg,image/webp,image/gif`
- Click **"Create bucket"**

### **Step 2: Set Storage Policies (Optional - for extra security)**

If you want more control, run these SQL commands in **Supabase SQL Editor**:

```sql
-- Avatars bucket policies
CREATE POLICY "Allow authenticated uploads to avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow public read access to avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Allow users to update own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Covers bucket policies
CREATE POLICY "Allow authenticated uploads to covers" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'covers' AND 
  auth.role() = 'authenticated'  
);

CREATE POLICY "Allow public read access to covers" ON storage.objects
FOR SELECT USING (bucket_id = 'covers');

CREATE POLICY "Allow users to update own covers" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### **Step 3: Test the Fix**

After creating the buckets:

1. **Refresh your app** (hard refresh: Ctrl+F5)
2. **Try uploading an avatar again**
3. **Check console** - should now show success! 🎉

### **Expected Success Response:**
```javascript
{
  success: true,
  url: "https://[your-project].supabase.co/storage/v1/object/public/avatars/...",
  path: "[user-id]/avatar_[timestamp]_[random].jpg"
}
```

## 🔍 **Verify Bucket Creation**

Visit: `http://localhost:3000/api/test-storage`
- Should show `avatars` and `covers` in the buckets list
- Should show `accessible: true` for both buckets

## 📝 **Why This Happened**

Your code was trying to upload to `avatars` and `covers` buckets that didn't exist. The error in console shows:
- `bucket: "avatars"` ← trying to upload here
- `uploadError: {...}` ← failed because bucket doesn't exist
- `uploadData: null` ← no data returned due to failure

Creating the buckets will fix this immediately! 🚀
