const express = require('express');
const router = express.Router();
const tipController = require('../controllers/tipController');

// GET /api/tips/daily – public endpoint
router.get('/daily', tipController.getDailyTip);

module.exports = router;