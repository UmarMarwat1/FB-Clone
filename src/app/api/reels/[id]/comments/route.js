import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function createAuthenticatedClient(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }
  
  const token = authHeader.replace('Bearer ', '')
  
  return createClient(
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

export async function GET(request, { params }) {
  try {
    const supabase = createAuthenticatedClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // First, get all comments for this reel
    const { data: allComments, error: commentsError } = await supabase
      .from('reel_comments')
      .select('*')
      .eq('reel_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (commentsError) throw commentsError

    console.log('Raw comments from database:', allComments)

    // If no comments, return empty array
    if (!allComments || allComments.length === 0) {
      return NextResponse.json({ 
        comments: [], 
        success: true,
        total: 0
      })
    }

    // Get user IDs from comments
    const userIds = [...new Set(allComments.map(comment => comment.user_id))]

    // Fetch user profiles separately
    const { data: userProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds)

    if (profilesError) throw profilesError

    console.log('User profiles:', userProfiles)

    // Create a map of user profiles for quick lookup
    const userProfileMap = {}
    userProfiles.forEach(profile => {
      userProfileMap[profile.id] = profile
    })

    // Attach user profiles to comments
    const commentsWithProfiles = allComments.map(comment => ({
      ...comment,
      profiles: userProfileMap[comment.user_id] || null
    }))

    // Separate top-level comments and replies
    const topLevelComments = commentsWithProfiles.filter(comment => !comment.parent_comment_id)
    const replies = commentsWithProfiles.filter(comment => comment.parent_comment_id)

    console.log('Top-level comments:', topLevelComments)
    console.log('Replies:', replies)

    // Attach replies to their parent comments
    const commentsWithReplies = topLevelComments.map(comment => ({
      ...comment,
      replies: replies.filter(reply => reply.parent_comment_id === comment.id)
    }))

    console.log('Final comments with replies:', commentsWithReplies)

    return NextResponse.json({ 
      comments: commentsWithReplies, 
      success: true,
      total: allComments.length
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

export async function POST(request, { params }) {
  try {
    const supabase = createAuthenticatedClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { content, parent_comment_id } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Insert the comment
    const { data: comment, error: insertError } = await supabase
      .from('reel_comments')
      .insert({
        reel_id: id,
        user_id: user.id,
        content,
        parent_comment_id
      })
      .select('*')
      .single()

    if (insertError) throw insertError

    // Fetch the user profile separately
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.warn('Could not fetch user profile:', profileError)
    }

    // Combine comment with profile data
    const commentWithProfile = {
      ...comment,
      profiles: userProfile || null
    }

    return NextResponse.json({ comment: commentWithProfile, success: true })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}