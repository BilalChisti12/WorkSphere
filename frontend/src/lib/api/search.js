import { apiClient } from './client';

// GET /search_posts?query= - full-text search via Elasticsearch (public)
// NOTE: userId in results is raw string (not populated). No author name.
export const searchPosts = (query) =>
  apiClient(`/search_posts?query=${encodeURIComponent(query)}`);

// GET /user/search?query=&page=&limit= - search users (public)
// Re-exported from users.js for convenience
export { searchUsers } from './users';
