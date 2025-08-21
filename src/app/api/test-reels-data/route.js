import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Get all reels without any filters
    const { data: allReels, error: allReelsError } = await supabase
      .from('reels')
      .select('*')
    
    // Get reels with is_active filter
    const { data: activeReels, error: activeReelsError } = await supabase
      .from('reels')
      .select('*')
      .eq('is_active', true)
    
    // Get reels without is_active filter
    const { data: noFilterReels, error: noFilterError } = await supabase
      .from('reels')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    return NextResponse.json({
      success: true,
      allReels: {
        count: allReels?.length || 0,
        error: allReelsError?.message,
        sample: allReels?.[0] || null
      },
      activeReels: {
        count: activeReels?.length || 0,
        error: activeReelsError?.message,
        sample: activeReels?.[0] || null
      },
      noFilterReels: {
        count: noFilterReels?.length || 0,
        error: noFilterError?.message,
        sample: noFilterReels?.[0] || null
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
