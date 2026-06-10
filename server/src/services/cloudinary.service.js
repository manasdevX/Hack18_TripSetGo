// server/src/services/cloudinary.service.js
const cloudinary = require('cloudinary').v2
const streamifier = require('streamifier')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

/**
 * Uploads an image buffer to Cloudinary and returns the secure URL
 * @param {Buffer} buffer - The image buffer from multer memory storage
 * @param {String} folder - Optional folder name in Cloudinary
 * @returns {Promise<String>} The secure URL of the uploaded image
 */
const uploadImageBuffer = (buffer, folder = 'tripsetgo/avatars') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', width: 400, height: 400, crop: 'limit' },
      (error, result) => {
        if (result) {
          resolve(result.secure_url)
        } else {
          reject(error)
        }
      }
    )
    streamifier.createReadStream(buffer).pipe(uploadStream)
  })
}

module.exports = { uploadImageBuffer, cloudinary }
