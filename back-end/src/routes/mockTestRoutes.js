const express = require('express');
const router = express.Router();
const mockTestController = require('../controllers/mockTestController');
const {validateGetTests, validateMockTestId} = require("../middleware/validators/mockTest.validator")

router.get('/', validateGetTests ,mockTestController.getTests);
router.get('/:id', validateMockTestId ,mockTestController.getTestById);

module.exports = router;
