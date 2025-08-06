import { supabase } from "../../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const { title } = await request.json()
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    console.log("Updating conversation:", id)
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
      .update({ 
        title: title,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating conversation:", error)
      throw error
    }
    
    console.log("Conversation updated successfully")
    return Response.json(data)
  } catch (error) {
    console.error("Failed to update conversation:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    console.log("Deleting conversation:", id)
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
    
    // Delete all messages in this conversation first
    const { error: messagesError } = await supabaseAuth
      .from('messages')
      .delete()
      .eq('conversation_id', id)
    
    if (messagesError) {
      console.error("Error deleting messages:", messagesError)
      // Continue anyway to delete conversation
    }
    
    // Delete the conversation
    const { error } = await supabaseAuth
      .from('conversations')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error("Error deleting conversation:", error)
      throw error
    }
    
    console.log("Conversation deleted successfully")
    return Response.json({ success: true })
  } catch (error) {
    console.error("Failed to delete conversation:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
} 