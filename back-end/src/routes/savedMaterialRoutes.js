const express = require('express');
const router = express.Router({ mergeParams: true });
const savedMaterialController = require('../controllers/savedMaterialController');
const { authenticate } = require('../middleware/authMiddleware');
const {validateSavedMaterialParams} = require("../middleware/validators/savedMaterial.validator");

// All routes require authentication
router.use(authenticate);

// POST /api/users/:id/saved/:materialId
router.post('/:materialId', validateSavedMaterialParams ,savedMaterialController.toggleSave);

// GET /api/users/:id/saved
router.get('/', validateSavedMaterialParams ,savedMaterialController.getSavedMaterials);

module.exports = router;