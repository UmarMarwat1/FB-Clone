import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Test if reels table exists and get its structure
    const { data: reels, error: reelsTableError } = await supabase
      .from('reels')
      .select('*')
      .limit(1)
    
    // Test if profiles table exists
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    // Test specific storage buckets
    const { data: videosBucket, error: videosError } = await supabase.storage
      .from('videos')
      .list('', { limit: 1 })
    
    const { data: reelsBucket, error: reelsError } = await supabase.storage
      .from('reels')
      .list('', { limit: 1 })
    
    return NextResponse.json({
      success: true,
      reels: {
        exists: !reelsTableError,
        error: reelsTableError?.message,
        sample: reels?.[0] || null
      },
      profiles: {
        exists: !profilesError,
        error: profilesError?.message,
        sample: profiles?.[0] || null
      },
      storage: {
        videos: {
          exists: !videosError,
          accessible: !videosError,
          error: videosError?.message
        },
        reels: {
          exists: !reelsError,
          accessible: !reelsError,
          error: reelsError?.message
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
