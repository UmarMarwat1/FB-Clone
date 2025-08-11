import { GoogleGenerativeAI } from "@google/generative-ai"
import { supabase } from "../../../../lib/supabaseCLient"
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { message, conversationId, userId } = await request.json()
    
    // Get authentication token from headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    console.log("=== CHAT API DEBUG ===")
    console.log("Received data:", { message, conversationId, userId })
    console.log("Token exists:", !!token)
    console.log("API Key exists:", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    console.log("API Key length:", process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length || 0)

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

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // Generate AI response
    let aiResponse
    try {
      const result = await geminiModel.generateContent(message)
      aiResponse = result.response.text()
      console.log("Gemini response generated successfully")
    } catch (geminiError) {
      console.error("Gemini API error:", geminiError)
      
      // Handle specific Gemini errors
      if (geminiError.message?.includes('API_KEY')) {
        throw new Error("Invalid API key. Please check your Google AI API key.")
      } else if (geminiError.message?.includes('quota')) {
        throw new Error("API quota exceeded. Please try again later.")
      } else if (geminiError.message?.includes('overloaded')) {
        throw new Error("Service temporarily unavailable. Please try again.")
      } else {
        throw new Error("AI service error. Please try again.")
      }
    }

    // Save user message
    console.log("Saving user message to database...")
    const { data: userMsgData, error: userMsgError } = await supabaseAuth.from('messages').insert({
      conversation_id: conversationId,
      user_id: userId,
      content: message,
      role: 'user'
    }).select()

    if (userMsgError) {
      console.error("Error saving user message:", userMsgError)
      console.error("Error details:", userMsgError.message)
      console.error("Error code:", userMsgError.code)
      throw new Error("Failed to save user message")
    }

    // Save AI response
    console.log("Saving AI response to database...")
    const { data: aiMsgData, error: aiMsgError } = await supabaseAuth.from('messages').insert({
      conversation_id: conversationId,
      user_id: userId,
      content: aiResponse,
      role: 'assistant'
    }).select()

    if (aiMsgError) {
      console.error("Error saving AI message:", aiMsgError)
      console.error("Error details:", aiMsgError.message)
      console.error("Error code:", aiMsgError.code)
      throw new Error("Failed to save AI response")
    }

    // Update conversation timestamp
    console.log("Updating conversation timestamp...")
    const { error: updateError } = await supabaseAuth
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (updateError) {
      console.error("Error updating conversation:", updateError)
      // Don't throw error for timestamp update failure
    }

    console.log("All database operations completed successfully")
    return Response.json({ 
      response: aiResponse,
      userMessageId: userMsgData?.[0]?.id,
      aiMessageId: aiMsgData?.[0]?.id
    })

  } catch (error) {
    console.error("Chat API error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}