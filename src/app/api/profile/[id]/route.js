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

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Use admin client for read operations (no RLS restrictions needed for profile reads)
    const adminSupabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get profile with all fields
    const { data: profile, error } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Profile fetch error:", error);
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    // Get education and work data separately
    const [
      { data: education },
      { data: work }
    ] = await Promise.all([
      adminSupabase.from("user_education").select("*").eq("user_id", id).order("start_date", { ascending: false }),
      adminSupabase.from("user_work").select("*").eq("user_id", id).order("start_date", { ascending: false })
    ]);

    // Get counts
    const [
      { count: postsCount },
      { count: friendsCount },
      { count: followersCount },
      { count: followingCount }
    ] = await Promise.all([
      adminSupabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", id),
      adminSupabase.from("friends").select("*", { count: "exact", head: true }).or(`user1_id.eq.${id},user2_id.eq.${id}`),
      adminSupabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", id),
      adminSupabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", id)
    ]);

    // Get photos count by joining posts and post_media
    let photosCount = 0;
    
    // Count photos from posts
    if (postsCount > 0) {
      const { data: posts } = await adminSupabase
        .from("posts")
        .select("id")
        .eq("user_id", id);
      
      if (posts && posts.length > 0) {
        const postIds = posts.map(post => post.id);
        console.log("Post IDs for photos count:", postIds);
        const { count: mediaCount } = await adminSupabase
          .from("post_media")
          .select("*", { count: "exact", head: true })
          .in("post_id", postIds);
        photosCount += mediaCount || 0;
        console.log("Post media count:", mediaCount);
      }
    }
    
    // Count profile photos (avatar and cover)
    let profilePhotosCount = 0;
    if (profile.avatar_url) profilePhotosCount++;
    if (profile.cover_url) profilePhotosCount++;
    photosCount += profilePhotosCount;
    
    console.log("Profile photos count:", profilePhotosCount);
    console.log("Total photos count:", photosCount);

    console.log("Final profile counts:", {
      postsCount,
      friendsCount,
      followersCount,
      followingCount,
      photosCount
    });

    // Add counts and related data to profile
    const profileWithCounts = {
      ...profile,
      posts_count: postsCount || 0,
      friends_count: friendsCount || 0,
      followers_count: followersCount || 0,
      following_count: followingCount || 0,
      photos_count: photosCount || 0,
      user_education: education || [],
      user_work: work || []
    };

    return NextResponse.json({
      success: true,
      profile: profileWithCounts
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedClient(request);
    
    // Verify user is authenticated and matches the ID being updated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    
    if (user.id !== id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - can only update own profile" },
        { status: 403 }
      );
    }

    // Update profile - now RLS will work because auth.uid() will match the user
    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update profile" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
