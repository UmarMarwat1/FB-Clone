import { supabase } from "../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { userId, title } = await request.json()
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    console.log("Creating conversation for user:", userId)
    console.log("Conversation title:", title)
    console.log("Token exists:", !!token)
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("Supabase Key exists:", !!process.env.NEXT_PUBLIC_SUPABASE_KEY)
    
    // Create authenticated Supabase client if token exists
    let supabaseAuth = supabase
    if (token) {
      supabaseAuth = createClient(
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
      console.log("Using authenticated Supabase client")
    } else {
      console.log("No token provided, using default client")
    }
    
    const { data, error } = await supabaseAuth
      .from('conversations')
      .insert({
        user_id: userId,
        title: title || 'New Conversation'
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error creating conversation:", error)
      console.error("Error details:", error.message)
      console.error("Error code:", error.code)
      throw error
    }
    
    console.log("Conversation created successfully:", data)
    return Response.json(data)
  } catch (error) {
    console.error("Conversation creation failed:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    console.log("Fetching conversations for user:", userId)
    console.log("Token exists:", !!token)
    
    // Create authenticated Supabase client if token exists
    let supabaseAuth = supabase
    if (token) {
      supabaseAuth = createClient(
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
      console.log("Using authenticated Supabase client")
    } else {
      console.log("No token provided, using default client")
    }
    
    const { data, error } = await supabaseAuth
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    
    if (error) {
      console.error("Error fetching conversations:", error)
      throw error
    }
    
    console.log("Conversations fetched successfully:", data?.length || 0)
    return Response.json(data)
  } catch (error) {
    console.error("Failed to fetch conversations:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}