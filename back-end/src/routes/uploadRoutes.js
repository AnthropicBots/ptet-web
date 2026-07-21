const express = require('express');
const multer = require('multer');
const { uploadAudio } = require('../controllers/uploadController');
// Uncomment if authentication is required to upload files:
// const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'audio/webm' ||
    file.mimetype === 'video/webm' ||
    file.mimetype === 'audio/mp4' ||
    file.mimetype === 'video/mp4'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only WebM and MP4 are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

router.post('/audio', upload.single('audio'), uploadAudio);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File size exceeds 10MB limit.' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;