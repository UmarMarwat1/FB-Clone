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

    // Get followers from the followers table
    const { data: followData, error } = await supabase
      .from("followers")
      .select("follower_id")
      .eq("following_id", userId);

    if (error) {
      console.error("Followers fetch error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch followers" },
        { status: 500 }
      );
    }

    if (!followData || followData.length === 0) {
      return NextResponse.json({
        success: true,
        followers: []
      });
    }

    // Get follower user IDs
    const followerIds = followData.map(follow => follow.follower_id);

    // Get follower profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", followerIds);

    if (profilesError) {
      console.error("Profiles fetch error:", profilesError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch follower profiles" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      followers: profiles || []
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
