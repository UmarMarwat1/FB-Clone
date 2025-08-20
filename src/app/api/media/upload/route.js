import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabaseCLient";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");
    const albumId = formData.get("albumId") || null;
    const title = formData.get("title") || "";
    const description = formData.get("description") || "";
    
    if (!file || !userId) {
      return NextResponse.json(
        { success: false, error: "File and userId are required" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userId}/media_${timestamp}_${randomString}.${fileExtension}`;

    // Determine media type and bucket
    const isVideo = file.type.startsWith('video/');
    const bucket = "post-media"; // Using existing bucket

    // Upload file to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    // Save media record to database
    const { data: mediaRecord, error: dbError } = await supabase
      .from("user_media")
      .insert([{
        user_id: userId,
        album_id: albumId,
        media_url: publicUrl,
        media_type: isVideo ? 'video' : 'image',
        title: title || null,
        description: description || null,
        is_public: true
      }])
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to save media record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      media: mediaRecord,
      url: publicUrl
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
