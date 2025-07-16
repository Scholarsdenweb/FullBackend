const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            access_mode: "public",  // Ensure file is public

        });

        console.log("File is uploaded on Cloudinary:", response.url);
        return response;
    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error);

        // Remove the locally saved temporary file if the upload fails
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        throw error; // Rethrow the error for further handling
    }
};

module.exports = { uploadOnCloudinary };
