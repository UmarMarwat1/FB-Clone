import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request, { params }) {
  try {
    const { id } = await params

    const { data: reel, error } = await supabase
      .from('reels')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) throw error

    // Fetch user profile separately
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', reel.user_id)
      .single()

    if (profileError) {
      console.warn('Could not fetch user profile:', profileError)
    }

    // Combine reel with profile data
    const reelWithProfile = {
      ...reel,
      profiles: userProfile || null
    }

    return NextResponse.json({ reel: reelWithProfile, success: true })
  } catch (error) {
    console.error('Error fetching reel:', error)
    return NextResponse.json(
      { error: 'Reel not found' },
      { status: 404 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { caption, privacy } = body

    const { data: reel, error } = await supabase
      .from('reels')
      .update({ caption, privacy, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ reel, success: true })
  } catch (error) {
    console.error('Error updating reel:', error)
    return NextResponse.json(
      { error: 'Failed to update reel' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    // First, get the reel to check if it exists
    const { data: reel, error: reelError } = await supabase
      .from('reels')
      .select('*')
      .eq('id', id)
      .single()

    if (reelError) {
      throw new Error('Reel not found')
    }

    // Delete all related data in the correct order (due to foreign key constraints)
    
    // 1. Delete reel likes
    const { error: likesError } = await supabase
      .from('reel_likes')
      .delete()
      .eq('reel_id', id)
    
    if (likesError) {
      console.error('Error deleting reel likes:', likesError)
    }

    // 2. Delete reel comments
    const { error: commentsError } = await supabase
      .from('reel_comments')
      .delete()
      .eq('reel_id', id)
    
    if (commentsError) {
      console.error('Error deleting reel comments:', commentsError)
    }

    // 3. Delete saved reels
    const { error: savedError } = await supabase
      .from('saved_reels')
      .delete()
      .eq('reel_id', id)
    
    if (savedError) {
      console.error('Error deleting saved reels:', savedError)
    }

    // 4. Delete reel views
    const { error: viewsError } = await supabase
      .from('reel_views')
      .delete()
      .eq('reel_id', id)
    
    if (viewsError) {
      console.error('Error deleting reel views:', viewsError)
    }

    // 5. Delete the reel itself
    const { error: deleteError } = await supabase
      .from('reels')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Reel and all related data deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting reel:', error)
    return NextResponse.json(
      { error: 'Failed to delete reel', details: error.message },
      { status: 500 }
    )
  }
}