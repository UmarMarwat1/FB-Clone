import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

// Helper function to create authenticated Supabase client
function createAuthenticatedClient(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

export async function GET(request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'No authorization header',
        status: 'unauthenticated'
      }, { status: 401 })
    }
    
    const supabase = createAuthenticatedClient(request)
    
    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Invalid token',
        status: 'invalid_token'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Query will automatically respect RLS policies
    const { data: reels, error } = await supabase
      .from('reels')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // If no reels, return empty array
    if (!reels || reels.length === 0) {
      return NextResponse.json({ reels: [], success: true })
    }

    // Get user IDs from reels
    const userIds = [...new Set(reels.map(reel => reel.user_id))]

    // Fetch user profiles separately
    const { data: userProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.warn('Could not fetch user profiles:', profilesError)
    }

    // Create a map of user profiles for quick lookup
    const userProfileMap = {}
    if (userProfiles) {
      userProfiles.forEach(profile => {
        userProfileMap[profile.id] = profile
      })
    }

    // Attach user profiles to reels
    const reelsWithProfiles = reels.map(reel => ({
      ...reel,
      profiles: userProfileMap[reel.user_id] || null
    }))

    // Get engagement counts separately (more efficient)
    const reelIds = reelsWithProfiles.map(r => r.id)
    
    const [likesData, commentsData, sharesData] = await Promise.all([
      supabase.from('reel_likes').select('reel_id').in('reel_id', reelIds),
      supabase.from('reel_comments').select('reel_id').in('reel_id', reelIds),
      supabase.from('reel_shares').select('reel_id').in('reel_id', reelIds)
    ])

    // Add engagement counts to reels
    const reelsWithCounts = reelsWithProfiles.map(reel => ({
      ...reel,
      like_count: likesData.data?.filter(l => l.reel_id === reel.id).length || 0,
      comment_count: commentsData.data?.filter(c => c.reel_id === reel.id).length || 0, // This now includes all comments and replies
      share_count: sharesData.data?.filter(s => s.reel_id === reel.id).length || 0
    }))

    return NextResponse.json({ reels: reelsWithCounts, success: true })
  } catch (error) {
    console.error('Error fetching reels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reels' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'No authorization header',
        status: 'unauthenticated'
      }, { status: 401 })
    }
    
    const supabase = createAuthenticatedClient(request)
    
    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Invalid token',
        status: 'invalid_token'
      }, { status: 401 })
    }

    const body = await request.json()
    const { 
      caption, 
      video_url, 
      thumbnail_url, 
      duration, 
      width, 
      height, 
      file_size,
      privacy = 'public' 
    } = body

    if (!video_url || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (duration > 30) {
      return NextResponse.json(
        { error: 'Reel duration cannot exceed 30 seconds' },
        { status: 400 }
      )
    }

    const { data: reel, error } = await supabase
      .from('reels')
      .insert({
        user_id: user.id, // Use authenticated user ID
        caption,
        video_url,
        thumbnail_url,
        duration,
        width,
        height,
        file_size,
        privacy
      })
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ reel, success: true })
  } catch (error) {
    console.error('Error creating reel:', error)
    return NextResponse.json(
      { error: 'Failed to create reel' },
      { status: 500 }
    )
  }
}