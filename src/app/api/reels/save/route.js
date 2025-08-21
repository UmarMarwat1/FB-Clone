import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  try {
    const { reel_id, user_id } = await request.json()
    
    if (!reel_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if already saved
    const { data: existingSave } = await supabase
      .from('saved_reels')
      .select('*')
      .eq('reel_id', reel_id)
      .eq('user_id', user_id)
      .single()

    if (existingSave) {
      // Unsave - remove from saved list
      const { error: deleteError } = await supabase
        .from('saved_reels')
        .delete()
        .eq('reel_id', reel_id)
        .eq('user_id', user_id)

      if (deleteError) {
        throw deleteError
      }

      return NextResponse.json({ 
        message: 'Reel removed from saved list',
        saved: false 
      })
    } else {
      // Save - add to saved list
      const { error: insertError } = await supabase
        .from('saved_reels')
        .insert({
          reel_id,
          user_id,
          saved_at: new Date().toISOString()
        })

      if (insertError) {
        throw insertError
      }

      return NextResponse.json({ 
        message: 'Reel saved successfully',
        saved: true 
      })
    }

  } catch (error) {
    console.error('Save/Unsave reel error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const reel_id = searchParams.get('reel_id')
    const user_id = searchParams.get('user_id')

    if (!reel_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Check if saved
    const { data: saved } = await supabase
      .from('saved_reels')
      .select('*')
      .eq('reel_id', reel_id)
      .eq('user_id', user_id)
      .single()

    return NextResponse.json({ 
      saved: !!saved 
    })

  } catch (error) {
    console.error('Check save status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
