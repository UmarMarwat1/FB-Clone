import { supabase } from "../../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate that the authenticated user is requesting their own data
    const session = await supabase.auth.getUser(token)
    if (!session.data.user || session.data.user.id !== userId) {
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
    
    // Get all conversations for the user
    const { data: conversations, error: conversationsError } = await supabaseAuth
      .from('friend_conversations')
      .select('id, user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    
    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError)
      throw conversationsError
    }
    
    if (!conversations || conversations.length === 0) {
      return Response.json([])
    }
    
    const conversationIds = conversations.map(c => c.id)
    
    // Get unread message counts for each conversation
    // First get all messages from other users in conversations
    const { data: allMessages, error: messagesError } = await supabaseAuth
      .from('friend_messages')
      .select('id, conversation_id, sender_id')
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId) // Only count messages from other users
    
    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
      throw messagesError
    }
    
    if (!allMessages || allMessages.length === 0) {
      // No messages from other users
      const result = conversations.map(conversation => {
        const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id
        const friendProfile = profileMap[otherUserId]
        
        return {
          conversationId: conversation.id,
          friend: friendProfile ? {
            id: friendProfile.id,
            username: friendProfile.username,
            full_name: friendProfile.full_name,
            avatar_url: friendProfile.avatar_url
          } : null,
          unreadCount: 0
        }
      })
      
      console.log("No messages from other users, returning zero counts")
      return Response.json(result)
    }
    
    // Get all message IDs from other users
    const messageIds = allMessages.map(msg => msg.id)
    
    // Get read records for these messages by the current user
    const { data: readRecords, error: readError } = await supabaseAuth
      .from('message_reads')
      .select('message_id')
      .in('message_id', messageIds)
      .eq('reader_id', userId)
    
    if (readError) {
      console.error("Error fetching read records:", readError)
      throw readError
    }
    
    // Create a set of read message IDs for faster lookup
    const readMessageIds = new Set(readRecords?.map(r => r.message_id) || [])
    
    // Count unread messages (messages not in read records)
    const unreadByConversation = {}
    allMessages.forEach(message => {
      if (!readMessageIds.has(message.id)) {
        if (!unreadByConversation[message.conversation_id]) {
          unreadByConversation[message.conversation_id] = 0
        }
        unreadByConversation[message.conversation_id]++
      }
    })
    
    // Get friend profiles for each conversation
    const { data: friendProfiles, error: profilesError } = await supabaseAuth
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', conversations.map(c => 
        c.user1_id === userId ? c.user2_id : c.user1_id
      ))
    
    if (profilesError) {
      console.error("Error fetching friend profiles:", profilesError)
      throw profilesError
    }
    
    // Create a map of user ID to profile
    const profileMap = {}
    friendProfiles.forEach(profile => {
      profileMap[profile.id] = profile
    })
    
    // Format the response
    const result = conversations.map(conversation => {
      const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id
      const friendProfile = profileMap[otherUserId]
      const unreadCount = unreadByConversation[conversation.id] || 0
      
      return {
        conversationId: conversation.id,
        friend: friendProfile ? {
          id: friendProfile.id,
          username: friendProfile.username,
          full_name: friendProfile.full_name,
          avatar_url: friendProfile.avatar_url
        } : null,
        unreadCount
      }
    })
    
    console.log("Unread message counts fetched successfully:", result?.length || 0)
    return Response.json(result)
  } catch (error) {
    console.error("Failed to fetch unread message counts:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
