import { Router } from 'express';
import { acceptCon, getMyConReqs, myCons, register, sendConnectionRequest } from '../controllers/user.controller.js';
import {login} from '../controllers/user.controller.js';
import multer from 'multer';
import {updateUserProfile} from '../controllers/user.controller.js';
import { updateProfilePic, getUserProfile, updateProfileData, getAllUserProfile, downloadProfile} from '../controllers/user.controller.js';
const router = Router();



const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({storage: storage});



router.route('/update_profile_pic')
.post(upload.single('profile_picture'), updateProfilePic);


router.route('/register').post(register);
router.route('/login').post(login);
router.route('/user_update').post(updateUserProfile);
router.route('/get_user_profile').get(getUserProfile);
router.route('/update_profile_data').post(updateProfileData);
router.route('/user/search').get(getAllUserProfile);
router.route('/user/download_resume').get(downloadProfile);
router.route('/user/connections/send_connection_request').post(sendConnectionRequest);
router.route('/user/connections/connection_requests').post(getMyConReqs);
router.route('/user/connections').post(myCons);
router.route('/user/connections/accept_connection').post(acceptCon);
export default router;