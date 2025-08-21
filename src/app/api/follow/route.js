import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  try {
    const { follower_id, following_id } = await request.json()
    
    if (!follower_id || !following_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (follower_id === following_id) {
      return NextResponse.json(
        { error: 'Users cannot follow themselves' },
        { status: 400 }
      )
    }

    // Insert the follow relationship
    const { data, error: insertError } = await supabase
      .from('followers')
      .insert({
        follower_id,
        following_id
      })
      .select()

    if (insertError) {
      console.error('Insert error details:', insertError)
      throw insertError
    }

    return NextResponse.json({ 
      message: 'Followed successfully',
      following: true 
    })

  } catch (error) {
    console.error('Follow error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { follower_id, following_id } = await request.json()
    
    console.log('Unfollow request received:', { follower_id, following_id })
    
    if (!follower_id || !following_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (follower_id === following_id) {
      return NextResponse.json(
        { error: 'Users cannot unfollow themselves' },
        { status: 400 }
      )
    }

    // Delete the follow relationship
    const { error: deleteError } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', follower_id)
      .eq('following_id', following_id)

    if (deleteError) {
      console.error('Delete error details:', deleteError)
      throw deleteError
    }

    console.log('Unfollow successful')

    return NextResponse.json({ 
      message: 'Unfollowed successfully',
      following: false 
    })

  } catch (error) {
    console.error('Unfollow error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const follower_id = searchParams.get('follower_id')
    const following_id = searchParams.get('following_id')

    if (!follower_id || !following_id) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Check if following
    const { data: follow } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', follower_id)
      .eq('following_id', following_id)
      .single()

    return NextResponse.json({ 
      following: !!follow 
    })

  } catch (error) {
    console.error('Check follow status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
