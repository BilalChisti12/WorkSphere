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

console.log("Post Queue Initialized!");
