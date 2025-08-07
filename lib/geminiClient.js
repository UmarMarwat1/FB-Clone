import { GoogleGenerativeAI } from "@google/generative-ai";

// Debug: Check if API key is loaded
console.log("GeminiClient - API Key exists:", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
console.log("GeminiClient - API Key length:", process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length || 0);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

// Try different model names - use pro model if flash is overloaded
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });