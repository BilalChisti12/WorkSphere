import mongoose from 'mongoose';
import Redis from 'ioredis';
import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv/config'; 

const clearAllData = async () => {
    console.log("🔥 Starting total database wipe...\n");

    try {
        // 1. Clear MongoDB
        console.log("⏳ Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URL);
        console.log("   Dropping all MongoDB collections...");
        
        // Fetch all collections in the database
        const collections = await mongoose.connection.db.collections();
        for (let collection of collections) {
            await collection.drop();
            console.log(`   - Dropped ${collection.collectionName}`);
        }
        console.log("✅ MongoDB completely cleared!\n");

        // 2. Clear Redis
        console.log("⏳ Connecting to Redis...");
        const redis = new Redis({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: process.env.REDIS_PORT || 6379,
        });
        console.log("   Flushing all Redis keys (Rate limits, BullMQ queues)...");
        await redis.flushall();
        console.log("✅ Redis completely cleared!\n");

        // 3. Clear Elasticsearch
        console.log("⏳ Connecting to Elasticsearch...");
        const elasticClient = new Client({ node: process.env.ELASTIC_URL || 'http://localhost:9200' });
        
        const indexExists = await elasticClient.indices.exists({ index: 'posts' });
        if (indexExists) {
            await elasticClient.indices.delete({ index: 'posts' });
            console.log("   - Deleted 'posts' index");
        }
        console.log("✅ Elasticsearch completely cleared!\n");

    } catch (err) {
        console.error("\n❌ Error during database wipe:", err.message);
    } finally {
        console.log("🎉 All data wiped successfully! Your backend is ready for the frontend.");
        process.exit(0);
    }
};

clearAllData();
