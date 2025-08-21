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
    
    // Check if request has a body
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid content type:', contentType)
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      )
    }
    
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    if (!body || typeof body !== 'object') {
      console.error('Invalid request body:', body)
      return NextResponse.json(
        { error: 'Request body must be a valid JSON object' },
        { status: 400 }
      )
    }
    
    const { watch_duration = 0 } = body

    // Ensure watch_duration is an integer
    const watchDurationInt = Math.round(Number(watch_duration) || 0)
    
    console.log('Received view data:', {
      reel_id: id,
      viewer_id: user.id,
      watch_duration: watchDurationInt,
      original_watch_duration: watch_duration,
      content_type: contentType
    })

    // Check if view already exists
    const { data: existingView } = await supabase
      .from('reel_views')
      .select('id, watch_duration')
      .eq('reel_id', id)
      .eq('viewer_id', user.id)
      .single()

        const is_complete_view = watchDurationInt >= 3

    if (existingView) {
      // Update existing view if new duration is longer
      if (watchDurationInt > existingView.watch_duration) {
        const { error } = await supabase
          .from('reel_views')
          .update({ 
            watch_duration: watchDurationInt, 
            is_complete_view,
            viewed_at: new Date().toISOString()
          })
          .eq('id', existingView.id)

        if (error) throw error
      }
    } else {
      // Create new view record
      const { error } = await supabase
        .from('reel_views')
        .insert({
          reel_id: id,
          viewer_id: user.id,
          watch_duration: watchDurationInt,
          is_complete_view
        })

        if (error) throw error

      // Update view count only for valid views (3+ seconds)
      if (is_complete_view) {
        // Use service role for this function call
        const serviceSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        )
        await serviceSupabase.rpc('increment_reel_views', { reel_id: id })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking view:', error)
    
    // Provide more detailed error information
    let errorMessage = 'Failed to track view'
    if (error.code === '22P02') {
      errorMessage = 'Invalid data type for watch_duration'
    } else if (error.code === '23505') {
      errorMessage = 'View record already exists'
    } else if (error.code === '23503') {
      errorMessage = 'Invalid reel_id or viewer_id'
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message,
        code: error.code 
      },
      { status: 500 }
    )
  }
}