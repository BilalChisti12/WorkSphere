# The Master Plan: Post Scheduling System

Welcome! You have been given an amazing challenge for your interview. Originally, they asked for an "Email Scheduler." We are going to seamlessly adapt those exact requirements to your LinkedIn Clone as a **"Post Scheduler"**.

This document is written in super simple terms. We will cover what the new tools are, what the translated requirements look like for your app, and exactly how and where to add them to your backend.

---

## 🛠️ Vocabulary: The New Tools (Explained for a 5-Year-Old)

Before we build, let's understand the new toys we are playing with:

1. **Redis**: Imagine a super-fast, temporary scratchpad that lives in your computer's RAM (memory) instead of the hard drive. Because it's in RAM, reading and writing to it takes milliseconds. We use it to count things fast and remember temporary tasks.
2. **BullMQ**: This is a "To-Do List Manager" that runs on top of Redis. If you tell BullMQ, *"Hey, publish this post in 3 days,"* BullMQ will hold onto that task and perfectly execute it in exactly 3 days. It handles retries, delays, and queues without you writing the complex timer logic yourself.
3. **Worker**: A separate mini-program (or part of your program) that constantly watches BullMQ's To-Do list. When a task is ready to be done, the Worker picks it up and does the actual work (like saving the post to the database).
4. **Elasticsearch**: A ridiculously fast and smart search engine. Normal databases (like MongoDB) are like looking through a phone book page by page. Elasticsearch is like Google—you give it a word, and it instantly finds every post containing that word, even if there are millions of them.
5. **OAuth (Slack Integration)**: A secure handshake. Instead of asking for a user's Slack password (which is dangerous), OAuth lets your app redirect the user to Slack. Slack asks the user, *"Do you want to let this LinkedIn Clone send you messages?"* If they click Yes, Slack gives your app a special VIP pass (a "Token") to send them messages.
6. **Idempotency**: A fancy word that means *"doing the exact same thing twice won't break anything or create duplicates."* If the server crashes right as a post is being published, idempotency ensures the post doesn't accidentally get published twice when the server restarts.

---

## 🎯 The Translated Requirements (For Your LinkedIn Clone)

Here is exactly what the interviewers want to see, translated to your app:

### 1️⃣ Core Scheduler Behavior
*   Your API must allow a user to **schedule a Post** for a future date/time.
*   The scheduled post data must be saved in your database. *(Note: The original prompt asked for a Relational DB like MySQL/Postgres. Since you use MongoDB, you should either clarify with the interviewer if MongoDB is acceptable, or we will need to migrate to Postgres using Prisma. Assuming MongoDB for now!)*
*   The actual publishing is handled by **BullMQ delayed jobs** (Absolutely NO cron jobs!).
*   You must implement **Elasticsearch** so users can search through all published posts instantly.
*   You must install a **Live Dashboard** (`bull-board`) so the interviewer can open a URL and watch the queue happening in real-time.
*   **Persistence:** If you restart your Node.js server, the scheduled posts must still go out at the right time.

### 2️⃣ Throughput, Rate Limiting & Concurrency
*   **Worker Concurrency:** Your BullMQ worker must be configured to handle multiple posts at the same time safely.
*   **Minimum Delay:** You must enforce a minimum delay (e.g., 2 seconds) between each post being published to mimic realistic server throttling.
*   **Hourly Rate Limiting:** A single user can only publish a certain number of posts per hour (e.g., `MAX_POSTS_PER_HOUR=5`). This limit must be tracked in **Redis** (not in memory). 
*   **Rescheduling:** If a user schedules their 6th post in an hour, **do not throw an error or drop it**. Instead, automatically delay that post into the next available hour.
*   **Slack Notification (The Cool Feature):** You must add a "Connect Slack" button to your frontend. If the user hits their 5-post hourly limit, your backend must immediately send a real message to their Slack saying: *"Hey! You hit your posting limit. Your next post is delayed to the next hour."*

### 3️⃣ Hard Constraints
*   **NO CRON JOBS.** Period. Don't even install `node-cron`.
*   Maintain **Idempotency** (No duplicate posts).

---

## 🗺️ The Blueprint: Where & How to Integrate

Here is the exact step-by-step game plan for your codebase.

### Step 1: Spin up Redis and Elasticsearch
*   **Where:** You will need to install Docker on your PC to easily run Redis and Elasticsearch locally without cluttering your Windows machine.
*   **How:** You will create a `docker-compose.yml` file in your main folder. Running `docker-compose up` will instantly start a Redis server (for BullMQ) and an Elasticsearch server (for searching).

### Step 2: Set up BullMQ & The Queue
*   **Where:** Create a new folder: `backend/queue/`
*   **How:** 
    *   Create `queue/postQueue.js`. Here you will initialize BullMQ: `new Queue('PostQueue', { connection: redis })`.
    *   Create `queue/postWorker.js`. This is the worker that listens to the queue. When it receives a job, it takes the scheduled post and changes it from "Scheduled" to "Published" in MongoDB.
    *   **Concurrency:** In the worker setup, you will pass `{ concurrency: 5 }` to show you know how to handle parallel jobs safely.

### Step 3: Create the Scheduling API Endpoint
*   **Where:** `backend/controllers/posts.controller.js` and `posts.routes.js`.
*   **How:** 
    *   Create a new route: `POST /schedule_post`.
    *   Inside the controller, save the post to MongoDB with a status of `isPublished: false`.
    *   Then, calculate the time difference between *now* and the *scheduled time* in milliseconds.
    *   Add it to BullMQ: `await postQueue.add('publish', { postId: newPost._id }, { delay: timeDifferenceInMs, jobId: newPost._id })`. *(Setting the `jobId` to the post ID guarantees **idempotency**—BullMQ will never accept two jobs with the same ID!).*

### Step 4: The Rate Limiter (The Traffic Cop)
*   **Where:** Inside a new middleware `backend/middleware/rateLimiter.js` and your Worker logic.
*   **How:**
    *   We use Redis to count how many posts a user published in the current hour. The Redis key will look like `posts_count_user123_hour14`.
    *   When the worker picks up a job, it asks Redis: *"Has this user posted 5 times this hour?"*
    *   If **No**: It publishes the post and tells Redis to `+1` the counter.
    *   If **Yes**: It tells BullMQ to **re-delay** the job by 1 hour (`job.moveToDelayed()`), and then it triggers the Slack notification.
    *   **Delay Between Posts:** We will use BullMQ's built-in `limiter` option when setting up the Queue (e.g., `limiter: { max: 1, duration: 2000 }` ensures only 1 post is processed every 2 seconds).

### Step 5: Slack OAuth Integration
*   **Where:** `backend/routes/slack.routes.js` and `user.model.js`.
*   **How:**
    *   Add a `slackWebhookUrl` or `slackToken` field to your User model.
    *   Create an endpoint that redirects the user to Slack's OAuth page.
    *   Create a callback endpoint (`/slack/callback`) where Slack sends you the special token after the user approves it. Save this token to the user in MongoDB.
    *   Whenever the rate limit is hit in Step 4, your backend simply makes an HTTP request to Slack's API using that saved token to send a message to the user.

### Step 6: Elasticsearch Integration
*   **Where:** `backend/services/elasticsearch.js`.
*   **How:**
    *   Whenever your Worker successfully publishes a post, it doesn't just save it to MongoDB. It also sends a copy of the post text to Elasticsearch.
    *   You will create a new endpoint `GET /posts/search?q=your_word`. This endpoint will ask Elasticsearch for the results (which is lightning fast) instead of asking MongoDB.

### Step 7: Bull-Board (The Live TV)
*   **Where:** `backend/server.js`.
*   **How:**
    *   Install `@bull-board/express`.
    *   In `server.js`, you attach it to a route: `app.use('/admin/queues', serverAdapter.getRouter())`.
    *   When you show your interviewer this URL in the browser, they will see a beautiful live dashboard showing posts waiting in the queue, processing, succeeding, and failing.

---

### What to do next?
Take a deep breath! It sounds like a lot, but we will take it one step at a time. 
**Do you want to start with Step 1 and set up Redis and Elasticsearch via Docker?** Let me know!
