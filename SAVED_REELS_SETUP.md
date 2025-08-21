# Saved Reels Database Setup

## Database Table Creation

Run these SQL commands in your Supabase SQL editor to create the necessary table for saving reels:

```sql
-- Create saved_reels table
CREATE TABLE IF NOT EXISTS saved_reels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, reel_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE saved_reels ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_reels table
CREATE POLICY "Users can view their own saved reels" ON saved_reels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved reels" ON saved_reels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved reels" ON saved_reels
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_saved_reels_user_id ON saved_reels(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_reels_reel_id ON saved_reels(reel_id);
```

## Features Implemented

1. **Save/Unsave Reels**: Users can save reels to their personal collection
2. **Follow/Unfollow Users**: Users can follow reel creators
3. **Video Controls**: Play/pause, mute/unmute, and three-dot menu
4. **Save Reel Option**: Available in the three-dot dropdown menu
5. **User Profile Display**: Shows username, avatar, and follow button
6. **Caption and Hashtags**: Displays reel caption and clickable hashtags
7. **Audio Information**: Shows original audio source

## API Endpoints

- `POST /api/follow` - Follow/unfollow users
- `GET /api/follow` - Check follow status
- `POST /api/reels/save` - Save/unsave reels
- `GET /api/reels/save` - Check save status

## Usage

1. **Follow Button**: Click to follow/unfollow reel creators
2. **Save Reel**: Click three-dot menu → "Save Reel"
3. **Video Controls**: Use top-right controls for video playback
4. **Hashtags**: Click hashtags to explore related content

The system automatically handles the database relationships and ensures users can only manage their own follows and saves.
