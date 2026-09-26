import { Queue } from 'bullmq';
import { redisConnection } from './postQueue.js';

export const elasticQueue = new Queue('ElasticQueue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 10,
        backoff: {
            type: 'exponential',
            delay: 5000
        }
    }
});
