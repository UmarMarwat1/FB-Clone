# Story Views Table Setup

To enable story view tracking, you need to create the `story_views` table in your Supabase database.

## Step 1: Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Go to the "SQL Editor" section

## Step 2: Run the SQL Command
Copy and paste this SQL command into the SQL Editor and run it:

```sql
-- Create story_views table
CREATE TABLE IF NOT EXISTS story_views (
  id SERIAL PRIMARY KEY,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);

-- Enable Row Level Security (RLS)
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own views
CREATE POLICY "Users can insert their own story views" ON story_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- Create policy to allow users to read views for stories they own
CREATE POLICY "Story owners can read views" ON story_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stories 
      WHERE stories.id = story_views.story_id 
      AND stories.user_id = auth.uid()
    )
  );
```

## Step 3: Verify the Table
After running the SQL, you should see the `story_views` table in your database schema.

## What this table does:
- **Tracks story views**: Records when a user views a story
- **Prevents duplicate views**: Each user can only have one view record per story (UNIQUE constraint)
- **Excludes self-views**: The application logic excludes views from the story owner
- **Performance optimized**: Indexes on story_id and viewer_id for fast queries
- **Secure**: Row Level Security ensures users can only see views for their own stories

## After Setup:
Once the table is created, the story view tracking will work automatically:
1. When a friend views a story, it will be recorded in the database
2. Story owners will see the view count below their stories
3. Only unique friend views are counted (no self-views)
