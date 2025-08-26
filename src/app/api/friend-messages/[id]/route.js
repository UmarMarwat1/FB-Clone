import { supabase } from "../../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const { content, messageType, mediaUrl, mediaThumbnail, mediaDuration, mediaSize } = await request.json()
    
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
    
    // Validate that the authenticated user is the sender of the message
    const session = await supabase.auth.getUser(token)
    if (!session.data.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: message, error: checkError } = await supabaseAuth
      .from('friend_messages')
      .select('sender_id')
      .eq('id', id)
      .single()
    
    if (checkError) {
      console.error("Error checking message access:", checkError)
      throw checkError
    }
    
    if (session.data.user.id !== message.sender_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Update message
    const updateData = {}
    if (content !== undefined) updateData.content = content
    if (messageType !== undefined) updateData.message_type = messageType
    if (mediaUrl !== undefined) updateData.media_url = mediaUrl
    if (mediaThumbnail !== undefined) updateData.media_thumbnail = mediaThumbnail
    if (mediaDuration !== undefined) updateData.media_duration = mediaDuration
    if (mediaSize !== undefined) updateData.media_size = mediaSize
    
    const { data, error } = await supabaseAuth
      .from('friend_messages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating friend message:", error)
      throw error
    }
    
    // Fetch sender profile
    const { data: senderProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', data.sender_id)
      .single()
    
    if (profileError) {
      console.error("Error fetching sender profile:", profileError)
      // Return message without profile if there's an error
      console.log("Friend message updated successfully:", data)
      return Response.json(data)
    }
    
    console.log("Friend message updated successfully:", data)
    return Response.json({
      ...data,
      sender: senderProfile
    })
  } catch (error) {
    console.error("Failed to update friend message:", error)
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
    
    // Validate that the authenticated user is the sender of the message
    const session = await supabase.auth.getUser(token)
    if (!session.data.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: message, error: checkError } = await supabaseAuth
      .from('friend_messages')
      .select('sender_id, media_url')
      .eq('id', id)
      .single()
    
    if (checkError) {
      console.error("Error checking message access:", checkError)
      throw checkError
    }
    
    if (session.data.user.id !== message.sender_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Delete message
    const { error } = await supabaseAuth
      .from('friend_messages')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error("Error deleting friend message:", error)
      throw error
    }
    
    // If message had media, delete it from storage
    if (message.media_url) {
      try {
        const { error: storageError } = await supabaseAuth.storage
          .from('friend-messages')
          .remove([message.media_url])
        
        if (storageError) {
          console.warn("Failed to delete media from storage:", storageError)
        }
      } catch (storageError) {
        console.warn("Error deleting media from storage:", storageError)
      }
    }
    
    console.log("Friend message deleted successfully")
    return Response.json({ success: true })
  } catch (error) {
    console.error("Failed to delete friend message:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
