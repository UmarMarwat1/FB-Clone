import { supabase } from "../../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function GET(request, { params }) {
  try {
    const { id } = params
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Create authenticated Supabase client
    const supabaseAuth = createClient(
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
    
    // Fetch conversation
    const { data, error } = await supabaseAuth
      .from('friend_conversations')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error("Error fetching friend conversation:", error)
      if (error.code === 'PGRST116') {
        return Response.json({ error: 'Conversation not found' }, { status: 404 })
      }
      throw error
    }
    
    // Validate that the authenticated user is part of this conversation
    const session = await supabase.auth.getUser(token)
    if (!session.data.user || (session.data.user.id !== data.user1_id && session.data.user.id !== data.user2_id)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', [data.user1_id, data.user2_id])
    
    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError)
      throw profilesError
    }
    
    const user1Profile = profiles.find(p => p.id === data.user1_id)
    const user2Profile = profiles.find(p => p.id === data.user2_id)
    
    // Process conversation to get the other user's info
    const currentUserId = session.data.user.id
    const otherUser = data.user1_id === currentUserId ? user2Profile : user1Profile
    
    const processedConversation = {
      id: data.id,
      otherUser: otherUser ? {
        id: otherUser.id,
        username: otherUser.username,
        full_name: otherUser.full_name,
        avatar_url: otherUser.avatar_url
      } : null,
      last_message_at: data.last_message_at,
      created_at: data.created_at
    }
    
    console.log("Friend conversation fetched successfully:", processedConversation)
    return Response.json(processedConversation)
  } catch (error) {
    console.error("Failed to fetch friend conversation:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const { last_message_at } = await request.json()
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Create authenticated Supabase client
    const supabaseAuth = createClient(
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
    
    // Validate that the authenticated user is part of this conversation
    const session = await supabase.auth.getUser(token)
    if (!session.data.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: conversation, error: checkError } = await supabaseAuth
      .from('friend_conversations')
      .select('user1_id, user2_id')
      .eq('id', id)
      .single()
    
    if (checkError) {
      console.error("Error checking conversation access:", checkError)
      throw checkError
    }
    
    if (session.data.user.id !== conversation.user1_id && session.data.user.id !== conversation.user2_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Update conversation
    const { data, error } = await supabaseAuth
      .from('friend_conversations')
      .update({ last_message_at })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating friend conversation:", error)
      throw error
    }
    
    console.log("Friend conversation updated successfully:", data)
    return Response.json(data)
  } catch (error) {
    console.error("Failed to update friend conversation:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Create authenticated Supabase client
    const supabaseAuth = createClient(
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
    
    // Validate that the authenticated user is part of this conversation
    const session = await supabase.auth.getUser(token)
    if (!session.data.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: conversation, error: checkError } = await supabaseAuth
      .from('friend_conversations')
      .select('user1_id, user2_id')
      .eq('id', id)
      .single()
    
    if (checkError) {
      console.error("Error checking conversation access:", checkError)
      throw checkError
    }
    
    if (session.data.user.id !== conversation.user1_id && session.data.user.id !== conversation.user2_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Delete conversation (this will cascade delete messages due to foreign key constraints)
    const { error } = await supabaseAuth
      .from('friend_conversations')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error("Error deleting friend conversation:", error)
      throw error
    }
    
    console.log("Friend conversation deleted successfully")
    return Response.json({ success: true })
  } catch (error) {
    console.error("Failed to delete friend conversation:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
