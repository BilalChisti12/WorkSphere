import { Worker } from 'bullmq';
import { redisConnection } from './postQueue.js';
import Post from '../models/posts.model.js';
import { elasticClient } from '../elasticClient.js';

const worker = new Worker('ElasticQueue', async (job) => {
    const { postId } = job.data; // We grab the Post ID from the task
    
    // 1. Fetch the latest post data from our Notebook (MongoDB)
    const post = await Post.findById(postId);
    if (!post) {
        return; 
    }
    await elasticClient.index({
        index: 'posts',
        id: post._id.toString(),
        document: {
            body: post.body,
            userId: post.userId.toString(),
            publishedAt: post.createdAt || new Date()
        }
    });
}, {
    connection: redisConnection
});

worker.on('failed', (job, err) => {
    console.log(`Elasticsearch indexing failed for Post. It will try again! Error: ${err.message}`);
});
