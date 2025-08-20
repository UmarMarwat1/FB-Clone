import { NextResponse } from "next/server";
import { supabase } from "../../../../../../lib/supabaseCLient";

export async function GET(request, { params }) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get posts first
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      console.error("Posts fetch error:", postsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch posts" },
        { status: 500 }
      );
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        success: true,
        posts: [],
        hasMore: false,
        total: 0,
        page,
        limit
      });
    }

    // Get author profile
    const { data: author } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .eq("id", userId)
      .single();

    // Get post IDs for related data
    const postIds = posts.map(post => post.id);

    // Get related data for all posts
    const [
      { data: postMedia },
      { data: likes },
      { data: comments }
    ] = await Promise.all([
      supabase.from("post_media").select("*").in("post_id", postIds),
      supabase.from("likes").select("*").in("post_id", postIds),
      supabase.from("comments").select(`
        id, content, created_at, user_id, post_id
      `).in("post_id", postIds).order("created_at", { ascending: true })
    ]);

    // Check if there are more posts
    const { count } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const hasMore = offset + posts.length < (count || 0);

    // Process posts to include related data
    const processedPosts = posts.map(post => {
      const postLikes = likes?.filter(like => like.post_id === post.id) || [];
      const postComments = comments?.filter(comment => comment.post_id === post.id) || [];
      const postMediaItems = postMedia?.filter(media => media.post_id === post.id) || [];

      return {
        ...post,
        author,
        media: postMediaItems,
        post_media: postMediaItems,
        like_count: postLikes.filter(like => like.like_type === 'like').length,
        dislike_count: postLikes.filter(like => like.like_type === 'dislike').length,
        comment_count: postComments.length,
        comments: postComments.slice(0, 3), // Show only first 3 comments
        likes: postLikes
      };
    });

    return NextResponse.json({
      success: true,
      posts: processedPosts,
      hasMore,
      total: count || 0,
      page,
      limit
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
