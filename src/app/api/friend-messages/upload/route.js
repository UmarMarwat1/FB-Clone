import { supabase } from "../../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const conversationId = formData.get('conversationId')
    const senderId = formData.get('senderId')
    const messageType = formData.get('messageType') || 'image'
    
    if (!file || !conversationId || !senderId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
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
    
    // Validate file type and size
    const allowedTypes = {
      'image': ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      'video': ['video/mp4', 'video/webm', 'video/quicktime'],
      'audio': ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac']
    }
    
    const maxSizes = {
      'image': 10 * 1024 * 1024, // 10MB
      'video': 50 * 1024 * 1024, // 50MB
      'audio': 25 * 1024 * 1024  // 25MB
    }
    
    if (!allowedTypes[messageType]?.includes(file.type)) {
      return Response.json({ 
        error: `Invalid file type for ${messageType}. Allowed types: ${allowedTypes[messageType].join(', ')}` 
      }, { status: 400 })
    }
    
    if (file.size > maxSizes[messageType]) {
      return Response.json({ 
        error: `File too large for ${messageType}. Maximum size: ${maxSizes[messageType] / (1024 * 1024)}MB` 
      }, { status: 400 })
    }
    
    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAuth.storage
      .from('friend-messages')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      throw uploadError
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabaseAuth.storage
      .from('friend-messages')
      .getPublicUrl(fileName)
    
    // Handle thumbnail if provided
    let thumbnailUrl = null
    if (messageType === 'video') {
      const thumbnail = formData.get('thumbnail')
      if (thumbnail && thumbnail instanceof File) {
        // Upload thumbnail to storage
        const thumbnailFileName = `${conversationId}/thumbnails/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
        const { data: thumbnailData, error: thumbnailError } = await supabaseAuth.storage
          .from('friend-messages')
          .upload(thumbnailFileName, thumbnail, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (!thumbnailError) {
          const { data: { publicUrl } } = supabaseAuth.storage
            .from('friend-messages')
            .getPublicUrl(thumbnailFileName)
          thumbnailUrl = publicUrl
        }
      } else {
        // Fallback to placeholder thumbnail
        thumbnailUrl = '/video-placeholder.png'
      }
    }
    
    // Get duration if provided
    let duration = null
    if (messageType === 'audio' || messageType === 'video') {
      const providedDuration = formData.get('duration')
      if (providedDuration) {
        duration = parseInt(providedDuration)
      } else {
        duration = 0
      }
    }
    
    // Create message with media
    const { data: message, error: messageError } = await supabaseAuth
      .from('friend_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        message_type: messageType,
        media_url: publicUrl,
        media_thumbnail: thumbnailUrl,
        media_duration: duration,
        media_size: file.size
      })
      .select()
      .single()
    
    if (messageError) {
      console.error("Error creating message:", messageError)
      // Try to delete the uploaded file if message creation fails
      try {
        await supabaseAuth.storage
          .from('friend-messages')
          .remove([fileName])
      } catch (deleteError) {
        console.warn("Failed to delete uploaded file after message creation error:", deleteError)
      }
      throw messageError
    }
    
    // Fetch sender profile
    const { data: senderProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', message.sender_id)
      .single()
    
    if (profileError) {
      console.error("Error fetching sender profile:", profileError)
      // Continue without profile if there's an error
    }
    
    // Update conversation's last_message_at
    await supabaseAuth
      .from('friend_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
    
    console.log("Media message created successfully:", message)
    return Response.json({
      ...message,
      sender: senderProfile || null
    })
  } catch (error) {
    console.error("Media upload failed:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
