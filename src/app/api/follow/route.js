import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseCLient";

export async function POST(request) {
  try {
    const { followerId, followingId } = await request.json();
    
    if (!followerId || !followingId) {
      return NextResponse.json(
        { success: false, error: "Follower ID and Following ID are required" },
        { status: 400 }
      );
    }

    if (followerId === followingId) {
      return NextResponse.json(
        { success: false, error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from("followers")
      .select("*")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .single();

    if (existingFollow) {
      return NextResponse.json(
        { success: false, error: "Already following this user" },
        { status: 400 }
      );
    }

    // Create follow relationship
    const { error } = await supabase
      .from("followers")
      .insert([{ follower_id: followerId, following_id: followingId }]);

    if (error) {
      console.error("Follow error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to follow user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { followerId, followingId } = await request.json();
    
    if (!followerId || !followingId) {
      return NextResponse.json(
        { success: false, error: "Follower ID and Following ID are required" },
        { status: 400 }
      );
    }

    // Remove follow relationship
    const { error } = await supabase
      .from("followers")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);

    if (error) {
      console.error("Unfollow error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to unfollow user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
