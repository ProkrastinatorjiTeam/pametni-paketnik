const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define the destination directory for uploads
// This will create a 'public/images' folder at the root of your backend project if it doesn't exist
const uploadDir = path.join(__dirname, '../public/images');

// Ensure the upload directory exists
if (!fs.existsSync(path.join(__dirname, '../public'))) {
    fs.mkdirSync(path.join(__dirname, '../public'), { recursive: true });
}
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter (optional, to accept only certain image types)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) { // Accepts common image types like jpeg, png, gif, webp
        cb(null, true);
    } else {
        // You can pass an error to cb if you want to reject the file upload entirely
        // cb(new Error('Unsupported file type. Only images are allowed.'), false);
        // Or, accept the file but perhaps log a warning or handle it differently later
        console.warn(`Unsupported file type uploaded: ${file.mimetype}. Allowing for now.`);
        cb(null, true); // To avoid breaking uploads if other types are sent, but ideally filter strictly
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 10 // 10MB limit per file (adjust as needed)
    },
    fileFilter: fileFilter // (optional, but recommended)
});

module.exports = upload;