import { Router } from "express";
import { activeCheck, createPost, getAllPosts, deletePost, commentPost, getComments} from "../controllers/posts.controller.js";
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
router.route('/user/posts').get(getAllPosts);
router.route('/delete_post').post(deletePost);
router.route('/post/comment').post(commentPost);
router.route('/post/all_comments').get(getComments);
export default router;