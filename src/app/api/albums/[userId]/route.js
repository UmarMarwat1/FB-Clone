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

    // Get user albums with media count
    const { data: albums, error } = await supabase
      .from("user_albums")
      .select(`
        *,
        media_count:user_media(count)
      `)
      .eq("user_id", userId)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Albums fetch error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch albums" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      albums: albums || []
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
