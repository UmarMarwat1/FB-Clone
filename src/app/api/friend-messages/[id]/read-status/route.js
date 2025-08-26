import { supabase } from "../../../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function GET(request, { params }) {
  try {
    const messageId = (await params).id
    
    if (!messageId) {
      return Response.json({ error: 'Message ID is required' }, { status: 400 })
    }

    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate that the authenticated user is the sender
    const session = await supabase.auth.getUser(token)
    if (!session.data.user) {
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

    // Get message details to check if user is the sender
    const { data: message, error: messageError } = await supabaseAuth
      .from('friend_messages')
      .select('id, sender_id, conversation_id')
      .eq('id', messageId)
      .single()

    if (messageError) {
      console.error("Error fetching message:", messageError)
      return Response.json({ error: 'Message not found' }, { status: 404 })
    }

    // Check if the authenticated user is the sender
    if (message.sender_id !== session.data.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if the message has been read by looking for a read record
    const { data: readRecord, error: readError } = await supabaseAuth
      .from('message_reads')
      .select('read_at')
      .eq('message_id', messageId)
      .single()

    if (readError && readError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error checking read status:", readError)
      return Response.json({ error: 'Failed to check read status' }, { status: 500 })
    }

    const isRead = !!readRecord
    const readAt = readRecord?.read_at || null

    return Response.json({
      isRead,
      readAt,
      messageId
    })

  } catch (error) {
    console.error("Read status check failed:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const messageId = (await params).id
    
    if (!messageId) {
      return Response.json({ error: 'Message ID is required' }, { status: 400 })
    }

    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate that the authenticated user is the receiver (not sender)
    const session = await supabase.auth.getUser(token)
    if (!session.data.user) {
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

    // Get message details to check if user is the receiver
    const { data: message, error: messageError } = await supabaseAuth
      .from('friend_messages')
      .select('id, sender_id, conversation_id')
      .eq('id', messageId)
      .single()

    if (messageError) {
      console.error("Error fetching message:", messageError)
      return Response.json({ error: 'Message not found' }, { status: 404 })
    }

    // Check if the authenticated user is the receiver (not sender)
    if (message.sender_id === session.data.user.id) {
      return Response.json({ error: 'Sender cannot mark their own message as read' }, { status: 400 })
    }

    // Check if the user is part of the conversation
    const { data: conversation, error: convError } = await supabaseAuth
      .from('friend_conversations')
      .select('user1_id, user2_id')
      .eq('id', message.conversation_id)
      .single()

    if (convError) {
      console.error("Error fetching conversation:", convError)
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.user1_id !== session.data.user.id && conversation.user2_id !== session.data.user.id) {
      return Response.json({ error: 'User not part of this conversation' }, { status: 403 })
    }

    // Check if message is already marked as read
    const { data: existingRead, error: readCheckError } = await supabaseAuth
      .from('message_reads')
      .select('id')
      .eq('message_id', messageId)
      .eq('reader_id', session.data.user.id)
      .single()

    if (existingRead) {
      // Message already marked as read
      return Response.json({
        success: true,
        message: 'Message already marked as read',
        messageId
      })
    }

    // Mark message as read
    const { data: readRecord, error: readError } = await supabaseAuth
      .from('message_reads')
      .insert({
        message_id: messageId,
        reader_id: session.data.user.id,
        read_at: new Date().toISOString()
      })
      .select()
      .single()

    if (readError) {
      console.error("Error marking message as read:", readError)
      return Response.json({ error: 'Failed to mark message as read' }, { status: 500 })
    }

    console.log("Message marked as read successfully:", messageId)
    return Response.json({
      success: true,
      message: 'Message marked as read',
      readRecord
    })

  } catch (error) {
    console.error("Mark as read failed:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
