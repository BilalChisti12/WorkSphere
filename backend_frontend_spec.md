# Backend -> Next.js Frontend Integration Specification

**Project:** WorkSphere
**Inspected:** d:\WorkSphere\backend\
**Frontend Target:** Next.js 16 (Pages Router), React 19
**Date:** 2026-09-26
**Author:** Generated from 100% code inspection. Zero assumptions made.

> Every claim is traceable to a source file. Where information cannot be confirmed: UNKNOWN - VERIFY IN BACKEND.

## TABLE OF CONTENTS

1. Project Architecture
2. Complete API Inventory
3. Authentication Flow
4. User Features
5. Post Features
6. Slack Integration
7. Bull Board
8. File Uploads
9. Pagination / Search / Filtering
10. Authorization / Security
11. Frontend Page Map
12. Component / API Mapping
13. State Management Requirements
14. API Client Requirements
15. Frontend Route Protection
16. Frontend Environment Variables
17. Missing / Unsupported Features
18. Potential Integration Problems
19. Exact Frontend Contract

---

## 1. PROJECT ARCHITECTURE

### Backend Framework

Express 5.2.1, Node.js ESM modules (type: module in package.json)

### Entry Point

backend/server.js

### Folder Structure

`
backend/
  server.js              - Entry point, app setup, Bull Board mount
  controllers/
    user.controller.js   - All user/auth/profile/connection/Slack logic
    posts.controller.js  - All post/comment/like/feed/search logic
  routes/
    user.routes.js       - User + auth + slack routes + multer for profile pics
    posts.routes.js      - Post routes + multer for post media
  models/
    user.model.js        - User schema
    profile.model.js     - Profile schema (nested sub-docs)
    posts.model.js       - Post schema
    comments.model.js    - Comment schema
    like.model.js        - Like schema (separate collection)
    connection.model.js  - ConnectionRequest schema
  middleware/
    auth.middleware.js   - JWT authentication middleware
  queue/
    postQueue.js         - BullMQ PostQueue (scheduled posts)
    postWorker.js        - Publishes scheduled posts + Slack rate-limit DM
    elasticQueue.js      - BullMQ ElasticQueue (Elasticsearch indexing)
    elasticWorker.js     - Indexes posts into Elasticsearch
  elasticClient.js       - Elasticsearch client singleton
  uploads/               - Static file directory (served at root)
`

### External Services

| Service | Purpose | Env Var(s) |
|---|---|---|
| MongoDB Atlas | Primary database | MONGO_URL |
| Redis (ioredis) | BullMQ queue + rate limiting | REDIS_HOST, REDIS_PORT |
| Elasticsearch 8.11 | Full-text post search | ELASTIC_URL |
| Slack API | OAuth + DM notifications | SLACK_CLIENT_ID, SLACK_CLIENT_SECRET |

### Architecture - Plain Language

- Express serves two route files and mounts Bull Board at /admin/queues.
- Uploaded files go to uploads/ on disk. Express serves that folder as static files.
  A file named abc.jpg is at http://localhost:8080/abc.jpg.
- Authentication is JWT-based. The token is stored in the database on the User document.
  One active session per user - logging in on a second device kills the first session.
- PostQueue: processes scheduled posts, respects per-user hourly rate limit (default 5/hr).
  Sends Slack DM on rate-limit hit.
- ElasticQueue: indexes published posts into Elasticsearch. 10 retries, exponential backoff.
- No role system - no admin, no moderator. All users are equal except ownership checks.
- CORS: app.use(cors()) with no origin restriction. All origins allowed.

---

## 2. COMPLETE API INVENTORY

Base URL: http://localhost:8080 (development)
No API prefix - all routes are at root level (no /api/v1).

---

### GET /  - Health Check

`
AUTH REQUIRED:  NO
BODY:           None
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Server is active" }
FRONTEND ACTION: Optional health ping on app startup.
`

---

### POST /register  - Create Account

`
AUTH REQUIRED:  NO
BODY (JSON):    { "name": string, "email": string, "password": string, "username": string }
HEADERS:        Content-Type: application/json
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "User created successfully" }
  A Profile document is auto-created for the new user.
ERROR STATUSES: 400, 500
ERROR RESPONSE (400):
  { "sucess": false, "message": "All fields are required" }   <- TYPO: sucess
  { "sucess": false, "message": "User already exists" }
  { "message": "Password cannot be empty" }
  { "message": "Name cannot be empty" }
  { "message": "Email cannot be empty" }
  { "message": "Username cannot be empty" }
FRONTEND ACTION: On 200, redirect to /login.
`

---

### POST /login  - Authenticate

`
AUTH REQUIRED:  NO
BODY (JSON):    { "email": string, "password": string }
HEADERS:        Content-Type: application/json
SUCCESS STATUS: 200
SUCCESS RESPONSE:
  { "token": string, "message": "Login successfull" }  <- TYPO: successfull (double l)
  token is JWT. Store this. Required for all protected routes.
ERROR STATUSES: 400, 500
ERROR RESPONSE (400):
  { "message": "All Fields are required" }
  { "message": "User not found" }
  { "message": "Account is deactivated" }
  { "message": "invalid credentials" }
FRONTEND ACTION: On 200, save token. Redirect to /feed.
`

---

### POST /logout  - End Session

`
AUTH REQUIRED:  YES
BODY:           None required
HEADERS:        Authorization: Bearer <token>
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Logged out successfully" }
  Sets user.token = "" in DB. Token immediately invalid.
ERROR STATUSES: 401, 500
FRONTEND ACTION: On 200, delete token. Redirect to /login.
`

---

### GET /get_user_profile  - Own Profile

`
AUTH REQUIRED:  YES
HEADERS:        Authorization: Bearer <token>
SUCCESS STATUS: 200
SUCCESS RESPONSE:
  {
    "_id": string,           <- Profile document ID
    "userId": {
      "_id": string,         <- User document ID
      "name": string,
      "email": string,
      "username": string,
      "profilePicture": string  <- FILENAME ONLY. Prepend BACKEND_URL to get image URL.
    },
    "bio": string,           <- default empty string
    "currentPost": string,   <- default empty string (current job title)
    "pastWork": [{ "_id": string, "company": string, "position": string, "years": string }],
    "education": [{ "_id": string, "school": string, "degree": string, "fieldOfStudy": string }],
    "skills": [{ "_id": string, "skill": string, "priority": number }],
    "__v": number
  }
ERROR STATUSES: 401, 500
FRONTEND ACTION: Use to hydrate global current user state on app load.
`

---

### POST /user_update  - Update Account Fields

`
AUTH REQUIRED:  YES
BODY (JSON):
  {
    "newUserData": {
      "username": string  (optional, must be unique)
      "email": string     (optional, must be unique)
      "name": string      (optional)
      "password": string  (optional, auto-hashed by backend)
    }
  }
HEADERS:        Authorization: Bearer <token>, Content-Type: application/json
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "User updated successfully" }
ERROR STATUSES: 400, 401, 500
ERROR RESPONSE (400): { "message": "Username or email already exists" }
FRONTEND ACTION: On 200, refresh current user state.
WARNING: Backend uses Object.assign(user, newUserData). No field whitelist.
         Do NOT send extra fields in newUserData.
`

---

### POST /update_profile_data  - Update Bio/Work/Education/Skills

`
AUTH REQUIRED:  YES
BODY (JSON):
  {
    "newProfileData": {
      "bio": string                                                    (optional)
      "currentPost": string                                            (optional)
      "pastWork": [{ "company": string, "position": string, "years": string }]
      "education": [{ "school": string, "degree": string, "fieldOfStudy": string }]
      "skills": [{ "skill": string, "priority": number }]
    }
  }
HEADERS:        Authorization: Bearer <token>, Content-Type: application/json
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Profile data updated successfully" }
ERROR STATUSES: 401, 404, 500
ERROR RESPONSE (404): { "message": "Profile not found" }
CRITICAL: Arrays are REPLACED entirely on save.
          Frontend must send the complete updated array every time, not just new entries.
`

---

### POST /update_profile_pic  - Upload Profile Picture

`
AUTH REQUIRED:  YES
BODY:           multipart/form-data, field name "profile_picture" = image file
HEADERS:        Authorization: Bearer <token>
                (Content-Type: multipart/form-data set automatically by browser)
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Profile picture updated successfully" }
  Response does NOT include the new filename.
ERROR STATUSES: 400, 401, 500
ERROR RESPONSE (400): { "message": "No file uploaded" }
FRONTEND ACTION: On 200, re-fetch GET /get_user_profile to get new profilePicture filename.
                 Full URL: NEXT_PUBLIC_BACKEND_URL + "/" + profilePicture
`

---

### GET /user/search  - Search Users (Public)

`
AUTH REQUIRED:  NO
QUERY PARAMS:
  query   string  Matches name and username (case-insensitive regex). Default = "" (all users)
  page    number  Default 1
  limit   number  Default 10
SUCCESS STATUS: 200
SUCCESS RESPONSE (array):
  [
    {
      "_id": string,
      "userId": { "_id": string, "name": string, "username": string, "email": string, "profilePicture": string },
      "bio": string,
      "currentPost": string,
      "pastWork": array,
      "education": array,
      "skills": array
    }
  ]
ERROR STATUSES: 500
FRONTEND ACTION: Find People / user search page.
`

---

### GET /user/profile/:id  - Other User Profile

`
AUTH REQUIRED:  YES
URL PARAM:      :id = the USER document _id (NOT the Profile _id)
HEADERS:        Authorization: Bearer <token>
SUCCESS STATUS: 200
SUCCESS RESPONSE: Same structure as GET /get_user_profile
ERROR STATUSES: 401, 404, 500
ERROR RESPONSE (404): { "message": "Profile not found" }
CRITICAL: :id is user._id. When you have a Profile object, user ID is at profile.userId._id.
`

---

### GET /user/download_resume  - Download Profile PDF (Public)

`
AUTH REQUIRED:  NO
QUERY PARAMS:   id = USER document _id
SUCCESS STATUS: 200
SUCCESS RESPONSE: Binary PDF stream
  Content-Type: application/pdf
  Content-Disposition: attachment; filename=<name>_resume.pdf
FRONTEND ACTION:
  window.open(BACKEND_URL + "/user/download_resume?id=" + userId)
  Do NOT use the API client. This is a binary stream.
`

---

### POST /user/connections/send_connection_request  - Send Request

`
AUTH REQUIRED:  YES
BODY (JSON):    { "connectionId": string }  <- USER _id of target
HEADERS:        Authorization: Bearer <token>, Content-Type: application/json
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Connection request sent successfully" }
ERROR STATUSES: 400, 401, 404, 500
ERROR RESPONSE (400):
  { "message": "You can't send connection request to yourself" }
  { "message": "Connection request already sent" }
ERROR RESPONSE (404):
  { "mesage": "Target User not found" }   <- TYPO: mesage (missing s)
FRONTEND ACTION: On 200, show "Request Sent" on button.
`

---

### POST /user/connections/connection_requests  - My Outgoing Requests

`
AUTH REQUIRED:  YES
BODY:           None required
HEADERS:        Authorization: Bearer <token>
SUCCESS STATUS: 200
SUCCESS RESPONSE:
  {
    "reqs": [
      {
        "_id": string,
        "userId": string,
        "connectionId": { "_id": string, "name": string, "email": string, "username": string, "profilePicture": string },
        "status_accepted": boolean or null
      }
    ]
  }
STATUS VALUES: null = pending, true = accepted, false = rejected
`

---

### POST /user/connections  - My Incoming Requests

`
AUTH REQUIRED:  YES
BODY:           None required
HEADERS:        Authorization: Bearer <token>
SUCCESS STATUS: 200
SUCCESS RESPONSE (array):
  [
    {
      "_id": string,
      "userId": { "_id": string, "name": string, "email": string, "username": string, "profilePicture": string },
      "connectionId": string,
      "status_accepted": boolean or null
    }
  ]
FRONTEND ACTION: Filter status_accepted === null for pending. true for accepted.
`

---

### POST /user/connections/accept_connection  - Accept or Reject

`
AUTH REQUIRED:  YES
BODY (JSON):    { "requestId": string, "action": string }
  action = "accept" to accept. Any other value = reject (sets status_accepted = false).
HEADERS:        Authorization: Bearer <token>, Content-Type: application/json
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Connection request accepted successfully" }
  SAME message for both accept and reject. Do not display this raw message.
ERROR STATUSES: 401, 404, 500
ERROR RESPONSE (404): { "message": "Connection request not found" }
FRONTEND ACTION: Infer result from the action you sent. Refresh on 200.
`

---

### POST /upload_post  - Create Post

`
AUTH REQUIRED:  YES
BODY:           multipart/form-data
  "body"    string  Post text (required if no media)
  "media"   file    Optional media attachment
  At least one of body or media required.
HEADERS:        Authorization: Bearer <token>
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Post created successfully" }
  Does not return post ID. Post queued for Elasticsearch indexing.
ERROR STATUSES: 400, 401, 500
ERROR RESPONSE (400): { "message": "Post body or media is required" }
FRONTEND ACTION: On 200, re-fetch feed or append post to local state.
WARNING: Media upload will CRASH due to crypto not imported in posts.routes.js.
         Text-only posts work fine. See Section 18 Problem 14.
`

---

### POST /schedule_post  - Schedule Post

`
AUTH REQUIRED:  YES
BODY:           multipart/form-data
  "body": string             Post text
  "scheduledTime": string    ISO 8601 future datetime
  "media": file              Optional
HEADERS:        Authorization: Bearer <token>
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Post scheduled successfully!" }
ERROR STATUSES: 400, 401, 500
ERROR RESPONSE (400): { "message": "Scheduled time must be in the future" }
BEHAVIOR:
  Post saved to MongoDB with active=false.
  BullMQ job fires at scheduled time, sets active=true.
  If user exceeds MAX_POSTS_PER_HOUR: job re-delayed 1 hour, Slack DM sent.
  Scheduled (inactive) posts do NOT appear in /feed or /user/posts.
  There is NO API to list scheduled posts.
`

---

### GET /user/posts  - My Posts

`
AUTH REQUIRED:  YES
QUERY PARAMS:   page (default 1), limit (default 10)
HEADERS:        Authorization: Bearer <token>
SUCCESS STATUS: 200
SUCCESS RESPONSE (array):
  [
    {
      "_id": string,
      "userId": { "_id": string, "username": string, "name": string, "profilePicture": string },
      "body": string,
      "media": string,      <- filename only. "" if no media.
      "fileType": string,   <- MIME subtype e.g. jpeg, png, mp4. "" if no media.
      "active": boolean,    <- always true in this response
      "createdAt": string,  <- ISO 8601
      "updatedAt": string,
      "__v": number
    }
  ]
`

---

### GET /feed  - Connection Feed

`
AUTH REQUIRED:  YES
QUERY PARAMS:   page (default 1), limit (default 10)
HEADERS:        Authorization: Bearer <token>
SUCCESS STATUS: 200
SUCCESS RESPONSE (array): Same structure as /user/posts
FEED ALGORITHM:
  Gets all accepted connections (status_accepted=true, either direction).
  Includes own posts. Returns active posts, newest first.
`

---

### POST /delete_post  - Delete Post

`
AUTH REQUIRED:  YES
BODY (JSON):    { "postId": string }
HEADERS:        Authorization: Bearer <token>, Content-Type: application/json
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Post deleted successfully" }
  Also deletes all Comments. Does NOT delete Like records or media file.
ERROR STATUSES: 400, 401, 500
ERROR RESPONSE (400):
  { "message": "Invalid Post ID" }
  { "message": "Post not found" }
  { "message": "You are not authorized to delete this post" }
FRONTEND ACTION: Only show delete button if post.userId._id === currentUser._id.
`

---

### POST /post/comment  - Add Comment

`
AUTH REQUIRED:  YES
BODY (JSON):    { "post_id": string, "comment": string }
HEADERS:        Authorization: Bearer <token>, Content-Type: application/json
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Commented successfully" }
  Does not return the new comment document.
ERROR STATUSES: 400, 401, 500
ERROR RESPONSE (400):
  { "message": "All fields are required" }
  { "message": "Post not found" }
FRONTEND ACTION: On 200, re-fetch /post/all_comments or optimistically append.
`

---

### GET /post/all_comments  - Get Comments

`
AUTH REQUIRED:  YES
QUERY PARAMS:   post_id = Post _id (required)
HEADERS:        Authorization: Bearer <token>
SUCCESS STATUS: 200
SUCCESS RESPONSE (array, sorted createdAt DESC):
  [
    {
      "_id": string,
      "userId": { "_id": string, "username": string, "name": string, "profilePicture": string },
      "postId": string,
      "body": string,
      "createdAt": string,
      "updatedAt": string,
      "__v": number
    }
  ]
NOTE: No pagination. Returns ALL comments for a post.
`

---

### POST /post/delete_comment  - Delete Comment

`
AUTH REQUIRED:  YES
BODY (JSON):    { "post_id": string, "commentId": string }
HEADERS:        Authorization: Bearer <token>, Content-Type: application/json
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Comment deleted successfully" }
ERROR STATUSES: 400, 401, 500
ERROR RESPONSE (400):
  { "message": "Post not found" }
  { "message": "Comment not found" }
  { "message": "You are not authorized to delete this comment" }
PERMISSION: Comment owner OR post owner.
`

---

### POST /post/like  - Like Post (LIKE ONLY - no unlike)

`
AUTH REQUIRED:  YES
BODY (JSON):    { "postId": string }
HEADERS:        Authorization: Bearer <token>, Content-Type: application/json
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Post liked successfully" }
ERROR STATUSES: 400, 401, 500
ERROR RESPONSE (400):
  { "message": "Post not found" }
  { "message": "You have already liked this post" }

CRITICAL: NO unlike endpoint. NO like count. NO list of likers.
          400 "already liked" can be used to show the liked state.
`

---

### GET /search_posts  - Search Posts via Elasticsearch (Public)

`
AUTH REQUIRED:  NO
QUERY PARAMS:   query = search term (required, matches post body text)
SUCCESS STATUS: 200
SUCCESS RESPONSE (array):
  [
    {
      "_id": string,
      "body": string,
      "userId": string,       <- RAW STRING ID. Not populated. No author name.
      "publishedAt": string
    }
  ]
ERROR STATUSES: 400, 500
ERROR RESPONSE (400): { "message": "Please provide a search query" }
NOTE: To show author, make follow-up call to GET /user/profile/:userId.
`

---

### POST /admin/search/reindex  - Reindex Elasticsearch

`
AUTH REQUIRED:  YES (any authenticated user - no admin restriction)
BODY:           None
HEADERS:        Authorization: Bearer <token>
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Successfully queued X posts to be reindexed!" }
`

---

### GET /slack/connect  - Start Slack OAuth

`
AUTH REQUIRED:  YES (pass token as ?token= because browsers cannot set headers on redirects)
QUERY PARAMS:   token = JWT token
SUCCESS STATUS: 302 Redirect (not JSON)
REDIRECT TARGET: https://slack.com/oauth/v2/authorize?client_id=...&user_scope=chat:write&state=<token>
FRONTEND ACTION:
  window.open(BACKEND_URL + "/slack/connect?token=" + token)
  Do NOT use fetch(). This is a redirect flow.
`

---

### GET /slack/callback  - Slack OAuth Callback

`
AUTH REQUIRED:  NO (called by Slack server, not by frontend)
QUERY PARAMS:   code (from Slack), state (the JWT token passed earlier)
SUCCESS STATUS: 200 - PLAIN TEXT response, not JSON
SUCCESS RESPONSE: "Slack connected successfully! You can close this window."
ERROR RESPONSE: "Failed to connect Slack." or "Error connecting to Slack."
NOTE: Must be registered as OAuth redirect URI in Slack app settings.
      No redirect back to frontend. User closes window manually.
`

---

### POST /slack/disconnect  - Disconnect Slack

`
AUTH REQUIRED:  YES
BODY:           None
HEADERS:        Authorization: Bearer <token>
SUCCESS STATUS: 200
SUCCESS RESPONSE: { "message": "Slack disconnected successfully" }
`


---

## 3. AUTHENTICATION FLOW

### Signup
1. POST /register with { name, email, password, username }
2. Backend hashes password (bcrypt 10 rounds), creates User + Profile documents
3. Response 200 { message: "User created successfully" }
4. No token issued at signup. Redirect to /login.

### Login
1. POST /login with { email, password }
2. Backend checks user.active, compares password, generates JWT (7d expiry)
3. JWT stored in database on user.token - single-session mechanism
4. Response: { token, message }
5. Frontend stores token, redirects to /feed

### Logout
1. POST /logout with Authorization: Bearer <token>
2. Backend sets user.token = "" in MongoDB
3. Token immediately invalid even though JWT signature valid for 7 days
4. Frontend deletes token, redirects to /login

### Token Transport
The authenticate middleware checks in this order:
1. Authorization: Bearer <token> header  <- ALWAYS use this for API calls
2. req.body.token
3. req.query.token  <- Only for redirect flows like Slack OAuth

### Session Check on App Load
1. Check if token exists in storage
2. Call GET /get_user_profile with token
3. 200 = valid session
4. 401 = expired/invalid -> delete token -> redirect to /login

### 401 Response Messages
`
{ "message": "No Token" }
{ "message": "User not found" }
{ "message": "Invalid or expired token" }
{ "message": "jwt expired" }
{ "message": "invalid signature" }
`

### Protected Routes (require token)
POST /logout, POST /user_update, GET /get_user_profile, POST /update_profile_data,
POST /update_profile_pic, GET /user/profile/:id, POST /user/connections/*,
GET /slack/connect, POST /slack/disconnect, POST /upload_post, POST /schedule_post,
GET /user/posts, GET /feed, POST /delete_post, POST /post/comment,
GET /post/all_comments, POST /post/delete_comment, POST /post/like,
POST /admin/search/reindex

### Public Routes (no token required)
GET /, POST /register, POST /login, GET /user/search, GET /user/download_resume,
GET /search_posts, GET /slack/callback, all files under /uploads/

---

## 4. USER FEATURES

| Feature | Endpoint |
|---|---|
| Own profile | GET /get_user_profile |
| Other user profile | GET /user/profile/:userId |
| Update account (name/email/username/password) | POST /user_update |
| Update bio/work/education/skills | POST /update_profile_data |
| Upload profile picture | POST /update_profile_pic |
| Search users | GET /user/search?query= |
| Send connection request | POST /user/connections/send_connection_request |
| View outgoing requests | POST /user/connections/connection_requests |
| View incoming requests | POST /user/connections |
| Accept or reject request | POST /user/connections/accept_connection |
| Download profile PDF | GET /user/download_resume?id= |

### Followers / Following - NOT SUPPORTED
No follower or following system exists in the backend.

### Connection Status Values
- status_accepted: null = pending
- status_accepted: true = accepted
- status_accepted: false = rejected

No endpoint to REMOVE an accepted connection.

---

## 5. POST FEATURES

| Feature | Status | Endpoint |
|---|---|---|
| Create post (immediate) | EXISTS | POST /upload_post |
| Schedule post | EXISTS | POST /schedule_post |
| Connection feed | EXISTS | GET /feed |
| My posts | EXISTS | GET /user/posts |
| Single post by ID | DOES NOT EXIST | - |
| Edit post | DOES NOT EXIST | - |
| Delete post | EXISTS | POST /delete_post |
| Like post | EXISTS (like only) | POST /post/like |
| Unlike post | DOES NOT EXIST | - |
| Like count | DOES NOT EXIST | - |
| Users who liked | DOES NOT EXIST | - |
| Add comment | EXISTS | POST /post/comment |
| Get comments | EXISTS | GET /post/all_comments |
| Delete comment | EXISTS | POST /post/delete_comment |
| Edit comment | DOES NOT EXIST | - |
| Search posts | EXISTS (Elasticsearch) | GET /search_posts |
| List scheduled posts | DOES NOT EXIST | - |

---

## 6. SLACK INTEGRATION

### OAuth Flow
`
Frontend: window.open(BACKEND_URL + "/slack/connect?token=" + jwt)
  -> Backend: 302 redirect to Slack OAuth
    -> User authorizes
      -> Slack: GET /slack/callback?code=...&state=<jwt>
        -> Backend: exchanges code via Slack API
          -> Saves slackToken + slackUserId to User document
            -> Plain text: "Slack connected successfully! You can close this window."
`

### Connection Status - MISSING
GET /get_user_profile does NOT return slackToken or slackUserId.
There is no API to check if Slack is connected.
Track connection state locally on the frontend after connect/disconnect.

### Slack Notification Trigger
Only one event triggers a Slack DM:
- Scheduled post rate limit exceeded (>MAX_POSTS_PER_HOUR in current hour)
- Message is hardcoded in postWorker.js (English/Urdu mix)
- Deduplicated per user per hour via Redis

### OAuth Redirect URI Registration
Must be set in Slack app settings: http://localhost:8080/slack/callback

---

## 7. BULL BOARD

| Item | Value |
|---|---|
| URL | http://localhost:8080/admin/queues |
| Authentication | NONE - completely unprotected |
| Authorization | NONE |
| Queues visible | PostQueue only (ElasticQueue NOT registered) |
| Access method | window.open() or direct link |

WARNING: Bull Board has no authentication. Do not deploy without adding middleware protection.

---

## 8. FILE UPLOADS

### Upload Config
Both route files use multer.diskStorage with destination uploads/.
Filename format: {Date.now()}-{16-hex-bytes}{original-filename}
Example: 1748123456789-a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6photo.jpg

### Profile Picture
- Endpoint: POST /update_profile_pic
- Field name: profile_picture
- Accepted types: No validation - any file type accepted
- Size limit: No multer limit (Express 50MB body limit)
- Response does NOT include new filename

### Post Media
- Endpoint: POST /upload_post or /schedule_post
- Field name: media
- Accepted types: No validation
- post.fileType stores MIME subtype (jpeg, png, mp4)

### URL Construction
Static files served: app.use(express.static("uploads/"))
`
Full URL = NEXT_PUBLIC_BACKEND_URL + "/" + filename
"default.jpg" -> "http://localhost:8080/default.jpg"
"" (empty)    -> Do NOT construct URL. No media attached.
`

### No Cleanup
- Deleting a post does NOT delete its media file from disk
- Uploading a new profile picture does NOT delete the old one
- No file delete endpoint exists

---

## 9. PAGINATION / SEARCH / FILTERING

### Endpoints with Pagination
| Endpoint | page | limit | default |
|---|---|---|---|
| GET /user/search | yes | yes | 1, 10 |
| GET /user/posts | yes | yes | 1, 10 |
| GET /feed | yes | yes | 1, 10 |

Mechanism: skip = (page - 1) * limit
NO total count returned. Frontend cannot know how many pages exist.

### Endpoints WITHOUT Pagination
- GET /post/all_comments - returns ALL comments
- POST /user/connections - returns ALL incoming requests
- POST /user/connections/connection_requests - returns ALL outgoing requests
- GET /search_posts - Elasticsearch default (10 results)

### Detecting Last Page
`
if (data.length < limit) -> last page reached
if (data.length === 0)   -> no results or beyond last page
if (data.length === limit) -> may have more - show Load More
`

### Sorting (all fixed, no user control)
- /user/posts: createdAt DESC
- /feed: createdAt DESC
- /post/all_comments: createdAt DESC
- /user/search: MongoDB natural order
- /search_posts: Elasticsearch relevance score

---

## 10. AUTHORIZATION / SECURITY

### Backend-Enforced Rules
| Rule | Enforcement |
|---|---|
| Only authenticated users can post/comment/like | authenticate middleware |
| Only post owner can delete post | post.userId.toString() check |
| Comment owner OR post owner can delete comment | combined check |
| Only request recipient can accept/reject | connectionId: user._id check |
| Cannot like same post twice | existingLike check |
| Duplicate connection requests blocked | existingReq check |

### NOT Enforced by Backend
| Concern | Status |
|---|---|
| Admin-only routes | NONE - reindex and Bull Board unprotected |
| File type validation | NONE |

### Frontend UI Hints (backend still enforces)
| Element | Show when |
|---|---|
| Delete Post button | post.userId._id === currentUser._id |
| Delete Comment button | comment.userId._id === currentUser._id OR post.userId._id === currentUser._id |
| Connect button | User is not yourself, not already connected or pending |
| Accept/Reject buttons | Only on incoming requests |
| Like button (disabled after like) | Track locally - no API state |
| Slack Connect/Disconnect toggle | Track locally - no API status |

The frontend is NEVER the security boundary. UI hints are for UX only.

---

## 11. FRONTEND PAGE MAP

### /login - Login
`
AUTH REQUIRED: NO (redirect to /feed if already authenticated)
API: POST /login
COMPONENTS: LoginForm (email, password)
EMPTY: n/a
ERROR: All login 400 messages
SUCCESS: Redirect to /feed
`

### /register - Register
`
AUTH REQUIRED: NO
API: POST /register
COMPONENTS: RegisterForm (name, username, email, password)
SUCCESS: Redirect to /login
`

### /feed - Home Feed
`
AUTH REQUIRED: YES
API: GET /feed?page=&limit=
COMPONENTS: PostCard, LoadMoreButton
USER ACTIONS: Like, comment, delete own post, navigate to author profile
LOADING: Skeleton cards
EMPTY: "Connect with people to see posts"
`

### /posts/create - Create Post
`
AUTH REQUIRED: YES
API: POST /upload_post, POST /schedule_post
COMPONENTS: PostForm (textarea, file input, datetime picker, immediate/schedule toggle)
SUCCESS: Toast + redirect
`

### /profile - Own Profile
`
AUTH REQUIRED: YES
API: GET /get_user_profile, GET /user/posts, GET /user/download_resume
COMPONENTS: ProfileHeader, PostList, ResumeDownloadButton
USER ACTIONS: Edit profile, upload picture, download resume, paginate posts
`

### /profile/edit - Edit Profile
`
AUTH REQUIRED: YES
API: GET /get_user_profile, POST /user_update, POST /update_profile_data, POST /update_profile_pic
COMPONENTS: AccountForm, BioForm, PastWorkManager, EducationManager, SkillsManager, PictureUpload
CRITICAL: Arrays are REPLACED entirely. Frontend must always send complete arrays.
`

### /profile/[userId] - Other User Profile
`
AUTH REQUIRED: YES
API: GET /user/profile/:id, GET /user/download_resume, POST /user/connections/send_connection_request
NOTE: Cannot show other user's posts. /user/posts only returns your own posts.
ERROR: 404 "Profile not found"
`

### /people - Find People
`
AUTH REQUIRED: NO (endpoint public, page can require auth for UX)
API: GET /user/search?query=&page=&limit=
COMPONENTS: SearchBar, UserCard with Connect button
`

### /connections - My Connections
`
AUTH REQUIRED: YES
API: POST /user/connections/connection_requests
COMPONENTS: ConnectionCard, filter tabs (Pending/Accepted/Rejected)
`

### /connections/requests - Incoming Requests
`
AUTH REQUIRED: YES
API: POST /user/connections, POST /user/connections/accept_connection
COMPONENTS: RequestCard with Accept/Reject buttons
FILTER: status_accepted === null (pending)
`

### /search - Search Posts
`
AUTH REQUIRED: NO
API: GET /search_posts?query=
NOTE: userId in results is raw string. Author name requires follow-up call.
`

### /settings - Settings / Slack
`
AUTH REQUIRED: YES
API: GET /slack/connect (window.open), POST /slack/disconnect
NOTE: No API to check current Slack status. Track locally.
`

### Bull Board (/admin/queues)
This URL is served entirely by the backend Express server.
Link to it from the frontend: window.open("http://localhost:8080/admin/queues")
Do NOT create a Next.js page for this URL.

---

## 12. COMPONENT / API MAPPING

PostCard:
  - GET /feed
  - GET /user/posts
  - POST /post/like
  - POST /post/comment
  - GET /post/all_comments
  - POST /post/delete_comment
  - POST /delete_post

ProfileHeader:
  - GET /get_user_profile (own profile)
  - GET /user/profile/:id (other user)
  - POST /update_profile_pic (own only)

ProfileEditForm:
  - GET /get_user_profile
  - POST /user_update
  - POST /update_profile_data

ConnectButton:
  - POST /user/connections/send_connection_request

ConnectionRequestCard:
  - POST /user/connections
  - POST /user/connections/accept_connection

ConnectionListCard:
  - POST /user/connections/connection_requests

UserSearchCard:
  - GET /user/search
  - POST /user/connections/send_connection_request

ResumeDownloadButton:
  - GET /user/download_resume?id=<userId> (anchor tag or window.open, not fetch)

SlackSettings:
  - window.open: GET /slack/connect?token=<jwt>
  - POST /slack/disconnect

PostSearchBar:
  - GET /search_posts?query=

PeopleSearchBar:
  - GET /user/search?query=

CreatePostForm:
  - POST /upload_post

SchedulePostForm:
  - POST /schedule_post

BullBoardLink:
  - window.open("http://localhost:8080/admin/queues")

---

## 13. STATE MANAGEMENT REQUIREMENTS

Recommendation: Use React Context API. The app is not complex enough for Redux.
SWR or React Query recommended for data fetching and caching.

### GLOBAL STATE (AuthContext)
`
token: string or null
currentUser: {
  _id: string,                   <- Profile document ID
  userId: {
    _id: string,
    name: string,
    email: string,
    username: string,
    profilePicture: string,
  },
  bio: string,
  currentPost: string,
  pastWork: [],
  education: [],
  skills: [],
} or null
isLoading: boolean
isAuthenticated: boolean
slackConnected: boolean          <- local only, no API backing
login(token): void               <- save token, fetch profile, set state
logout(): void                   <- POST /logout, clear token, clear state
refreshCurrentUser(): void       <- re-fetch GET /get_user_profile
setSlackConnected(v): void
`

### PAGE STATE (local useState)
`
Feed: feedPosts, feedPage, feedHasMore, feedLoading
Profile: myPosts, myPostsPage, myPostsHasMore
Search: searchQuery, searchResults, searchPage, searchLoading
Connections: outgoingRequests, incomingRequests, connectionsLoading
PostSearch: postQuery, postResults, postSearchLoading
`

### COMPONENT STATE (local useState)
`
PostCard: showComments, comments, commentsLoading, commentInput, liked (local flag)
ProfileEditForm: formData, isSubmitting, successMessage, errorMessage
ConnectButton: isLoading, requestSent
SlackSettings: isDisconnecting
Modals: isOpen
`

---

## 14. API CLIENT REQUIREMENTS

### File Structure
`
frontend/src/lib/api/
  client.js      <- base fetch wrapper with auth
  auth.js        <- register, login, logout
  users.js       <- profile, update, search, connections
  posts.js       <- createPost, schedulePost, feed, myPosts, deletePost
  comments.js    <- getComments, addComment, deleteComment
  likes.js       <- likePost
  slack.js       <- disconnect (connect = window.open, not fetch)
  search.js      <- searchPosts (ES), searchUsers
`

### Base Client
`javascript
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export const apiClient = async (endpoint, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(BASE_URL + endpoint, { ...options, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data && (data.message || data.mesage)) || 'An error occurred';
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }
  return data;
};
`

### Special Cases
- File uploads: pass FormData directly. Do NOT set Content-Type header.
- PDF download: use window.open() not fetch.
- Slack connect: use window.open() not fetch.

---

## 15. FRONTEND ROUTE PROTECTION

### Public (no auth needed)
/login, /register

### Protected (redirect to /login if no token)
/feed, /posts/create, /profile, /profile/edit, /profile/[userId],
/connections, /connections/requests, /search, /people, /settings

### _app.js Pattern
`javascript
const publicRoutes = ['/login', '/register'];

useEffect(() => {
  if (!isLoading && !isAuthenticated && !publicRoutes.includes(router.pathname)) {
    router.push('/login?redirect=' + router.pathname);
  }
  if (!isLoading && isAuthenticated && publicRoutes.includes(router.pathname)) {
    router.push('/feed');
  }
}, [isAuthenticated, isLoading, router.pathname]);
`

### Handling 401 from API
`javascript
if (err.status === 401) {
  localStorage.removeItem('token');
  router.push('/login');
}
`

---

## 16. FRONTEND ENVIRONMENT VARIABLES

### NEXT_PUBLIC_* (exposed to browser - ONLY ONE NEEDED)
`
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
`

Used for:
- API calls: NEXT_PUBLIC_BACKEND_URL + "/feed"
- File URLs: NEXT_PUBLIC_BACKEND_URL + "/" + profilePicture
- Slack connect: NEXT_PUBLIC_BACKEND_URL + "/slack/connect?token=..."
- PDF download: NEXT_PUBLIC_BACKEND_URL + "/user/download_resume?id=..."
- Bull Board: NEXT_PUBLIC_BACKEND_URL + "/admin/queues"

### Never Put These in Frontend .env
MONGO_URL, JWT_SECRET, REDIS_HOST, REDIS_PORT, ELASTIC_URL,
SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, MAX_POSTS_PER_HOUR, RATELIMIT_*
These belong only in backend/.env.

---

## 17. MISSING / UNSUPPORTED FEATURES

### SUPPORTED
Registration, login, logout, own profile, edit profile, profile picture upload,
view other user profile, search users, send/view/accept/reject connections,
create post, schedule post, feed, own posts, delete post, add comment, view comments,
delete comment, like post, search posts (Elasticsearch), Slack OAuth,
Bull Board access, PDF resume download

### PARTIALLY SUPPORTED
| Feature | What Works | What's Missing |
|---|---|---|
| Likes | Like a post | Unlike, like count, list of likers, check if liked |
| Slack | Connect + disconnect | Status check API (no field returned in GET profile) |
| Connections | Send/view/accept/reject | Remove accepted connection, check if specific user connected |
| Post search | Full-text search | userId not populated, no date/user filters |
| Pagination | page/limit on 3 endpoints | No total count |

### NOT SUPPORTED
| Feature | Required Backend Change |
|---|---|
| Unlike post | New endpoint or toggle logic |
| Like count per post | Return count in post response |
| Users who liked | GET /post/:id/likes |
| Get single post by ID | GET /posts/:id |
| Edit post | PUT /posts/:id |
| Edit comment | PUT /comments/:id |
| Other user's posts | Modify /user/posts to accept userId param |
| Followers / Following | New Follow model + follow/unfollow endpoints |
| In-app notifications | New Notification model + polling or WebSocket |
| Remove accepted connection | DELETE endpoint |
| List scheduled posts | GET /user/posts?active=false |
| Cancel scheduled post | Delete BullMQ job by ID |
| Deactivate account | POST /user/deactivate |

---

## 18. POTENTIAL INTEGRATION PROBLEMS

### PROBLEM 1 - Typos in Response Fields (Severity: High)
- "sucess" (not "success") in registration error responses
- "successfull" (double l) in login success message
- "mesage" (missing s) in connection 404 response

Mitigation: Check HTTP status codes not string messages. Use .includes() for strings.

---

### PROBLEM 2 - No Slack Connection Status in API (Severity: High)
GET /get_user_profile only populates "name email username profilePicture" from User.
slackToken and slackUserId are not exposed anywhere.
Frontend cannot know if Slack is connected from any API response.

Mitigation: Track locally. Real fix: backend must add slackConnected boolean to profile response.

---

### PROBLEM 3 - acceptCon Same Message for Accept AND Reject (Severity: Medium)
Both accept and reject return "Connection request accepted successfully".
Do not display this message to the user. Track what action was taken.

---

### PROBLEM 4 - CORS Completely Open (Severity: Medium - production concern)
app.use(cors()) with no origin restriction. Any domain can call the API.

---

### PROBLEM 5 - Bull Board Completely Unprotected (Severity: High - production concern)
/admin/queues has no authentication middleware. Anyone can access it.

---

### PROBLEM 6 - Self-Connection Bug (Severity: Low)
`javascript
if (user._id === connectionId) ...  // uses === on ObjectId vs string - ALWAYS false
`
A user can send themselves a connection request. The guard never triggers.
Mitigation: Frontend hide "Connect" button on own profile.

---

### PROBLEM 7 - No Total Count in Paginated Responses (Severity: Medium)
Raw arrays only. No { total, data } wrapper. Cannot show "page X of Y".
Mitigation: If response.length < limit -> last page.

---

### PROBLEM 8 - Delete Post Leaves Orphan Like Records (Severity: Low)
POST /delete_post deletes Comments but not Likes. Orphaned Like records accumulate.
No frontend impact.

---

### PROBLEM 9 - GET /post/all_comments Auth Not Used (Severity: Low)
Has authenticate middleware but controller never uses req.user.
Token must still be sent even though it serves no purpose in this endpoint.

---

### PROBLEM 10 - Search Results Have Raw userId (Severity: Medium)
Elasticsearch results have userId as raw string. Author name not available.
Requires follow-up GET /user/profile/:userId call per result (N+1 requests).

---

### PROBLEM 11 - File URLs Require Manual Construction (Severity: Medium)
All API responses return only filename. Frontend must prepend BACKEND_URL.
`javascript
// Wrong:  <img src={post.media} />
// Correct: <img src={post.media ? BACKEND_URL + "/" + post.media : placeholder} />
`

---

### PROBLEM 12 - POST Used for GET-Semantics Endpoints (Severity: Medium)
- POST /user/connections - fetches data (should be GET)
- POST /user/connections/connection_requests - fetches data (should be GET)
Frontend must use POST regardless of semantic mismatch.

---

### PROBLEM 13 - Object.assign Replaces Arrays Entirely (Severity: High - data loss risk)
Object.assign(profile, newProfileData) in /update_profile_data.
Sending { skills: [newSkill] } destroys all previous skills.
Always read current profile, modify locally, send COMPLETE arrays on save.

---

### PROBLEM 14 - crypto Not Imported in posts.routes.js (Severity: HIGH - runtime crash)
posts.routes.js line 12: crypto.randomBytes(16)
crypto is NOT imported in posts.routes.js (only in user.routes.js).
Any POST /upload_post or POST /schedule_post WITH a media file will crash:
ReferenceError: crypto is not defined

Text-only posts (no media) work fine.
This is a backend bug. Cannot be fixed on the frontend.
Backend fix: add "import crypto from 'crypto';" at top of posts.routes.js.

---

### PROBLEM 15 - No Field Whitelist on User Update (Severity: Medium)
Object.assign(user, newUserData) allows any field to be written to the user document.
Never forward arbitrary user input directly as newUserData.

---

### PROBLEM 16 - ElasticQueue Not in Bull Board (Severity: Low)
ElasticQueue is functional but not registered in Bull Board.
Cannot monitor Elasticsearch indexing jobs from the UI.

---

## 19. EXACT FRONTEND CONTRACT

### 1. Authentication Contract
`
Token storage key:  "token" in localStorage
Token format:       Raw JWT (no "Bearer " prefix stored)
Token send:         Authorization: Bearer <token> header
Token receive:      POST /login -> response.token
Token invalidation: POST /logout sets server token to ""; delete from storage
Session check:      GET /get_user_profile: 200=valid, 401=invalid
JWT expiry:         7 days (single-session system invalidates on re-login)
`

### 2. User Contract
`javascript
// User object as populated in Profile responses
{
  _id: string,             // User document ID (MongoDB ObjectId as string)
  name: string,
  email: string,
  username: string,
  profilePicture: string,  // FILENAME ONLY. Full URL = BACKEND_URL + "/" + profilePicture
}
// Fields NEVER returned: password, token, slackToken, slackUserId, active, createdAt
`

### 3. Profile Contract
`javascript
{
  _id: string,             // Profile document ID
  userId: {
    _id: string,
    name: string,
    email: string,
    username: string,
    profilePicture: string,   // filename only
  },
  bio: string,             // default ""
  currentPost: string,     // default "" (current job title)
  pastWork: [
    { _id: string, company: string, position: string, years: string }
  ],
  education: [
    { _id: string, school: string, degree: string, fieldOfStudy: string }
  ],
  skills: [
    { _id: string, skill: string, priority: number }
  ],
  __v: number,
}
`

### 4. Post Contract
`javascript
// From GET /feed or GET /user/posts:
{
  _id: string,
  userId: {
    _id: string,
    username: string,
    name: string,
    profilePicture: string,   // filename only
  },
  body: string,
  media: string,      // filename only. "" if no media.
  fileType: string,   // MIME subtype (jpeg, png, mp4). "" if no media.
  active: boolean,    // always true in these responses
  createdAt: string,  // ISO 8601
  updatedAt: string,
  __v: number,
}

// From GET /search_posts:
{
  _id: string,
  body: string,
  userId: string,      // RAW STRING - not populated. No author name.
  publishedAt: string, // ISO 8601
}
`

### 5. Comment Contract
`javascript
{
  _id: string,
  userId: {
    _id: string,
    username: string,
    name: string,
    profilePicture: string,   // filename only
  },
  postId: string,
  body: string,
  createdAt: string,   // ISO 8601
  updatedAt: string,
  __v: number,
}
`

### 6. Like Contract
`
No Like object is returned in any API response.
POST /post/like -> 200 { message: "Post liked successfully" }
POST /post/like -> 400 { message: "You have already liked this post" }
No unlike endpoint. No like count. No list of likers.
Track liked state locally.
On 400 "already liked" -> mark post as liked in local state.
`

### 7. Connection Contract
`javascript
// Outgoing request (from POST /user/connections/connection_requests)
{
  _id: string,
  userId: string,   // YOUR user ID
  connectionId: {
    _id: string,
    name: string,
    email: string,
    username: string,
    profilePicture: string,
  },
  status_accepted: boolean or null,   // null=pending, true=accepted, false=rejected
}

// Incoming request (from POST /user/connections)
{
  _id: string,
  userId: {
    _id: string,
    name: string,
    email: string,
    username: string,
    profilePicture: string,
  },
  connectionId: string,   // YOUR user ID
  status_accepted: boolean or null,
}

// Accept/Reject:
POST /user/connections/accept_connection
Body: { requestId: string, action: "accept" }  <- to accept
Body: { requestId: string, action: "reject" }  <- to reject (any non-"accept" string works)
`

### 8. Slack Contract
`
Connect: window.open(BACKEND_URL + "/slack/connect?token=" + token)
  -> Slack OAuth flow
  -> Callback returns plain text: "Slack connected successfully! You can close this window."
  -> NO JSON response. User closes window.
  -> No API to verify connection. Track locally.

Disconnect: POST /slack/disconnect
  Authorization: Bearer <token>
  -> 200 { message: "Slack disconnected successfully" }

Notification trigger: scheduled post exceeds MAX_POSTS_PER_HOUR
  -> Backend sends Slack DM to user's slackUserId
  -> Deduplicated per user per hour
`

### 9. Bull Board Contract
`
URL: http://localhost:8080/admin/queues
Auth: None required
Access: window.open() or <a href target="_blank">
Queues shown: PostQueue only (ElasticQueue NOT shown)
`

### 10. Upload Contract
`javascript
// Profile Picture:
POST /update_profile_pic
Body: FormData with field "profile_picture" = File
Authorization: Bearer <token>
-> 200 { message: "Profile picture updated successfully" }
-> Call GET /get_user_profile after upload to get new filename
-> Full URL: BACKEND_URL + "/" + profilePicture

// Post Media:
POST /upload_post
Body: FormData with fields "body" (string) and optionally "media" (File)
Authorization: Bearer <token>
-> 200 { message: "Post created successfully" }
-> WARNING: media uploads may crash due to backend bug (Problem 14)

// Display:
const url = filename ? (BACKEND_URL + "/" + filename) : null;
`

### 11. Error Contract
`
Standard error shape: { message: string }
Exception: some registration errors use { sucess: false, message: string }  <- typo

HTTP status usage:
200 = success
400 = bad request, validation, or ownership failure (used where 403 expected)
401 = authentication failure
404 = not found
500 = server error

Global 401 handler:
if (err.status === 401) {
  localStorage.removeItem('token');
  router.push('/login');
}

Never rely on specific message strings for control flow.
Rely on HTTP status codes.
`

### 12. Pagination Contract
`javascript
// Request:
GET /endpoint?page=1&limit=10

// Response: raw array, no wrapper
[item1, item2, ...]

// End-of-list detection:
const isLastPage = data.length < limit;
const isEmpty    = data.length === 0;

// No total count. Cannot display "Page X of Y".

// Load more pattern:
const loadMore = async () => {
  const nextPage = currentPage + 1;
  const newData = await apiClient('/feed?page=' + nextPage + '&limit=10');
  setPosts(prev => [...prev, ...newData]);
  setCurrentPage(nextPage);
  if (newData.length < 10) setHasMore(false);
};
`

---

*Generated from inspection of:*
*server.js, controllers/user.controller.js, controllers/posts.controller.js,*
*routes/user.routes.js, routes/posts.routes.js, middleware/auth.middleware.js,*
*models/user.model.js, models/profile.model.js, models/posts.model.js,*
*models/comments.model.js, models/like.model.js, models/connection.model.js,*
*queue/postQueue.js, queue/postWorker.js, queue/elasticQueue.js, queue/elasticWorker.js,*
*elasticClient.js, package.json, .env, api.http, test_routes.js, docker-compose.yml*
