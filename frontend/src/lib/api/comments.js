import { apiClient } from './client';

// GET /post/all_comments?post_id= - returns ALL comments (no pagination)
export const getComments = (postId) =>
  apiClient(`/post/all_comments?post_id=${postId}`);

// POST /post/comment
export const addComment = (postId, comment) =>
  apiClient('/post/comment', {
    method: 'POST',
    body: JSON.stringify({ post_id: postId, comment }),
  });

// POST /post/delete_comment
export const deleteComment = (postId, commentId) =>
  apiClient('/post/delete_comment', {
    method: 'POST',
    body: JSON.stringify({ post_id: postId, commentId }),
  });
