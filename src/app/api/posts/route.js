import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

// Base client for token verification only
const baseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// GET - Fetch all posts with media
export async function GET() {
  try {
    // Public read (adjust if your RLS requires auth)
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles(id, username, full_name)
      `)
      .order('created_at', { ascending: false })

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 })
    }

    // Get media for all posts
    const postIds = posts.map(post => post.id)
    
    let postsWithMedia = posts
    if (postIds.length > 0) {
      const { data: mediaData, error: mediaError } = await supabase
        .from('post_media')
        .select('*')
        .in('post_id', postIds)
        .order('created_at', { ascending: true })

      if (!mediaError) {
        // Group media by post_id
        const mediaByPost = mediaData.reduce((acc, media) => {
          if (!acc[media.post_id]) acc[media.post_id] = []
          acc[media.post_id].push(media)
          return acc
        }, {})

        // Attach media to posts
        postsWithMedia = posts.map(post => ({
          ...post,
          media: mediaByPost[post.id] || []
        }))
      }
    }

    return NextResponse.json({ posts: postsWithMedia })
  } catch (error) {
    console.error('Get posts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new post with media, feeling, and activity
export async function POST(request) {
  try {
    // Authenticate via Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await baseClient.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // User-scoped client for RLS-safe inserts
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await request.json()
    const { content, media = [], feeling = null, activity = null } = body

    // Validate content - allow posts with just media or content, but not empty posts
    const hasContent = content && content.trim().length > 0
    const hasMedia = media && media.length > 0
    const hasFeelingOrActivity = feeling || activity
    
    if (!hasContent && !hasMedia && !hasFeelingOrActivity) {
      return NextResponse.json({ error: 'Post must have content, media, or feeling/activity' }, { status: 400 })
    }
    
    if (!hasContent && !hasMedia && hasFeelingOrActivity) {
      return NextResponse.json({ error: 'Feelings/Activities cannot be posted alone. Please add some content or media' }, { status: 400 })
    }

    const userId = user.id

    // Create the post
    const { data: post, error: postError } = await supabaseUser
      .from('posts')
      .insert([{
        user_id: userId,
        content: hasContent ? content.trim() : null, // Allow null content for media-only posts
        feeling,
        activity,
        media_count: media.length
      }])
      .select()
      .single()

    if (postError) {
      console.error('Create post error:', postError)
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    // Insert media if provided
    if (media.length > 0) {
      const mediaInserts = media.map(item => ({
        post_id: post.id,
        media_url: item.url,
        media_type: item.type
      }))

      const { error: mediaError } = await supabaseUser
        .from('post_media')
        .insert(mediaInserts)

      if (mediaError) {
        console.error('Insert media error:', mediaError)
        // Don't fail the whole operation, just log the error
      }
    }

    // Fetch the complete post with author and media
    const { data: completePost, error: fetchError } = await supabaseUser
      .from('posts')
      .select(`
        *,
        author:profiles(id, username, full_name)
      `)
      .eq('id', post.id)
      .single()

    if (fetchError) {
      console.error('Fetch complete post error:', fetchError)
      return NextResponse.json({ error: 'Post created but failed to fetch details' }, { status: 500 })
    }

    // Fetch media for the post
    const { data: postMedia } = await supabaseUser
      .from('post_media')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })

    const postWithMedia = {
      ...completePost,
      media: postMedia || []
    }

    return NextResponse.json({ 
      success: true,
      post: postWithMedia,
      message: 'Post created successfully'
    })

  } catch (error) {
    console.error('Create post API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a post
export async function DELETE(request) {
  try {
    // Authenticate via Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await baseClient.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('id')

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    const userId = user.id

    // Get post media before deletion to clean up storage
    const { data: mediaData } = await supabaseUser
      .from('post_media')
      .select('media_url')
      .eq('post_id', postId)

    // Delete the post (CASCADE will delete related media records)
    const { error: deleteError } = await supabaseUser
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Delete post error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
    }

    // Clean up storage files
    if (mediaData && mediaData.length > 0) {
      for (const media of mediaData) {
        const fileName = media.media_url.split('/').pop()
        if (fileName) {
          try {
            await supabase.storage
              .from('post-media')
              .remove([`${userId}/${fileName}`])
          } catch (storageError) {
            console.error('Storage cleanup error:', storageError)
            // Don't fail the operation for storage cleanup errors
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Post deleted successfully'
    })

  } catch (error) {
    console.error('Delete post API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
