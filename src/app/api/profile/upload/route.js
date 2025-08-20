import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Helper function to create authenticated Supabase client
function createAuthenticatedClient(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  console.log("Creating authenticated client:", {
    hasAuthHeader: !!authHeader,
    tokenLength: token?.length,
    tokenPreview: token?.substring(0, 20) + "..."
  });
  
  if (!token) {
    console.error("No token found in authorization header!");
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
    console.log("Upload API called");
    
    // Check if authorization header exists
    const authHeader = request.headers.get('authorization');
    console.log("Auth header exists:", !!authHeader);
    console.log("Auth header preview:", authHeader?.substring(0, 20) + "...");
    
    const formData = await request.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");
    const type = formData.get("type"); // 'avatar' or 'cover'
    
    console.log("Upload request data:", {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      userId,
      type,
      hasAuthHeader: !!authHeader
    });
    
    if (!file || !userId || !type) {
      return NextResponse.json(
        { success: false, error: "File, userId, and type are required" },
        { status: 400 }
      );
    }

    if (!["avatar", "cover"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Type must be 'avatar' or 'cover'" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userId}/${type}_${timestamp}_${randomString}.${fileExtension}`;
    
    console.log("Generated filename details:", {
      userId,
      type,
      timestamp,
      randomString,
      fileExtension,
      finalFileName: fileName
    });

    // Create authenticated Supabase client for profile updates
    const authenticatedSupabase = createAuthenticatedClient(request);
    
    if (!authenticatedSupabase) {
      return NextResponse.json(
        { success: false, error: "No authentication token provided" },
        { status: 401 }
      );
    }
    
    // Verify user is authenticated and matches the userId
    const { data: { user }, error: authError } = await authenticatedSupabase.auth.getUser();
    
    console.log("Auth check result:", {
      hasUser: !!user,
      authError: authError?.message || null,
      userIdMatch: user?.id === userId,
      requestedUserId: userId,
      authenticatedUserId: user?.id
    });
    
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return NextResponse.json(
        { success: false, error: "Authentication required", details: authError?.message },
        { status: 401 }
      );
    }
    
    if (user.id !== userId) {
      console.error("User ID mismatch:", { userID: user.id, requestedUserId: userId });
      return NextResponse.json(
        { success: false, error: "Unauthorized - can only update own profile" },
        { status: 403 }
      );
    }

    // Determine bucket based on type (now that buckets exist)
    const bucket = type === "avatar" ? "avatars" : "covers";

    // For now, use service role key for storage operations to bypass RLS issues
    // We already verified the user above, so this is secure
    const serviceSupabase = supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey)
      : authenticatedSupabase;
    
    console.log("Using service role for upload:", !!supabaseServiceKey);
    
    // Upload file to Supabase Storage
    const { data, error: uploadError } = await serviceSupabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      console.error("Bucket:", bucket, "FileName:", fileName);
      console.error("Full upload error details:", JSON.stringify(uploadError, null, 2));
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Upload failed: ${uploadError.message}`,
          details: uploadError,
          fileName,
          bucket,
          uploadData: data
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = serviceSupabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    // Update profile with new URL using authenticated client (RLS will work)
    const updateField = type === "avatar" ? "avatar_url" : "cover_url";
    const { error: updateError } = await authenticatedSupabase
      .from("profiles")
      .update({
        [updateField]: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update profile" },
        { status: 500 }
      );
    }



    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: fileName
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
