// src/routes/healthRoutes.js
const express = require('express');
const { healthCheck } = require('../controllers/healthController');

const router = express.Router();

router.get('/', healthCheck);

module.exports = router;