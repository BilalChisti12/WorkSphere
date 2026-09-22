import User from "../models/user.model.js"
import bcrypt from 'bcrypt';
import Profile from '../models/profile.model.js';
import Post from '../models/posts.model.js';
export const activeCheck = async (req,res) => {
    return res.status(200).json({
        message: "Server is active",
        
    });
}


export const createPost = async (req, res) =>{
    const {token, body} = req.body;
    try{
        const user = await User.findOne({token});
        if(!user) return res.status(400).json({message: "User not found"});
        // if(!body) return res.status(400).json({message: "Post body is required"});
        const post = new Post({
            userId: user._id,
            body : body || '',
            media: req.body.media || '',
            fileType: req.body.media ? req.body.media.split('.').pop() : '',
        });
        await post.save();
        return res.status(200).json({message: "Post created successfully"});

    }catch(error){
        return res.status(500).json({message: error.message});
    }
}

export const getAllPosts = async (req, res) => {
    const {token} = req.query;
    try {
        const user = await User.findOne({token});
        if(!user) return res.status(400).json({message: "User not found"});
        const posts = await Post.find({userId : user._id}).populate("userId", "name profilePicture");
        return res.status(200).json(posts);
    } catch (error) {
        return res.status(500).json({message: error.message});
    }
}