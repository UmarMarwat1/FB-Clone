import { NextResponse } from "next/server";
import { supabase } from "../../../../../../lib/supabaseCLient";

export async function GET(request, { params }) {
  try {
    const { username } = await params;
    
    if (!username) {
      return NextResponse.json(
        { success: false, error: "Username is required" },
        { status: 400 }
      );
    }

    // Get profile by username
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
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
      supabase.from("user_education").select("*").eq("user_id", profile.id).order("start_date", { ascending: false }),
      supabase.from("user_work").select("*").eq("user_id", profile.id).order("start_date", { ascending: false })
    ]);

    // Get counts
    const [
      { count: postsCount },
      { count: friendsCount },
      { count: followersCount },
      { count: followingCount }
    ] = await Promise.all([
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
      supabase.from("friends").select("*", { count: "exact", head: true }).or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`),
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
      supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", profile.id)
    ]);

    // Get photos count by joining posts and post_media
    let photosCount = 0;
    
    // Count photos from posts
    if (postsCount > 0) {
      const { data: posts } = await supabase
        .from("posts")
        .select("id")
        .eq("user_id", profile.id);
      
      if (posts && posts.length > 0) {
        const postIds = posts.map(post => post.id);
        console.log("Post IDs for photos count:", postIds);
        const { count: mediaCount } = await supabase
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
