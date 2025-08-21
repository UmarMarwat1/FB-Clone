import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Test if we can access the videos bucket
    const { data: listData, error: listError } = await supabase.storage
      .from('videos')
      .list('', { limit: 1 })
    
    // Test if we can get bucket info
    const { data: bucketInfo, error: bucketError } = await supabase.storage
      .from('videos')
      .getPublicUrl('test')
    
    return NextResponse.json({
      success: true,
      videos: {
        list: {
          accessible: !listError,
          error: listError?.message,
          data: listData
        },
        publicUrl: {
          accessible: !bucketError,
          error: bucketError?.message,
          url: bucketInfo?.publicUrl
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
