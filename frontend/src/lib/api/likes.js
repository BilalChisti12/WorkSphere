import { apiClient } from './client';

// POST /post/like - LIKE ONLY (no unlike endpoint exists in backend)
// Returns 400 "You have already liked this post" if already liked
// Use 400 response to mark post as liked locally
export const likePost = (postId) =>
  apiClient('/post/like', {
    method: 'POST',
    body: JSON.stringify({ postId }),
  });

// GET /post/likes?post_id=...
export const getLikes = (postId) =>
  apiClient(`/post/likes?post_id=${postId}`);
