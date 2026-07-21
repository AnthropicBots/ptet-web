const express = require('express');
const router = express.Router();
const studyMaterialController = require('../../controllers/studyMaterialController');

// All routes in this file are protected by admin middleware in app.js

router.post('/', studyMaterialController.createMaterial);
router.patch('/:id', studyMaterialController.updateMaterial);
router.delete('/:id', studyMaterialController.deleteMaterial);

module.exports = router;