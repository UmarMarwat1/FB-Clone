import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseCLient";

export async function POST() {
  try {
    console.log("Attempting to disable RLS temporarily for storage buckets...");
    
    // Try using the service role client instead of regular client
    const { createClient } = require('@supabase/supabase-js');
    
    // Create service role client (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // You need this in .env.local
    );

    return NextResponse.json({
      message: "Service role setup ready",
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL
    });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}
