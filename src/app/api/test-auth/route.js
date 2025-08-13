import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
})

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
    
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Invalid token',
        status: 'invalid_token'
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      status: 'authenticated'
    })
    
  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      status: 'error'
    }, { status: 500 })
  }
}
