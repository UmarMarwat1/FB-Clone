import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

// Helper function to create authenticated Supabase client
function createAuthenticatedClient(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return null;
  }
  
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

export async function POST(request) {
  try {
    // Check if authorization header exists
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id, institution, degree, field_of_study, start_date, end_date, is_current } = body;
    
    if (!user_id || !institution) {
      return NextResponse.json(
        { success: false, error: "User ID and institution are required" },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client
    const authenticatedSupabase = createAuthenticatedClient(request);
    
    if (!authenticatedSupabase) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }
    
    // Verify user is authenticated and matches the user_id
    const { data: { user }, error: authError } = await authenticatedSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication failed" },
        { status: 401 }
      );
    }
    
    if (user.id !== user_id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - can only add education for yourself" },
        { status: 403 }
      );
    }

    const { data, error } = await authenticatedSupabase
      .from("user_education")
      .insert([{
        user_id,
        institution,
        degree,
        field_of_study,
        start_date: start_date || null,
        end_date: is_current ? null : (end_date || null),
        is_current
      }])
      .select()
      .single();

    if (error) {
      console.error("Education creation error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to add education" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      education: data
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
