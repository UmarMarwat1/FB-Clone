import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabaseCLient";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const followerId = searchParams.get("followerId");
    const followingId = searchParams.get("followingId");
    
    if (!followerId || !followingId) {
      return NextResponse.json(
        { success: false, error: "Follower ID and Following ID are required" },
        { status: 400 }
      );
    }

    // Check if the relationship exists
    const { data, error } = await supabase
      .from("followers")
      .select("*")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error("Follow status error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to check follow status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isFollowing: !!data
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
