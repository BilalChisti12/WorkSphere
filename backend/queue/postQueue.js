import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  maxRetriesPerRequest: null 
});


export const postQueue = new Queue('PostQueue', {
  connection: redisConnection,
});

export const checkRateLimitStatus = async (userId, targetDate) => {
    const targetHour = targetDate.toISOString().slice(0, 13);
    const redisKey = `ratelimit:posts:${userId}:${targetHour}`;
    const currentCount = await redisConnection.get(redisKey);
    const maxPerHour = parseInt(process.env.MAX_POSTS_PER_HOUR || '5');
    return currentCount && parseInt(currentCount) >= maxPerHour;
}

console.log("Post Queue Initialized!");
