import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import crypto from 'crypto';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'worksphere',
        format: async (req, file) => {
            const ext = file.mimetype.split('/')[1];
            return ['jpeg', 'png', 'jpg', 'webp', 'gif', 'mp4'].includes(ext) ? ext : 'png';
        },
        public_id: (req, file) => Date.now() + '-' + crypto.randomBytes(8).toString('hex'),
    },
});

export const uploadCloud = multer({ storage: storage });
