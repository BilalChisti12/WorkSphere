import { Worker } from 'bullmq';
import { redisConnection } from './postQueue.js';
import Post from '../models/posts.model.js';

const worker = new Worker('PostQueue', async (job) => {
    console.log(`Processing scheduled post. Job ID: ${job.id}`);
    
    try {
        const post = await Post.findById(job.data.postId);
        
        if(post) {
            post.active = true;
            await post.save();
            console.log(`Successfully published post: ${post._id}`);
        }
    } catch (error) {
        console.error(error.message);
        throw error;
    }

}, {
    connection: redisConnection,
    concurrency: process.env.RATELIMIT_CONCURRENCY,
    limiter: {
        max: process.env.RATELIMIT_MAXJOBS,
        duration: process.env.RATELIMIT_DUR_BTW
    }
});


worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error: ${err.message}`);
});



