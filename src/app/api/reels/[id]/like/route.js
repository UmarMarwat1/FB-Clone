import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function createAuthenticatedClient(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }
  
  const token = authHeader.replace('Bearer ', '')
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

export async function POST(request, { params }) {
  try {
    const supabase = createAuthenticatedClient(request)
    
    // Get current user from the token
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { like_type } = body

    // Check if like already exists
    const { data: existingLike } = await supabase
      .from('reel_likes')
      .select('id, like_type')
      .eq('reel_id', id)
      .eq('user_id', user.id)
      .single()

    if (existingLike) {
      if (!like_type || like_type === existingLike.like_type) {
        // Remove like if like_type is null/undefined or same type
        const { error } = await supabase
          .from('reel_likes')
          .delete()
          .eq('id', existingLike.id)

        if (error) throw error

        return NextResponse.json({ action: 'removed', success: true })
      } else {
        // Update like type
        const { error } = await supabase
          .from('reel_likes')
          .update({ like_type })
          .eq('id', existingLike.id)

        if (error) throw error

        return NextResponse.json({ action: 'updated', success: true })
      }
    } else {
      // Only create new like if like_type is provided
      if (!like_type) {
        return NextResponse.json(
          { error: 'Like type is required for creating a new like' },
          { status: 400 }
        )
      }

      // Create new like
      const { error } = await supabase
        .from('reel_likes')
        .insert({
          reel_id: id,
          user_id: user.id,
          like_type
        })

      if (error) throw error

      return NextResponse.json({ action: 'created', success: true })
    }
  } catch (error) {
    console.error('Error handling like:', error)
    return NextResponse.json(
      { error: 'Failed to handle like' },
      { status: 500 }
    )
  }
}