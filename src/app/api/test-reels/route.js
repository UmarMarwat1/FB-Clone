import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

async function createSupabaseClient() {
  const cookieStore = cookies()
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

export async function GET() {
  try {
    const supabase = await createSupabaseClient()
    
    // Test 1: Check if we can connect to Supabase
    console.log('Testing Supabase connection...')
    
    // Test 2: Check if reels table exists
    const { data: tableInfo, error: tableError } = await supabase
      .from('reels')
      .select('count')
      .limit(1)
    
    if (tableError) {
      console.error('Table error:', tableError)
      return NextResponse.json({
        error: 'Reels table error',
        details: tableError.message,
        code: tableError.code
      }, { status: 500 })
    }
    
    // Test 3: Check table structure
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'reels' })
      .catch(() => ({ data: null, error: 'RPC not available' }))
    
    // Test 4: Try to get actual reels
    const { data: reels, error: reelsError } = await supabase
      .from('reels')
      .select('*')
      .limit(5)
    
    if (reelsError) {
      console.error('Reels fetch error:', reelsError)
    }
    
    return NextResponse.json({
      success: true,
      tableExists: true,
      tableInfo,
      columns,
      reelsCount: reels?.length || 0,
      sampleReels: reels?.slice(0, 2) || [],
      errors: {
        table: tableError,
        columns: columnError,
        reels: reelsError
      }
    })
    
  } catch (error) {
    console.error('Test reels error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 })
  }
}
