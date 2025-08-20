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

    // Get following from the followers table
    const { data: followData, error } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", userId);

    if (error) {
      console.error("Following fetch error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch following" },
        { status: 500 }
      );
    }

    if (!followData || followData.length === 0) {
      return NextResponse.json({
        success: true,
        following: []
      });
    }

    // Get following user IDs
    const followingIds = followData.map(follow => follow.following_id);

    // Get following profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", followingIds);

    if (profilesError) {
      console.error("Profiles fetch error:", profilesError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch following profiles" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      following: profiles || []
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
