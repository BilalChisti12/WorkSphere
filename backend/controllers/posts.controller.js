import User from "../models/user.model.js"
import bcrypt from 'bcrypt';
import mongoose from "mongoose";
import path from 'path';
import crypto from 'crypto';
import Profile from '../models/profile.model.js';
import Post from '../models/posts.model.js';
import Comment from '../models/comments.model.js';
import { postQueue } from '../queue/postQueue.js';
import { elasticClient } from '../elasticClient.js';


export const activeCheck = async (req, res) => {
    return res.status(200).json({
        message: "Server is active",

    });
}


export const createPost = async (req, res) => {
    const { token, body } = req.body;
    try {
        const user = await User.findOne({ token });
        if (!user) return res.status(400).json({ message: "User not found" });
        const mediaFile = req.file || '';
        if (!body && !req.file) return res.status(400).json({ message: "Post body or media is required" });
        const post = new Post({
            userId: user._id,
            body: body || '',
            media: mediaFile ? mediaFile.filename : '',
            fileType: mediaFile ? mediaFile.mimetype.split('/')[1] : '',
        });
        await post.save();
        return res.status(200).json({ message: "Post created successfully" });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}


export const schedulePost = async (req, res) => {
    const { token, body, scheduledTime } = req.body;
    
    try {
        const user = await User.findOne({ token });
        if (!user) return res.status(400).json({ message: "User not found" });
        const delay = new Date(scheduledTime).getTime() - Date.now();
        
        if (delay < 0) {
            return res.status(400).json({ message: "Scheduled time must be in the future" });
        }

        const mediaFile = req.file || '';
        const post = new Post({
            userId: user._id,
            body: body || '',
            media: mediaFile ? mediaFile.filename : '',
            fileType: mediaFile ? mediaFile.mimetype.split('/')[1] : '',
            active: false,
        });
        await post.save();

        await postQueue.add(
            'publish_post',
            { postId: post._id },
            { 
                delay: delay,
                jobId: post._id.toString() //idm
            }
        );

        return res.status(200).json({ message: "Post scheduled successfully!" });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}


export const getAllPosts = async (req, res) => {
    const { token } = req.query;
    try {
        const user = await User.findOne({ token });
        if (!user) return res.status(400).json({ message: "User not found" });
        const posts = await Post.find({ userId: user._id, active: true }).sort({ createdAt: -1 }).populate("userId", "username name profilePicture");
        return res.status(200).json(posts);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}


export const deletePost = async (req, res) => {
    const { token, postId } = req.body;
    try {
        const user = await User.findOne({ token });
        if (!user) return res.status(400).json({ message: "User not found" });
        if(!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({message: "Invalid Post ID"});
        const post = await Post.findOne({ _id: postId });
        if (!post) return res.status(400).json({ message: "Post not found" });
        if (post.userId.toString() !== user._id.toString()) return res.status(400).json({ message: "You are not authorized to delete this post" });
        await post.deleteOne({ _id: postId });
        await Comment.deleteMany({postId: postId});
        return res.status(200).json({ message: "Post deleted successfully" });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
}

export const commentPost = async (req, res) => {
    try {
        const { token, post_id, comment } = req.body;
        if(!token || !post_id || !comment || comment.trim() === '') return res.status(400).json({message: "All fields are required"});
        const user = await User.findOne({ token });
        if (!user) return res.status(400).json({ message: "User not found" });
        const post = await Post.findOne({ _id: post_id });
        if (!post) return res.status(400).json({ message: "Post not found" });
        const commentr = new Comment({
            userId: user._id,
            postId: post_id,
            body: comment
        });
        await commentr.save();
        return res.status(200).json({ message: "Commented successfully" });
    }
    catch (err) {
        return res.status(500).json({ message: err.message });
    }
}


export const getComments = async (req, res) =>{
    try{
        const {post_id} = req.query;
        const post = await Post.findOne({_id: post_id });
        if(!post) return res.status(400).json({message:"Post not found"});
        const comments = await Comment.find({postId: post_id}).sort({createdAt: -1}).populate("userId", "username name profilePicture");
        return res.status(200).json(comments);
    }catch(e){
        return res.status(500).json({message: e.message});
    }
}


export const deleteComment = async (req, res) => {
    const {token, post_id, commentId} = req.body;
    try{
        const post = await Post.findOne({_id: post_id});
        if(!post) return res.status(400).json({message: "Post not found"});
        const user = await User.findOne({token});
        if(!user) return res.status(400).json({message: "User not found"});
        const comment = await Comment.findOne({_id: commentId, postId: post_id});
        if(!comment) return res.status(400).json({message: "Comment not found"});
        if(user._id.toString() !== comment.userId.toString() && post.userId.toString() !== user._id.toString()) return res.status(400).json({message: "You are not authorized to delete this comment"});
        await comment.deleteOne();
        return res.status(200).json({message: "Comment deleted successfully"});
    }catch(e){
        return res.status(500).json({message: e.message});
    }
}


export const likePost = async (req, res) => {
    const {token, postId} = req.body;
    try{
        const user = await User.findOne({token});
        if(!user) return res.status(400).json({message: "User not found"});
        const post = await Post.findOne({_id: postId});
        if(!post) return res.status(400).json({message: "Post not found"});
        if(post.likes.toString().includes(user._id.toString())) return res.status(400).json({message: "You have already liked this post"});
        post.likes.push(user._id);
        await post.save();
        return res.status(200).json({message: "Post liked successfully"});
    }catch(e){
        return res.status(500).json({message: e.message})
    }
}


export const searchPosts = async (req, res) => {
    // We expect the frontend to call: /search_posts?query=javascript
    const { query } = req.query; 
    
    if (!query) return res.status(400).json({ message: "Please provide a search query" });

    try {
        const result = await elasticClient.search({
            index: 'posts',
            query: {
                match: {
                    body: query
                }
            }
        });
        const cleanResults = result.hits.hits.map(hit => ({
            _id: hit._id,
            ...hit._source // This contains the body, userid, and pubat
        }));
        return res.status(200).json(cleanResults);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
