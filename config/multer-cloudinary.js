// ==================== MULTER + CLOUDINARY CONFIGURATION ====================
const multer = require('multer');
const { uploadFromBuffer } = require('./cloudinary');

// Memory storage for Cloudinary (uploads to memory, then to Cloudinary)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const path = require('path');
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: fileFilter
});

// Middleware to handle Cloudinary upload after multer
async function handleCloudinaryUpload(req, res, next) {
  if (!req.file) {
    return next();
  }

  try {
    const itemName = req.body.itemName || 'menu-item';
    const folder = 'menu';
    
    const result = await uploadFromBuffer(req.file.buffer, folder);
    
    // Store Cloudinary URL instead of local file path
    req.file.cloudinaryUrl = result.secure_url;
    req.file.publicId = result.public_id;
    
    next();
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image to Cloudinary',
      error: error.message
    });
  }
}

module.exports = { upload, handleCloudinaryUpload };

