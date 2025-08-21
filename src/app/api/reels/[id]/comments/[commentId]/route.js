import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function PUT(request, { params }) {
  try {
    const { id: reelId, commentId } = params
    const { content } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Get the comment to check if it exists and get user_id
    const { data: comment, error: commentError } = await supabase
      .from('reel_comments')
      .select('*')
      .eq('id', commentId)
      .eq('reel_id', reelId)
      .single()

    if (commentError) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Check if comment is within 30 minutes
    const commentTime = new Date(comment.created_at)
    const now = new Date()
    const diffMinutes = (now - commentTime) / (1000 * 60)
    
    if (diffMinutes > 30) {
      return NextResponse.json(
        { error: 'Comments can only be edited within 30 minutes of posting' },
        { status: 400 }
      )
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('reel_comments')
      .update({ 
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select('*')
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ 
      success: true, 
      comment: updatedComment 
    })

  } catch (error) {
    console.error('Error updating comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: reelId, commentId } = params

    // Get the comment to check if it exists and get user_id
    const { data: comment, error: commentError } = await supabase
      .from('reel_comments')
      .select('*')
      .eq('id', commentId)
      .eq('reel_id', reelId)
      .single()

    if (commentError) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Check if comment is within 30 minutes
    const commentTime = new Date(comment.created_at)
    const now = new Date()
    const diffMinutes = (now - commentTime) / (1000 * 60)
    
    if (diffMinutes > 30) {
      return NextResponse.json(
        { error: 'Comments can only be deleted within 30 minutes of posting' },
        { status: 400 }
      )
    }

    // Delete the comment (this will also delete any replies due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('reel_comments')
      .delete()
      .eq('id', commentId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Comment deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment', details: error.message },
      { status: 500 }
    )
  }
}
