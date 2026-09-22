import { Router } from "express";
import { activeCheck, createPost, getAllPosts} from "../controllers/posts.controller.js";
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
router.route('/upload_post').post(upload.single('media'),createPost)
router.route('/user/posts').get(getAllPosts)

export default router;