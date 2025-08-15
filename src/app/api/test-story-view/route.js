import { supabase } from "../../../../lib/supabaseCLient"

export async function POST(request) {
  try {
    const { story_id, viewer_id } = await request.json()
    
    console.log('Testing story view insert:', { story_id, viewer_id })
    
    // Insert a test view
    const { data, error } = await supabase
      .from('story_views')
      .upsert({
        story_id: story_id,
        viewer_id: viewer_id,
        viewed_at: new Date().toISOString()
      }, {
        onConflict: 'story_id,viewer_id'
      })

    console.log('Insert result:', { data, error })

    if (error) {
      return Response.json({ 
        success: false, 
        error: error.message,
        details: error
      }, { status: 500 })
    }

    // Now fetch the view count for this story
    const { data: viewData, error: viewError } = await supabase
      .from('story_views')
      .select('viewer_id')
      .eq('story_id', story_id)

    console.log('View count data:', { viewData, viewError })

    return Response.json({ 
      success: true, 
      message: 'Test view inserted successfully',
      insertData: data,
      viewCount: viewData?.length || 0,
      allViews: viewData
    })
  } catch (error) {
    console.error('Test API error:', error)
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
