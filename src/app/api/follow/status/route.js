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

    // Check if following
    const { data: follow, error } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', follower_id)
      .eq('following_id', following_id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Check follow status error:', error)
      throw error
    }

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
