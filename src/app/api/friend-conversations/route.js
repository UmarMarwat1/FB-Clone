import { supabase } from "../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { user1Id, user2Id } = await request.json()
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate that the authenticated user is one of the participants
    const session = await supabase.auth.getUser(token)
    if (!session.data.user || (session.data.user.id !== user1Id && session.data.user.id !== user2Id)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Ensure consistent ordering of user IDs to avoid duplicates
    // Always put the smaller UUID first
    const orderedUser1Id = user1Id < user2Id ? user1Id : user2Id
    const orderedUser2Id = user1Id < user2Id ? user2Id : user1Id
    
    // Check if conversation already exists using ordered IDs
    const { data: existingConversations, error: checkError } = await supabase
      .from('friend_conversations')
      .select('*')
      .eq('user1_id', orderedUser1Id)
      .eq('user2_id', orderedUser2Id)
    
    if (checkError) {
      console.error("Error checking existing conversation:", checkError)
      throw checkError
    }
    
    const existingConversation = existingConversations?.[0]
    
    if (existingConversation) {
      // Get user profiles for the existing conversation
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', [existingConversation.user1_id, existingConversation.user2_id])
      
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
        return Response.json(existingConversation)
      }
      
      const user1Profile = profiles.find(p => p.id === existingConversation.user1_id)
      const user2Profile = profiles.find(p => p.id === existingConversation.user2_id)
      
      return Response.json({
        ...existingConversation,
        user1: user1Profile,
        user2: user2Profile
      })
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
    
    // Create new conversation using ordered IDs
    const { data, error } = await supabaseAuth
      .from('friend_conversations')
      .insert({
        user1_id: orderedUser1Id,
        user2_id: orderedUser2Id
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error creating friend conversation:", error)
      
      // Handle duplicate key constraint violation
      if (error.code === '23505' && error.message?.includes('friend_conversations_unique')) {
        // Try to find the existing conversation again using ordered IDs
        const { data: retryConversations, error: retryError } = await supabase
          .from('friend_conversations')
          .select('*')
          .eq('user1_id', orderedUser1Id)
          .eq('user2_id', orderedUser2Id)
        
        if (!retryError && retryConversations?.[0]) {
          // Get user profiles for the existing conversation
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', [retryConversations[0].user1_id, retryConversations[0].user2_id])
          
          if (!profilesError) {
            const user1Profile = profiles.find(p => p.id === retryConversations[0].user1_id)
            const user2Profile = profiles.find(p => p.id === retryConversations[0].user2_id)
            
            return Response.json({
              ...retryConversations[0],
              user1: user1Profile,
              user2: user2Profile
            })
          }
        }
      }
      
      throw error
    }
    
    // Get user profiles for the new conversation
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', [data.user1_id, data.user2_id])
    
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      return Response.json(data)
    }
    
    const user1Profile = profiles.find(p => p.id === data.user1_id)
    const user2Profile = profiles.find(p => p.id === data.user2_id)
    
    console.log("Friend conversation created successfully:", data)
    return Response.json({
      ...data,
      user1: user1Profile,
      user2: user2Profile
    })
  } catch (error) {
    console.error("Friend conversation creation failed:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

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
    
    // Validate that the authenticated user is requesting their own conversations
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
    
    // First, fetch conversations
    const { data: conversations, error } = await supabaseAuth
      .from('friend_conversations')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })
    
    if (error) {
      console.error("Error fetching friend conversations:", error)
      throw error
    }
    
    if (!conversations || conversations.length === 0) {
      return Response.json([])
    }
    
    // Get all user IDs from conversations
    const userIds = conversations.flatMap(conv => [conv.user1_id, conv.user2_id])
    const uniqueUserIds = [...new Set(userIds)]
    
    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', uniqueUserIds)
    
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      throw profilesError
    }
    
    // Create a map of user profiles
    const profilesMap = profiles.reduce((map, profile) => {
      map[profile.id] = profile
      return map
    }, {})
    
    // Get last messages for each conversation
    const conversationIds = conversations.map(conv => conv.id)
    const { data: lastMessages, error: messagesError } = await supabaseAuth
      .from('friend_messages')
      .select('id, content, message_type, media_url, created_at, sender_id, conversation_id')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
    
    if (messagesError) {
      console.error("Error fetching last messages:", messagesError)
      // Continue without last messages
    }
    
    // Get unread message counts for each conversation
    let unreadCounts = {}
    try {
      // Get all messages from other users in conversations
      const { data: allMessages } = await supabaseAuth
        .from('friend_messages')
        .select('id, conversation_id, sender_id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId) // Only count messages from other users
      
      if (allMessages && allMessages.length > 0) {
        const messageIds = allMessages.map(msg => msg.id)
        
        // Get read records for these messages by the current user
        const { data: readRecords } = await supabase
          .from('message_reads')
          .select('message_id')
          .in('message_id', messageIds)
          .eq('reader_id', userId)
        
        // Create a set of read message IDs for faster lookup
        const readMessageIds = new Set(readRecords?.map(r => r.message_id) || [])
        
        // Count unread messages (messages not in read records)
        allMessages.forEach(message => {
          if (!readMessageIds.has(message.id)) {
            if (!unreadCounts[message.conversation_id]) {
              unreadCounts[message.conversation_id] = 0
            }
            unreadCounts[message.conversation_id]++
          }
        })
      }
    } catch (error) {
      console.warn("Could not fetch unread counts:", error)
      // Continue without unread counts
    }
    
    // Process conversations to get the other user's info and format last message
    const processedConversations = conversations.map(conversation => {
      const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id
      const otherUser = profilesMap[otherUserId]
      
      // Find the last message for this conversation
      const conversationMessages = lastMessages?.filter(msg => msg.conversation_id === conversation.id) || []
      const lastMessage = conversationMessages.length > 0 ? conversationMessages[0] : null
      
      return {
        id: conversation.id,
        otherUser: otherUser ? {
          id: otherUser.id,
          username: otherUser.username,
          full_name: otherUser.full_name,
          avatar_url: otherUser.avatar_url
        } : null,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          message_type: lastMessage.message_type,
          media_url: lastMessage.media_url,
          created_at: lastMessage.created_at,
          sender_id: lastMessage.sender_id
        } : null,
        last_message_at: conversation.last_message_at,
        created_at: conversation.created_at,
        unreadCount: unreadCounts[conversation.id] || 0
      }
    })
    
    console.log("Friend conversations fetched successfully:", processedConversations?.length || 0)
    return Response.json(processedConversations)
  } catch (error) {
    console.error("Failed to fetch friend conversations:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
