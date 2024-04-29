import { Router } from "express";
import { registerUser, loginUser, logoutUser, generateAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateAccountAvatar, updateAccountCoverImage, getUserChannelProfile, getWatchHostory } from "../controllers/users.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 1
        }
    ])
    , registerUser)

router.route('/login').post(loginUser)

// special routes
router.route('/logout').get(verifyJWT, logoutUser)
router.route('/refresh-token').post(generateAccessToken)

router.route('/change-password').post(verifyJWT, changeCurrentPassword)
router.route('/current-user').post(verifyJWT, getCurrentUser)
router.route('/update-account').patch(verifyJWT, updateAccountDetails)
router.route('/avatar').patch(verifyJWT, upload.single("avatar"), updateAccountAvatar)
router.route('/cover-image').patch(verifyJWT, upload.single("coverImage"), updateAccountCoverImage)
router.route('/c/profile').get(verifyJWT, getUserChannelProfile)
router.route('/history').get(verifyJWT, getWatchHostory)


export default router