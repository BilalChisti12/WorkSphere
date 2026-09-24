import { Router } from "express";
import { activeCheck, createPost, schedulePost, searchPosts, getAllPosts, deletePost, commentPost, getComments, deleteComment, likePost } from "../controllers/posts.controller.js";
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
router.route('/upload_post').post(upload.single('media'),createPost);
router.route('/schedule_post').post(upload.single('media'),schedulePost);
router.route('/user/posts').get(getAllPosts);
router.route('/delete_post').post(deletePost);
router.route('/post/comment').post(commentPost);
router.route('/post/all_comments').get(getComments);
router.route('/post/delete_comment').post(deleteComment);
router.route('post/like').post(likePost);
router.route('/search_posts').get(searchPosts);

export default router;