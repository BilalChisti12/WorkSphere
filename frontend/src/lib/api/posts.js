import { apiClient } from './client';

// GET /feed?page=&limit= - connection feed
export const getFeed = (page = 1, limit = 10) =>
  apiClient(`/feed?page=${page}&limit=${limit}`);

// GET /user/posts?page=&limit= - my own posts
export const getMyPosts = (page = 1, limit = 10) =>
  apiClient(`/user/posts?page=${page}&limit=${limit}`);

// POST /upload_post - create post (text only; media upload has backend bug)
// At least one of body or media is required
export const createPost = (body, mediaFile = null) => {
  const formData = new FormData();
  if (body) formData.append('body', body);
  if (mediaFile) formData.append('media', mediaFile);
  return apiClient('/upload_post', {
    method: 'POST',
    body: formData,
  });
};

// POST /schedule_post
export const schedulePost = (body, scheduledTime, mediaFile = null) => {
  const formData = new FormData();
  formData.append('body', body);
  formData.append('scheduledTime', scheduledTime);
  if (mediaFile) formData.append('media', mediaFile);
  return apiClient('/schedule_post', {
    method: 'POST',
    body: formData,
  });
};

// POST /delete_post
export const deletePost = (postId) =>
  apiClient('/delete_post', {
    method: 'POST',
    body: JSON.stringify({ postId }),
  });
