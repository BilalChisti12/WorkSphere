import { Worker, DelayedError } from 'bullmq';
import { redisConnection } from './postQueue.js';
import Post from '../models/posts.model.js';
import User from '../models/user.model.js';

const worker = new Worker('PostQueue', async (job) => {
    console.log(`Processing scheduled post. Job ID: ${job.id}`);

    try {
        const post = await Post.findById(job.data.postId);
        if (!post) return;
        const currentHour = new Date().toISOString().slice(0, 13);
        const redisKey = `ratelimit:posts:${post.userId}:${currentHour}`;
        const currentCount = parseInt(await redisConnection.get(redisKey) || '0');
        const maxPerHour = parseInt(process.env.MAX_POSTS_PER_HOUR || '5');
        if (currentCount >= maxPerHour) {
            console.log(`User ${post.userId} hit their hourly limit! Delaying post...`);
            const nextHour = new Date();
            nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
            const randomJitterMs = Math.floor(Math.random() * 60000);
            await job.moveToDelayed(nextHour.getTime() + randomJitterMs, job.token);

            const userForSlack = await User.findById(post.userId);
            if (userForSlack && userForSlack.slackToken) {
                try {
                    await fetch('https://slack.com/api/chat.postMessage', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${userForSlack.slackToken}`
                        },
                        body: JSON.stringify({
                            channel: userForSlack.slackUserId,
                            text: "Kitne post daalega bsdk! Go, touch grass you son-in-law of a beach. Ab limit khatm. Ab ek ghante baad hoga upload tera post. Bhaad me jaa."
                        })
                    });
                    console.log(`Slack notification sent to user ${userForSlack._id}`);
                } catch (slackErr) {
                    console.error("Failed to send Slack message:", slackErr.message);
                }
            }
            throw new DelayedError();
        }
        await new Promise(resolve => setTimeout(resolve, parseInt(process.env.RATELIMIT_DUR_BTW)));
        post.active = true;
        await post.save();
        console.log(`Successfully published post: ${post._id}`);
        await redisConnection.incr(redisKey);
        await redisConnection.expire(redisKey, 3600);

    } catch (error) {
        if (error.name === 'DelayedError') {
            throw error;
        }
        console.error(error.message);
        throw error;
    }

}, {
    connection: redisConnection,
    concurrency: parseInt(process.env.RATELIMIT_CONCURRENCY)
});


worker.on('failed', (job, err) => {
    if (err.name !== 'DelayedError') {
        console.log(`Job ${job.id} failed with error: ${err.message}`);
    }
});




