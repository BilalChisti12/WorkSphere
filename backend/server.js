import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import postRoutes from './routes/posts.routes.js';
import userRoutes from './routes/user.routes.js';

dotenv.config();


const app = express();

app.use(cors());
app.use(express.json({limit:"50mb"}));
app.use(express.urlencoded({extended: true, limit:"50mb"}));
// app.get('/', (req, res) => {
//     res.send('Server is running');
// });
app.use(postRoutes);
app.use(userRoutes);

app.use(express.static("uploads/"));

const start = async ()=>{
    const connect = await mongoose.connect(process.env.MONGO_URL);
    console.log("Mongo DB connected");

    app.listen(process.env.PORT, ()=>{
        console.log(`Server is running on port ${process.env.PORT}`);
    });
}

start();

