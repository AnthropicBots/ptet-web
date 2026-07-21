const express = require('express');
const router = express.Router();
const studyMaterialController = require('../controllers/studyMaterialController');
const { authenticate } = require('../middleware/authMiddleware');
const {validateMaterialId} = require("../middleware/validators/studyMaterial.validator");

// GET /api/materials/recommended/:userId - needs authentication
router.get('/recommended/:userId', authenticate, validateMaterialId ,studyMaterialController.getRecommendedMaterials);

// GET /api/materials - public listing
router.get('/', validateMaterialId ,studyMaterialController.getMaterials);

// GET /api/materials/:id - public detail
router.get('/:id', validateMaterialId ,studyMaterialController.getMaterialById);

module.exports = router;