# Stories Feature Setup Guide

## Database Setup

1. **Run the SQL Schema** in your Supabase SQL Editor:
   ```sql
   -- Create stories table (main story container)
   CREATE TABLE stories (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       text_content TEXT, -- Optional text content
       created_at TIMESTAMPTZ DEFAULT NOW(),
       expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
       is_active BOOLEAN DEFAULT TRUE
   );

   -- Create story_media table for multiple media items per story
   CREATE TABLE story_media (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
       media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
       media_url TEXT NOT NULL,
       thumbnail_url TEXT, -- For video thumbnails
       duration INTEGER, -- For video duration (max 15 seconds)
       media_order INTEGER NOT NULL DEFAULT 1, -- Order of media in story
       created_at TIMESTAMPTZ DEFAULT NOW(),
       CONSTRAINT story_media_video_duration_check CHECK (
           (media_type = 'video' AND duration IS NOT NULL AND duration <= 15) OR
           (media_type = 'image')
       )
   );

   -- Create story_views table
   CREATE TABLE story_views (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
       viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       viewed_at TIMESTAMPTZ DEFAULT NOW(),
       UNIQUE(story_id, viewer_id) -- Prevent duplicate views from same user
   );

   -- Add foreign key relationship between stories and profiles
   ALTER TABLE stories ADD CONSTRAINT stories_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

   -- Create indexes for better performance
   CREATE INDEX idx_stories_user_id ON stories(user_id);
   CREATE INDEX idx_stories_expires_at ON stories(expires_at);
   CREATE INDEX idx_stories_created_at ON stories(created_at);
   CREATE INDEX idx_story_media_story_id ON story_media(story_id);
   CREATE INDEX idx_story_views_story_id ON story_views(story_id);
   CREATE INDEX idx_story_views_viewer_id ON story_views(viewer_id);

   -- Enable Row Level Security (RLS)
   ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
   ALTER TABLE story_media ENABLE ROW LEVEL SECURITY;
   ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

   -- RLS Policies for stories table
   CREATE POLICY "Users can view stories from friends and themselves" ON stories
       FOR SELECT USING (
           user_id = auth.uid() OR
           EXISTS (
               SELECT 1 FROM friends 
               WHERE (user1_id = auth.uid() AND user2_id = stories.user_id) OR
                     (user1_id = stories.user_id AND user2_id = auth.uid())
           )
       );

   CREATE POLICY "Users can create their own stories" ON stories
       FOR INSERT WITH CHECK (user_id = auth.uid());

   CREATE POLICY "Users can update their own stories" ON stories
       FOR UPDATE USING (user_id = auth.uid());

   CREATE POLICY "Users can delete their own stories" ON stories
       FOR DELETE USING (user_id = auth.uid());

   -- RLS Policies for story_media table
   CREATE POLICY "Users can view story media from friends and themselves" ON story_media
       FOR SELECT USING (
           EXISTS (
               SELECT 1 FROM stories s
               WHERE s.id = story_media.story_id AND
               (s.user_id = auth.uid() OR
               EXISTS (
                   SELECT 1 FROM friends 
                   WHERE (user1_id = auth.uid() AND user2_id = s.user_id) OR
                         (user1_id = s.user_id AND user2_id = auth.uid())
               ))
           )
       );

   CREATE POLICY "Users can create story media for their own stories" ON story_media
       FOR INSERT WITH CHECK (
           EXISTS (
               SELECT 1 FROM stories s
               WHERE s.id = story_media.story_id AND s.user_id = auth.uid()
           )
       );

   CREATE POLICY "Users can update story media for their own stories" ON story_media
       FOR UPDATE USING (
           EXISTS (
               SELECT 1 FROM stories s
               WHERE s.id = story_media.story_id AND s.user_id = auth.uid()
           )
       );

   CREATE POLICY "Users can delete story media for their own stories" ON story_media
       FOR DELETE USING (
           EXISTS (
               SELECT 1 FROM stories s
               WHERE s.id = story_media.story_id AND s.user_id = auth.uid()
           )
       );

   -- RLS Policies for story_views table
   CREATE POLICY "Users can view their own story views" ON story_views
       FOR SELECT USING (viewer_id = auth.uid());

   CREATE POLICY "Users can create story views" ON story_views
       FOR INSERT WITH CHECK (viewer_id = auth.uid());

   -- Function to automatically set expires_at
   CREATE OR REPLACE FUNCTION set_story_expires_at()
   RETURNS TRIGGER AS $$
   BEGIN
       NEW.expires_at = NOW() + INTERVAL '24 hours';
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   -- Trigger to automatically set expires_at on insert
   CREATE TRIGGER trigger_set_story_expires_at
       BEFORE INSERT ON stories
       FOR EACH ROW
       EXECUTE FUNCTION set_story_expires_at();

   -- Function to clean up expired stories
   CREATE OR REPLACE FUNCTION cleanup_expired_stories()
   RETURNS void AS $$
   BEGIN
       DELETE FROM stories 
       WHERE expires_at < NOW() AND is_active = true;
   END;
   $$ LANGUAGE plpgsql;

   -- Grant necessary permissions
   GRANT USAGE ON SCHEMA public TO authenticated;
   GRANT ALL ON stories TO authenticated;
   GRANT ALL ON story_media TO authenticated;
   GRANT ALL ON story_views TO authenticated;
   GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
   ```

## Storage Setup

2. **Create Supabase Storage Bucket**:
   - Go to your Supabase Dashboard
   - Navigate to Storage
   - Click "Create a new bucket"
   - Name: `stories`
   - Make it public (uncheck "Private bucket")
   - Click "Create bucket"

3. **Set Storage Policies**:
   ```sql
   -- Allow authenticated users to upload to stories bucket
   CREATE POLICY "Allow authenticated users to upload stories" ON storage.objects
       FOR INSERT WITH CHECK (
           bucket_id = 'stories' AND
           auth.role() = 'authenticated'
       );

   -- Allow public read access to stories
   CREATE POLICY "Allow public read access to stories" ON storage.objects
       FOR SELECT USING (bucket_id = 'stories');

   -- Allow users to update their own story files
   CREATE POLICY "Allow users to update their own story files" ON storage.objects
       FOR UPDATE USING (
           bucket_id = 'stories' AND
           auth.uid()::text = (storage.foldername(name))[1]
       );

   -- Allow users to delete their own story files
   CREATE POLICY "Allow users to delete their own story files" ON storage.objects
       FOR DELETE USING (
           bucket_id = 'stories' AND
           auth.uid()::text = (storage.foldername(name))[1]
       );
   ```

## Authentication Fix

The stories feature has been updated to use the Supabase client directly instead of API routes, which fixes authentication issues. The components now handle authentication automatically through the Supabase client.

## Features

- ✅ Users can create stories with text, images, and videos
- ✅ Stories expire after 24 hours
- ✅ Only friends can view stories (friend-only visibility)
- ✅ Video duration limit of 15 seconds
- ✅ Multiple media items per story (like Facebook)
- ✅ Story viewing with progress bars
- ✅ Automatic story cleanup
- ✅ Responsive design

## Usage

1. Users can click the "+" button to create a new story
2. They can add text content and/or upload images/videos
3. Stories are visible to friends only
4. Stories automatically expire after 24 hours
5. Users can view stories by clicking on them in the stories feed

## Troubleshooting

If you encounter any issues:

1. **Check Console Errors**: Open browser developer tools and check for any JavaScript errors
2. **Verify Database Schema**: Ensure all tables and policies are created correctly
3. **Check Storage Bucket**: Make sure the `stories` bucket exists and is public
4. **Authentication**: Ensure users are properly authenticated
5. **RLS Policies**: Verify that Row Level Security policies are working correctly

The main fix was removing manual token handling and using the Supabase client directly, which handles authentication automatically.
