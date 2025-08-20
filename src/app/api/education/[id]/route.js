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

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { institution, degree, field_of_study, start_date, end_date, is_current } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Education ID is required" },
        { status: 400 }
      );
    }

    // Check if authorization header exists
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
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
    
    // Verify user is authenticated and owns this education record
    const { data: { user }, error: authError } = await authenticatedSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication failed" },
        { status: 401 }
      );
    }
    
    // Check if the education record belongs to the authenticated user
    const { data: existingEducation, error: fetchError } = await authenticatedSupabase
      .from("user_education")
      .select("user_id")
      .eq("id", id)
      .single();
    
    if (fetchError || !existingEducation) {
      return NextResponse.json(
        { success: false, error: "Education record not found" },
        { status: 404 }
      );
    }
    
    if (existingEducation.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - can only update your own education" },
        { status: 403 }
      );
    }

    const { data, error } = await authenticatedSupabase
      .from("user_education")
      .update({
        institution,
        degree,
        field_of_study,
        start_date: start_date || null,
        end_date: is_current ? null : (end_date || null),
        is_current
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Education update error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update education" },
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

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Education ID is required" },
        { status: 400 }
      );
    }

    // Check if authorization header exists
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
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
    
    // Verify user is authenticated and owns this education record
    const { data: { user }, error: authError } = await authenticatedSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication failed" },
        { status: 401 }
      );
    }
    
    // Check if the education record belongs to the authenticated user
    const { data: existingEducation, error: fetchError } = await authenticatedSupabase
      .from("user_education")
      .select("user_id")
      .eq("id", id)
      .single();
    
    if (fetchError || !existingEducation) {
      return NextResponse.json(
        { success: false, error: "Education record not found" },
        { status: 404 }
      );
    }
    
    if (existingEducation.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - can only delete your own education" },
        { status: 403 }
      );
    }

    const { error } = await authenticatedSupabase
      .from("user_education")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Education deletion error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to delete education" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
