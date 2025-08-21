import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { user_id, share_type = 'external', shared_to_user_id } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const { data: share, error } = await supabase
      .from('reel_shares')
      .insert({
        reel_id: id,
        user_id,
        share_type,
        shared_to_user_id
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ share, success: true })
  } catch (error) {
    console.error('Error sharing reel:', error)
    return NextResponse.json(
      { error: 'Failed to share reel' },
      { status: 500 }
    )
  }
}