import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseCLient";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");
    const type = formData.get("type");

    console.log("=== UPLOAD DEBUG ===");
    console.log("File:", file?.name, file?.size, file?.type);
    console.log("UserId:", userId);
    console.log("Type:", type);

    // Check current user session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log("Current session:", {
      user: sessionData?.session?.user?.id,
      sessionError: sessionError?.message
    });

    // Check if user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    console.log("Auth user:", {
      id: authUser?.user?.id,
      email: authUser?.user?.email,
      authError: authError?.message
    });

    // Try a simple bucket test first
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    console.log("Available buckets:", buckets?.map(b => b.name), bucketsError?.message);

    // Check bucket policies
    const bucket = type === "avatar" ? "avatars" : "covers";
    const { data: bucketInfo, error: bucketInfoError } = await supabase.storage
      .from(bucket)
      .list('', { limit: 1 });
    
    console.log(`Bucket ${bucket} accessible:`, !bucketInfoError, bucketInfoError?.message);

    // Try upload with detailed error info
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userId}/${type}_${timestamp}_${randomString}.${fileExtension}`;

    console.log("Attempting upload with fileName:", fileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    console.log("Upload result:", {
      success: !uploadError,
      data: uploadData,
      error: uploadError
    });

    return NextResponse.json({
      success: !uploadError,
      sessionUser: sessionData?.session?.user?.id,
      authUser: authUser?.user?.id,
      fileName,
      bucket,
      uploadData,
      uploadError,
      buckets: buckets?.map(b => b.name)
    });

  } catch (error) {
    console.error("Debug upload error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
