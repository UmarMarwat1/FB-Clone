import { supabase } from "../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { textContent, mediaFiles, userId } = await request.json()
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    console.log("=== STORIES API DEBUG ===")
    console.log("Received data:", { textContent, mediaFilesCount: mediaFiles?.length, userId })
    console.log("Token exists:", !!token)

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

    // Create the story (expires_at will be set automatically by database trigger)
    console.log("Creating story for user:", userId)
    const { data: storyData, error: storyError } = await supabaseAuth
      .from('stories')
      .insert({
        user_id: userId,
        text_content: textContent || null
        // expires_at will be set automatically by database trigger to NOW() + 24 hours
      })
      .select()
      .single()

    if (storyError) {
      console.error("Error creating story:", storyError)
      throw new Error("Failed to create story")
    }

    console.log("Story created successfully:", storyData)
    console.log("Story expires at:", storyData.expires_at)
    console.log("Story created at:", storyData.created_at)
    console.log("Story is_active:", storyData.is_active)

    // If there are media files, insert them
    if (mediaFiles && mediaFiles.length > 0) {
      const mediaInserts = mediaFiles.map((media, index) => ({
        story_id: storyData.id,
        media_type: media.type,
        media_url: media.url,
        thumbnail_url: media.thumbnailUrl || null,
        duration: media.duration || null,
        media_order: index + 1
      }))

      const { error: mediaError } = await supabaseAuth
        .from('story_media')
        .insert(mediaInserts)

      if (mediaError) {
        console.error("Error creating story media:", mediaError)
        // Delete the story if media insertion fails
        await supabaseAuth.from('stories').delete().eq('id', storyData.id)
        throw new Error("Failed to create story media")
      }
    }

    console.log("Story created successfully:", storyData.id)
    return Response.json({ 
      success: true, 
      storyId: storyData.id,
      message: "Story created successfully"
    })

  } catch (error) {
    console.error("Stories API error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

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

    // Fetch active stories from friends and user (including those without expires_at for backwards compatibility)
    const { data: allStories, error: storiesError } = await supabaseAuth
      .from('stories')
      .select(`
        *,
        story_media (
          id,
          media_type,
          media_url,
          thumbnail_url,
          duration,
          media_order
        ),
        profiles!stories_user_id_fkey (
          id,
          username,
          full_name
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (storiesError) {
      console.error("Error fetching stories:", storiesError)
      throw new Error("Failed to fetch stories")
    }

    // Filter expired stories client-side to handle missing expires_at fields
    const now = new Date().toISOString()
    const stories = allStories?.filter(story => {
      if (!story.expires_at) return true // Keep stories without expiration date
      return new Date(story.expires_at) > new Date(now)
    }) || []

    // Sort media by order for each story
    const storiesWithSortedMedia = stories?.map(story => ({
      ...story,
      story_media: story.story_media?.sort((a, b) => a.media_order - b.media_order) || []
    })) || []

    return Response.json({ stories: storiesWithSortedMedia })

  } catch (error) {
    console.error("Get stories API error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
