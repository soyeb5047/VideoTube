import { v2 as cloudinary } from "cloudinary";

const deleteFile = async (fileURI) => {
    try {
        const publicId = fileURI.split('/').pop().split('.')[0];
        const result = await cloudinary.uploader.destroy(publicId);
        console.log(result)
        return result
    } catch (error) {
        console.log('error while file delete from cloudinary: ', error)
        return null
    }
}

export {deleteFile}