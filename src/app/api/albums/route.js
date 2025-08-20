import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseCLient";

export async function POST(request) {
  try {
    const { userId, name, description, isPublic = true } = await request.json();
    
    if (!userId || !name) {
      return NextResponse.json(
        { success: false, error: "User ID and album name are required" },
        { status: 400 }
      );
    }

    // Create new album
    const { data: album, error } = await supabase
      .from("user_albums")
      .insert([{
        user_id: userId,
        name,
        description,
        is_public: isPublic
      }])
      .select()
      .single();

    if (error) {
      console.error("Album creation error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create album" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      album
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
