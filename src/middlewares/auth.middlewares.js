import { AsyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js";

const verifyJWT = AsyncHandler( async(req, res, next) => {
     try {
        const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', "")
   
        if(!token) throw new ApiError(404, "unauthorization access")
   
        const decodedUser = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
   
        const user = await User.findById(decodedUser._id).select("-password -refreshToken")
   
        if(!user) 
        {
           throw new ApiError(500, "invalid access token")
        }
   
        req.user = user
        next()
     } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
     }
})

export {verifyJWT}