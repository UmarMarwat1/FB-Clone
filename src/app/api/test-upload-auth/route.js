import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

// Helper function to create authenticated Supabase client
function createAuthenticatedClient(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

export async function GET(request) {
  try {
    console.log("Test upload auth endpoint called");
    
    const authHeader = request.headers.get('authorization');
    console.log("Auth header exists:", !!authHeader);
    
    if (!authHeader) {
      return NextResponse.json({
        success: false,
        error: "No authorization header provided",
        debug: {
          hasAuthHeader: false,
          headers: Object.fromEntries(request.headers.entries())
        }
      });
    }

    const authenticatedSupabase = createAuthenticatedClient(request);
    const { data: { user }, error: authError } = await authenticatedSupabase.auth.getUser();
    
    console.log("Auth test result:", {
      hasUser: !!user,
      authError: authError?.message || null,
      userId: user?.id
    });

    return NextResponse.json({
      success: true,
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email
      } : null,
      authError: authError?.message || null,
      debug: {
        hasAuthHeader: !!authHeader,
        tokenLength: authHeader?.replace('Bearer ', '')?.length
      }
    });

  } catch (error) {
    console.error("Test auth error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      debug: error.message
    }, { status: 500 });
  }
}
