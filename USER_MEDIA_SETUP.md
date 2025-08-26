# User Media Table Setup Guide

## Database Setup Required

To enable the profile photo archiving feature (where old avatar/cover photos are saved to the photos section), you need to create the `user_media` table.

### 1. Create the user_media table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create user_media table for storing user photos and videos
CREATE TABLE user_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    album_id UUID REFERENCES user_albums(id) ON DELETE SET NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    title TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    source TEXT DEFAULT 'upload', -- 'upload', 'profile_archive', 'post', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_media_user_id ON user_media(user_id);
CREATE INDEX idx_user_media_album_id ON user_media(album_id);
CREATE INDEX idx_user_media_created_at ON user_media(created_at);
CREATE INDEX idx_user_media_source ON user_media(source);

-- Enable Row Level Security (RLS)
ALTER TABLE user_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_media table
CREATE POLICY "Users can view public media" ON user_media
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own media" ON user_media
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own media" ON user_media
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own media" ON user_media
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own media" ON user_media
    FOR DELETE USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_media_updated_at 
    BEFORE UPDATE ON user_media 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### 2. Create user_albums table (optional but recommended)

If you want to organize photos into albums:

```sql
-- Create user_albums table
CREATE TABLE user_albums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover_photo_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_albums_user_id ON user_albums(user_id);
CREATE INDEX idx_user_albums_created_at ON user_albums(created_at);

-- Enable RLS
ALTER TABLE user_albums ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view public albums" ON user_albums
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own albums" ON user_albums
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own albums" ON user_albums
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own albums" ON user_albums
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own albums" ON user_albums
    FOR DELETE USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_user_albums_updated_at 
    BEFORE UPDATE ON user_albums 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## What This Enables

After setting up these tables, the profile photo update system will:

1. **Save old avatar/cover photos** to the `user_media` table before updating
2. **Delete old files** from storage to save space
3. **Keep old photos visible** in the photos section
4. **Organize photos** into albums (optional)

## Testing the Feature

1. Update your profile avatar or cover photo
2. Check that the old photo appears in the photos section
3. Verify the old file is removed from storage
4. Confirm the new photo is set as avatar/cover

## Troubleshooting

If you encounter errors:

1. **Check table exists**: Verify `user_media` table was created successfully
2. **Check RLS policies**: Ensure the policies allow authenticated users to insert
3. **Check foreign key constraints**: Verify `user_id` references `auth.users(id)`
4. **Check console logs**: Look for any error messages in the browser console

## Notes

- The `source` field helps identify where media came from (e.g., 'profile_archive' for old profile photos)
- Old profile photos are marked as public by default
- The system gracefully handles failures - if saving to `user_media` fails, the upload still succeeds
- Storage cleanup is also graceful - if deletion fails, it's logged but doesn't break the operation
