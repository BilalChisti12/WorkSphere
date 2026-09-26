import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true },
    postId: { type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        index: true }
}, { timestamps: true });


const Like = mongoose.model("Like", likeSchema);
export default Like;
