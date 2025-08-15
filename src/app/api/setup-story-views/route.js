import { supabase } from "../../../../lib/supabaseCLient"

export async function POST(request) {
  try {
    // Create the story_views table if it doesn't exist
    const { error } = await supabase.rpc('create_story_views_table', {})
    
    if (error) {
      // If the RPC doesn't exist, create the table using SQL
      const { error: sqlError } = await supabase
        .from('story_views')
        .select('*')
        .limit(1)
      
      if (sqlError && sqlError.message.includes('relation "story_views" does not exist')) {
        // Table doesn't exist, create it
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS story_views (
              id SERIAL PRIMARY KEY,
              story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
              viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
              viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(story_id, viewer_id)
            );
            
            -- Create index for better performance
            CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
            CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON story_views(viewer_id);
          `
        })
        
        if (createError) {
          console.error('Error creating story_views table:', createError)
          return Response.json({ error: 'Failed to create story_views table' }, { status: 500 })
        }
      }
    }
    
    return Response.json({ success: true, message: 'story_views table is ready' })
  } catch (error) {
    console.error('Setup story views error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
