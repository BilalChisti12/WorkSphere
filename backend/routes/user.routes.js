import { Router } from 'express';
import { acceptCon, getMyConReqs, myCons, register, sendConnectionRequest } from '../controllers/user.controller.js';
import { login, logout } from '../controllers/user.controller.js';
import multer from 'multer';
import { updateUserProfile } from '../controllers/user.controller.js';
import { updateProfilePic, getUserProfile, updateProfileData, getAllUserProfile, getProfileById, downloadProfile, connectSlack, slackCallback, disconSlack } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import crypto from 'crypto';


const router = Router();


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const prefix = Date.now() + '-' + crypto.randomBytes(16).toString('hex');
        cb(null, prefix + file.originalname);
    }
});
const upload = multer({ storage: storage });



router.route('/update_profile_pic')
    .post(authenticate, upload.single('profile_picture'), updateProfilePic);


router.route('/register').post(register);
router.route('/login').post(login);
router.route('/logout').post(authenticate, logout);
router.route('/user_update').post(authenticate, updateUserProfile);
router.route('/get_user_profile').get(authenticate, getUserProfile);
router.route('/update_profile_data').post(authenticate, updateProfileData);
router.route('/user/search').get(getAllUserProfile);
router.route('/user/profile/:id').get(authenticate, getProfileById);
router.route('/user/download_resume').get(downloadProfile);
router.route('/user/connections/send_connection_request').post(authenticate, sendConnectionRequest);
router.route('/user/connections/connection_requests').post(authenticate, getMyConReqs);
router.route('/user/connections').post(authenticate, myCons);
router.route('/user/connections/accept_connection').post(authenticate, acceptCon);
router.route('/slack/connect').get(authenticate, connectSlack);
router.route('/slack/callback').get(slackCallback);

router.route('/slack/disconnect').post(authenticate, disconSlack);

export default router;