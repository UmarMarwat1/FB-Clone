import { supabase } from "../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    console.log("Fetching messages for conversation:", conversationId)
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
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error("Error fetching messages:", error)
      throw error
    }
    
    console.log("Messages fetched successfully:", data?.length || 0)
    return Response.json(data)
  } catch (error) {
    console.error("Failed to fetch messages:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}