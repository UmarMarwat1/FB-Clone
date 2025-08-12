import { supabase } from "../../../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function POST(request, { params }) {
  try {
    const { id: storyId } = params
    const { userId } = await request.json()
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    console.log("=== STORY VIEW API DEBUG ===")
    console.log("Story ID:", storyId)
    console.log("Viewer ID:", userId)

    // Create authenticated Supabase client
    let supabaseAuth = supabase
    if (token) {
      supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
    }

    // Check if user already viewed this story
    const { data: existingView } = await supabaseAuth
      .from('story_views')
      .select('id')
      .eq('story_id', storyId)
      .eq('viewer_id', userId)
      .single()

    if (existingView) {
      // Already viewed, just return success
      return Response.json({ 
        success: true, 
        message: "Story already viewed",
        alreadyViewed: true
      })
    }

    // Create new view record
    const { error: viewError } = await supabaseAuth
      .from('story_views')
      .insert({
        story_id: storyId,
        viewer_id: userId
      })

    if (viewError) {
      console.error("Error creating story view:", viewError)
      throw new Error("Failed to record story view")
    }

    console.log("Story view recorded successfully")
    return Response.json({ 
      success: true, 
      message: "Story view recorded",
      alreadyViewed: false
    })

  } catch (error) {
    console.error("Story view API error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
