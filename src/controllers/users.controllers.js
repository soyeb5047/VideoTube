import { AsyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from '../models/user.models.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { deleteFile } from "../utils/deleteCloudinary.js";
import jwt from 'jsonwebtoken'

const generateAccessandRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const AccessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        user.save({ validateBeforeSave: false })

        return { AccessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "some error occured while generating access and refresh token..!")
    }
}

const registerUser = AsyncHandler(async (req, res) => {

    const { fullName, username, email, password } = req.body
    // console.log(fullName, username)

    if ([fullName, username, email, password].some((field) => {
        field?.trim() === ""
    })) {
        throw new ApiError(404, "fill your credentials properly")
    }

    const userdetail = await User.findOne({
        $or: [
            { email }, { username }
        ]
    })

    // console.log(userdetail)

    if (userdetail) throw new ApiError(404, "user with this username and email already exists...!")

    // console.log(req.files)

    const localAvatarPath = req.files?.avatar[0]?.path
    // console.log(localAvatarPath)
    // const localCoverPath = req.files?.coverImage[0]?.path
    // console.log(localCoverPath)

    let localCoverPath
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        localCoverPath = req.files.coverImage[0].path
    }

    if (!localAvatarPath) throw new ApiError(400, "please upload avatar again...!")

    const avatar = await uploadOnCloudinary(localAvatarPath)
    // console.log(avatar.url)
    const CoverImage = await uploadOnCloudinary(localCoverPath)
    // console.log(CoverImage.url)

    if (!avatar) throw new ApiError(400, "There are some error please upload avatar...!")

    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: CoverImage?.url || "",
        password
    })

    // console.log(user)

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) throw new ApiError(500, "some error occured during user registration...!")

    return res.status(200).json(
        new ApiResponse(200, "User successfully created...!", createdUser)
    )

})

const loginUser = AsyncHandler(async (req, res) => {
    // generating refresh and access token

    const { username, email, password } = req.body

    if (!username || !email) throw new ApiError(400, "Please provide username or email...!")

    const user = await User.findOne({
        $or: [
            { username }, { email }
        ]
    })

    if (!user) throw new ApiError(404, "user doesn't exits....")

    let ispassword = await user.isPasswordCorrect(password)

    if (!ispassword) throw new ApiError(400, "please enter correct password....!")

    const { AccessToken, refreshToken } = await generateAccessandRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password, -refreshToken")

    const option = {
        httpOnly: true,
        secure: true
    }

    // send cookie
    return res.status(200)
        .cookie("accessToken", AccessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(new ApiResponse(
            200,
            {
                data: loggedInUser, AccessToken, refreshToken
            },
            "User loggedin successfully"
        ))
})

const logoutUser = AsyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user logged out....!"))
})

const generateAccessToken = AsyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) throw new ApiError(404, "invalid incoming refresh token")

        const decodeToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.find({ _id: decodeToken?._id })

        if (!user) throw new ApiError(404, "invalid refresh token")

        if (decodeToken != user.refreshToken) throw new ApiError(401, "refresh token expired or in use")

        const { AccessToken, refreshToken } = generateAccessandRefreshToken(user._id)

        const options = {
            httpOnly: true,
            secure: true
        }

        return res.status(200)
            .cookie('accessToken', AccessToken, options)
            .cookie('refreshToken', refreshToken, options)
            .json(new ApiResponse(200, {
                AccessToken, refreshToken
            }, "access token refreshed..!"
            ))
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})

const changeCurrentPassword = AsyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user._id)
    if (!user) throw new ApiError(404, "user not found")

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) throw new ApiError(404, 'old password is not valid')

    user.password = newPassword
    await user.save({ validateBeforeSave: true })

    return res.status(200)
        .json(new ApiResponse(200, {}, "password changed..."))
})

const getCurrentUser = AsyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "get current user"))
})

const updateAccountDetails = AsyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    const updatedUser = await User.findByIdAndUpdate(req.user?._id, {
            $set: {
                fullName, email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, updatedUser, "user fullname and email is now updated"))
})

const updateAccountAvatar = AsyncHandler(async (req, res) => {
    const {avatarLocalPath} = req.file?.path
    
    if(!avatarLocalPath) throw new ApiError(400, "please upload your avatar file for update")
    
    // delete old avatar image from cloudinary
    const deleteResponse = await deleteFile(req.user?.avatar)
    if(!deleteResponse) throw new ApiError(401,'file not deleted from cloudinary')

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar) throw new ApiError(401, "some issues when avatar file is uploaded on cludinary for update")


    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select('-password')

    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "successfully updated your avatar Image"))
})
const updateAccountCoverImage = AsyncHandler(async (req, res) => {
    const {coverImageLocalPath} = req.file?.path

    if(!coverImageLocalPath) throw new ApiError(400, "please upload your coverImage file for update")

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage) throw new ApiError(401, "some issues when coverImage file is uploaded on cludinary for update")

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select('-password')

    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "successfully updated your cover Image"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    generateAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAccountAvatar,
    updateAccountCoverImage
}