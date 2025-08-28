import { supabase } from "../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { conversationId, senderId, messageType, content, mediaUrl, mediaThumbnail, mediaDuration, mediaSize } = await request.json()
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate that the authenticated user is the sender
    const session = await supabase.auth.getUser(token)
    if (!session.data.user || session.data.user.id !== senderId) {
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
    
    // Validate that the sender is part of the conversation
    const { data: conversation, error: checkError } = await supabaseAuth
      .from('friend_conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single()
    
    if (checkError) {
      console.error("Error checking conversation access:", checkError)
      throw checkError
    }
    
    if (senderId !== conversation.user1_id && senderId !== conversation.user2_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Create message
    const { data, error } = await supabaseAuth
      .from('friend_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        message_type: messageType || 'text',
        content: content || null,
        media_url: mediaUrl || null,
        media_thumbnail: mediaThumbnail || null,
        media_duration: mediaDuration || null,
        media_size: mediaSize || null
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error creating friend message:", error)
      throw error
    }
    
    // Update conversation's last_message_at
    await supabaseAuth
      .from('friend_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
    
    // Fetch the created message with sender profile
    const { data: messageWithProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', data.sender_id)
      .single()
    
    if (profileError) {
      console.error("Error fetching sender profile:", profileError)
      // Return the message without profile if there's an error
      return Response.json(data)
    }
    
    console.log("Friend message created successfully:", data)
    return Response.json({
      ...data,
      sender: messageWithProfile
    })
  } catch (error) {
    console.error("Friend message creation failed:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const limit = parseInt(searchParams.get('limit')) || 50
    const offset = parseInt(searchParams.get('offset')) || 0
    
    if (!conversationId) {
      return Response.json({ error: 'Conversation ID is required' }, { status: 400 })
    }
    
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
    
    // Validate that the authenticated user is part of the conversation
    const session = await supabase.auth.getUser(token)
    if (!session.data.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: conversation, error: checkError } = await supabaseAuth
      .from('friend_conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single()
    
    if (checkError) {
      console.error("Error checking conversation access:", checkError)
      throw checkError
    }
    
    if (session.data.user.id !== conversation.user1_id && session.data.user.id !== conversation.user2_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch messages
    const { data: messages, error } = await supabaseAuth
      .from('friend_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error("Error fetching friend messages:", error)
      throw error
    }
    
    if (!messages || messages.length === 0) {
      return Response.json([])
    }
    
    // Get all sender IDs
    const senderIds = [...new Set(messages.map(msg => msg.sender_id))]
    
    // Fetch sender profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', senderIds)
    
    if (profilesError) {
      console.error("Error fetching sender profiles:", profilesError)
      // Return messages without profiles if there's an error
      const reversedMessages = messages.reverse()
      return Response.json(reversedMessages)
    }
    
    // Create a map of profiles
    const profilesMap = profiles.reduce((map, profile) => {
      map[profile.id] = profile
      return map
    }, {})
    
    // Attach profiles to messages
    const messagesWithProfiles = messages.map(message => ({
      ...message,
      sender: profilesMap[message.sender_id] || null
    }))
    
    // Reverse the order to show oldest messages first (for chat display)
    const reversedMessages = messagesWithProfiles.reverse()
    
    console.log("Friend messages fetched successfully:", reversedMessages?.length || 0)
    return Response.json(reversedMessages)
  } catch (error) {
    console.error("Failed to fetch friend messages:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}