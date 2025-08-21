# Reels Database Setup

## 🚨 **Issue Identified**
Your reels page is showing a blank screen because the required database tables don't exist in your Supabase project.

## ✅ **Solution: Create Required Database Tables**

### **Step 1: Create Reels Table**

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create reels table
CREATE TABLE IF NOT EXISTS public.reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    caption TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER NOT NULL CHECK (duration <= 30),
    width INTEGER,
    height INTEGER,
    file_size BIGINT,
    privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'friends')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reel_likes table
CREATE TABLE IF NOT EXISTS public.reel_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id UUID REFERENCES public.reels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    like_type TEXT DEFAULT 'like' CHECK (like_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reel_id, user_id)
);

-- Create reel_comments table
CREATE TABLE IF NOT EXISTS public.reel_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id UUID REFERENCES public.reels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reel_shares table
CREATE TABLE IF NOT EXISTS public.reel_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id UUID REFERENCES public.reels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    share_type TEXT DEFAULT 'external' CHECK (share_type IN ('external', 'internal')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reel_views table
CREATE TABLE IF NOT EXISTS public.reel_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id UUID REFERENCES public.reels(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    watch_duration INTEGER DEFAULT 0,
    is_complete_view BOOLEAN DEFAULT false,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Step 2: Set Up Row Level Security (RLS)**

```sql
-- Enable RLS on all tables
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_views ENABLE ROW LEVEL SECURITY;

-- Reels policies
CREATE POLICY "Users can view public reels" ON public.reels
FOR SELECT USING (privacy = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can create their own reels" ON public.reels
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reels" ON public.reels
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reels" ON public.reels
FOR DELETE USING (auth.uid() = user_id);

-- Reel likes policies
CREATE POLICY "Users can view all likes" ON public.reel_likes
FOR SELECT USING (true);

CREATE POLICY "Users can like/unlike reels" ON public.reel_likes
FOR ALL USING (auth.uid() = user_id);

-- Reel comments policies
CREATE POLICY "Users can view all comments" ON public.reel_comments
FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON public.reel_comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reel shares policies
CREATE POLICY "Users can view all shares" ON public.reel_shares
FOR SELECT USING (true);

CREATE POLICY "Users can create shares" ON public.reel_shares
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reel views policies
CREATE POLICY "Users can view all views" ON public.reel_views
FOR SELECT USING (true);

CREATE POLICY "Users can create views" ON public.reel_views
FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users can update their own views" ON public.reel_views
FOR UPDATE USING (auth.uid() = viewer_id);
```

### **Step 3: Create Required Functions**

```sql
-- Function to increment reel view count
CREATE OR REPLACE FUNCTION increment_reel_views(reel_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.reels 
    SET view_count = COALESCE(view_count, 0) + 1 
    WHERE id = reel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add view_count column to reels table if it doesn't exist
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;
```

### **Step 4: Verify Your Current Schema**

If you already have tables with the wrong schema, you'll need to migrate them. Run this to check your current schema:

```sql
-- Check current table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('reels', 'reel_likes', 'reel_comments', 'reel_shares', 'reel_views')
ORDER BY table_name, ordinal_position;
```

### **Step 5: Migration (if needed)**

If your tables have the wrong schema, you'll need to recreate them:

```sql
-- Drop existing tables (WARNING: This will delete all data!)
DROP TABLE IF EXISTS public.reel_views CASCADE;
DROP TABLE IF EXISTS public.reel_shares CASCADE;
DROP TABLE IF EXISTS public.reel_comments CASCADE;
DROP TABLE IF EXISTS public.reel_likes CASCADE;
DROP TABLE IF EXISTS public.reels CASCADE;

-- Then run the CREATE TABLE commands from Step 1
```

## 🔧 **Alternative: Quick Fix for Existing Tables**

If you want to keep your existing data, you can alter the columns:

```sql
-- Alter existing columns to correct types
ALTER TABLE public.reel_views 
ALTER COLUMN id TYPE UUID USING gen_random_uuid(),
ALTER COLUMN reel_id TYPE UUID USING reel_id::text::uuid,
ALTER COLUMN viewer_id TYPE UUID USING viewer_id::text::uuid;

-- Add missing columns
ALTER TABLE public.reel_views 
ADD COLUMN IF NOT EXISTS is_complete_view BOOLEAN DEFAULT false;

-- Update reels table
ALTER TABLE public.reels 
ALTER COLUMN id TYPE UUID USING gen_random_uuid();

-- Update other tables
ALTER TABLE public.reel_likes 
ALTER COLUMN id TYPE UUID USING gen_random_uuid(),
ALTER COLUMN reel_id TYPE UUID USING reel_id::text::uuid;

ALTER TABLE public.reel_comments 
ALTER COLUMN id TYPE UUID USING gen_random_uuid(),
ALTER COLUMN reel_id TYPE UUID USING reel_id::text::uuid;

ALTER TABLE public.reel_shares 
ALTER COLUMN id TYPE UUID USING gen_random_uuid(),
ALTER COLUMN reel_id TYPE UUID USING reel_id::text::uuid;
```

## ✅ **After Running These Commands**

1. Your database schema will match what your API expects
2. The 500 error should be resolved
3. Video views will be properly tracked
4. All RLS policies will be in place for security

## 🚨 **Important Notes**

- **Backup your data** before running migration commands
- **Test in development** before applying to production
- **Check your Supabase project settings** to ensure RLS is enabled
- **Verify your environment variables** are correctly set
