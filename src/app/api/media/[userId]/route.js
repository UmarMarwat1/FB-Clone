import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabaseCLient";

export async function GET(request, { params }) {
  try {
    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user media from posts and profile photos
    // First, get all posts by this user
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id")
      .eq("user_id", userId);

    if (postsError) {
      console.error("Posts fetch error:", postsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch posts" },
        { status: 500 }
      );
    }

    const postIds = posts?.map(post => post.id) || [];
    
    // Get media from posts
    let media = [];
    if (postIds.length > 0) {
      const { data: postMedia, error: postMediaError } = await supabase
        .from("post_media")
        .select("*")
        .in("post_id", postIds)
        .order("created_at", { ascending: false });

      if (postMediaError) {
        console.error("Post media fetch error:", postMediaError);
      } else {
        media = postMedia || [];
      }
    }

    // Get profile photos (avatar and cover) from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("avatar_url, cover_url")
      .eq("id", userId)
      .single();

    if (!profileError && profile) {
      // Add avatar if it exists
      if (profile.avatar_url) {
        media.push({
          id: `avatar_${userId}`,
          media_url: profile.avatar_url,
          media_type: 'image',
          title: 'Profile Avatar',
          created_at: new Date().toISOString(),
          source: 'profile'
        });
      }

      // Add cover photo if it exists
      if (profile.cover_url) {
        media.push({
          id: `cover_${userId}`,
          media_url: profile.cover_url,
          media_type: 'image',
          title: 'Cover Photo',
          created_at: new Date().toISOString(),
          source: 'profile'
        });
      }
    }

    // Sort media by creation date (newest first)
    media.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(`Media API: Found ${media.length} media items for user ${userId}`);
    console.log('Media items:', media);

    return NextResponse.json({
      success: true,
      media: media || []
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
