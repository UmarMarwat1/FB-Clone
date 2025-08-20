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

    // Get friends from the friends table
    const { data: friendships, error } = await supabase
      .from("friends")
      .select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (error) {
      console.error("Friends fetch error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch friends" },
        { status: 500 }
      );
    }

    if (!friendships || friendships.length === 0) {
      return NextResponse.json({
        success: true,
        friends: []
      });
    }

    // Get friend user IDs
    const friendIds = friendships.map(friendship => 
      friendship.user1_id === userId ? friendship.user2_id : friendship.user1_id
    );

    // Get friend profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", friendIds);

    if (profilesError) {
      console.error("Profiles fetch error:", profilesError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch friend profiles" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      friends: profiles || []
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
