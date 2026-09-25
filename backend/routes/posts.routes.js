import { Router } from "express";
import { activeCheck, createPost, schedulePost, searchPosts, getAllPosts, deletePost, commentPost, getComments, deleteComment, likePost } from "../controllers/posts.controller.js";
import { authenticate } from '../middleware/auth.middleware.js';
import multer from "multer";
const router = Router();

const storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null,'uploads/')
    },
    filename: (req,file,cb)=>{
        cb(null,file.originalname);
    }
});

const upload = multer({
    storage : storage
});

router.route('/').get(activeCheck);
router.route('/upload_post').post(authenticate, upload.single('media'),createPost);
router.route('/schedule_post').post(authenticate, upload.single('media'), schedulePost);
router.route('/user/posts').get(authenticate,getAllPosts);
router.route('/delete_post').post(authenticate,deletePost);
router.route('/post/comment').post(authenticate,commentPost);
router.route('/post/all_comments').get(authenticate,getComments);
router.route('/post/delete_comment').post(authenticate,deleteComment);
router.route('/post/like').post(authenticate,likePost);
router.route('/search_posts').get(searchPosts);

export default router;