
// import { createClient } from '@supabase/supabase-js'

// const supabaseUrl = 'https://gxvoniatwchrhmecwmqs.supabase.co'
// const supabaseKey = process.env.SUPABASE_KEY
// const supabase = createClient(supabaseUrl, supabaseKey)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Fetch user profile by user id
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// Update user profile
export async function updateProfile(userId, { username, full_name, avatar_url }) {
  const updates = {
    id: userId,
    username,
    full_name,
    avatar_url,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('profiles')
    .upsert(updates, { returning: 'minimal' });
  if (error) throw error;
  return data;
}

// Comments functions
export async function getComments(postId) {
  try {
    console.log('getComments called with postId:', postId);
    
    // Get comments data
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error in getComments:', error);
      throw error;
    }
    
    // Get user profiles for all comment authors
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(comment => comment.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .in('id', userIds);
      
      // Combine comments with user profiles
      const commentsWithProfiles = data.map(comment => ({
        ...comment,
        author: profiles?.find(profile => profile.id === comment.user_id)
      }));
      
      console.log('Comments with profiles:', commentsWithProfiles);
      console.log('Comment profiles data:', profiles);
      console.log('Comment user IDs:', userIds);
      return commentsWithProfiles || [];
    }
    
    console.log('getComments result:', data);
    return data || [];
  } catch (error) {
    console.error('getComments error:', error);
    throw error;
  }
}

export async function addComment(postId, userId, content) {
  const { data, error } = await supabase
    .from('comments')
    .insert([{ post_id: postId, user_id: userId, content }])
    .select();
  if (error) throw error;
  return data;
}

export async function deleteComment(commentId, userId) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);
  if (error) throw error;
}

// Likes functions
export async function getLikes(postId) {
  const { data, error } = await supabase
    .from('likes')
    .select('*')
    .eq('post_id', postId);
  if (error) throw error;
  return data;
}

export async function toggleLike(postId, userId, likeType) {
  // Check if user already liked/disliked
  const { data: existingLike } = await supabase
    .from('likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existingLike) {
    if (existingLike.like_type === likeType) {
      // Remove like/dislike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);
      if (error) throw error;
      return { action: 'removed' };
    } else {
      // Update like type
      const { error } = await supabase
        .from('likes')
        .update({ like_type: likeType })
        .eq('id', existingLike.id);
      if (error) throw error;
      return { action: 'updated' };
    }
  } else {
    // Add new like/dislike
    const { error } = await supabase
      .from('likes')
      .insert([{ post_id: postId, user_id: userId, like_type: likeType }]);
    if (error) throw error;
    return { action: 'added' };
  }
}

// Friend Requests functions
export async function sendFriendRequest(senderId, receiverId) {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .insert([{ sender_id: senderId, receiver_id: receiverId }])
      .select();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('sendFriendRequest error:', error);
    throw error;
  }
}

export async function getFriendRequests(userId) {
  try {
    // Simple query without complex joins
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getFriendRequests error:', error);
    throw error;
  }
}

export async function acceptFriendRequest(requestId, userId) {
  try {
    // Update request status to accepted
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('receiver_id', userId);
    
    if (updateError) throw updateError;

    // Get the request details to create friendship
    const { data: request } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .eq('id', requestId)
      .single();

    if (request) {
      // Create friendship record
      const user1Id = request.sender_id < request.receiver_id ? request.sender_id : request.receiver_id;
      const user2Id = request.sender_id < request.receiver_id ? request.receiver_id : request.sender_id;
      
      const { error: friendError } = await supabase
        .from('friends')
        .insert([{ user1_id: user1Id, user2_id: user2Id }]);
      
      if (friendError) throw friendError;
    }

    return { success: true };
  } catch (error) {
    console.error('acceptFriendRequest error:', error);
    throw error;
  }
}

export async function rejectFriendRequest(requestId, userId) {
  try {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('receiver_id', userId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('rejectFriendRequest error:', error);
    throw error;
  }
}

export async function cancelFriendRequest(requestId, userId) {
  try {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId)
      .eq('sender_id', userId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('cancelFriendRequest error:', error);
    throw error;
  }
}

export async function getFriends(userId) {
  try {
    // First get friends data
    const { data: friendsData, error: friendsError } = await supabase
      .from('friends')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (friendsError) throw friendsError;
    
    // Then get profiles for all friend IDs
    const friendIds = friendsData?.map(friendship => 
      friendship.user1_id === userId ? friendship.user2_id : friendship.user1_id
    ) || [];
    
    if (friendIds.length === 0) return [];
    
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .in('id', friendIds);
    
    if (profilesError) throw profilesError;
    
    // Combine friends data with profiles data
    const friendsWithProfiles = friendsData?.map(friendship => {
      const otherUserId = friendship.user1_id === userId ? friendship.user2_id : friendship.user1_id;
      const profile = profilesData?.find(p => p.id === otherUserId);
      return {
        ...friendship,
        user1: friendship.user1_id === userId ? null : profile,
        user2: friendship.user2_id === userId ? null : profile
      };
    }) || [];
    
    return friendsWithProfiles;
  } catch (error) {
    console.error('getFriends error:', error);
    throw error;
  }
}

export async function removeFriend(friendshipId, userId) {
  try {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('removeFriend error:', error);
    throw error;
  }
}

export async function searchUsers(searchTerm, currentUserId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
      .neq('id', currentUserId)
      .limit(20);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('searchUsers error:', error);
    throw error;
  }
}

export async function getFriendStatus(userId, otherUserId) {
  try {
    // Check if they are friends
    const { data: friendship } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`)
      .single();

    if (friendship) return { status: 'friends' };

    // Check for pending requests
    const { data: sentRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', userId)
      .eq('receiver_id', otherUserId)
      .eq('status', 'pending')
      .single();

    if (sentRequest) return { status: 'sent', requestId: sentRequest.id };

    const { data: receivedRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .single();

    if (receivedRequest) return { status: 'received', requestId: receivedRequest.id };

    return { status: 'none' };
  } catch (error) {
    console.error('getFriendStatus error:', error);
    return { status: 'none' };
  }
}