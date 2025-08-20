import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

export async function GET() {
  try {
    console.log("Testing service role key...");
    console.log("Service key exists:", !!supabaseServiceKey);
    console.log("Service key length:", supabaseServiceKey?.length);
    
    if (!supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: "SUPABASE_SERVICE_KEY not found in environment variables",
        debug: {
          hasKey: false,
          keyLength: 0
        }
      });
    }

    // Create service role client
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test storage access with service role
    const { data: buckets, error: bucketsError } = await serviceSupabase.storage.listBuckets();
    
    if (bucketsError) {
      return NextResponse.json({
        success: false,
        error: "Service role key cannot access storage",
        details: bucketsError,
        debug: {
          hasKey: true,
          keyLength: supabaseServiceKey.length
        }
      });
    }

    // Test upload to avatars bucket
    const testFile = new Blob(['test content'], { type: 'text/plain' });
    const testFileName = `test_${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await serviceSupabase.storage
      .from('avatars')
      .upload(testFileName, testFile);

    // Clean up test file
    if (!uploadError) {
      await serviceSupabase.storage
        .from('avatars')
        .remove([testFileName]);
    }

    return NextResponse.json({
      success: true,
      message: "Service role key is working properly",
      data: {
        bucketsCount: buckets?.length || 0,
        buckets: buckets?.map(b => b.name) || [],
        uploadTest: !uploadError,
        uploadError: uploadError?.message || null
      },
      debug: {
        hasKey: true,
        keyLength: supabaseServiceKey.length
      }
    });

  } catch (error) {
    console.error("Service key test error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error.message,
      debug: {
        hasKey: !!supabaseServiceKey,
        keyLength: supabaseServiceKey?.length || 0
      }
    }, { status: 500 });
  }
}
