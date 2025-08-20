import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabaseCLient";

export async function GET() {
  try {
    console.log("Testing storage buckets...");
    
    // Test listing buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError);
      return NextResponse.json({
        success: false,
        error: "Failed to list buckets",
        details: bucketsError
      });
    }

    console.log("Available buckets:", buckets);

    // Test each bucket we need
    const testBuckets = ['avatars', 'covers', 'post-media', 'stories'];
    const bucketTests = {};

    for (const bucketName of testBuckets) {
      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .list('', { limit: 1 });
        
        bucketTests[bucketName] = {
          accessible: !error,
          error: error?.message || null
        };
      } catch (err) {
        bucketTests[bucketName] = {
          accessible: false,
          error: err.message
        };
      }
    }

    return NextResponse.json({
      success: true,
      buckets: buckets?.map(b => b.name) || [],
      bucketTests
    });

  } catch (error) {
    console.error("Storage test error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
}
