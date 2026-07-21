const express = require('express');
const router = express.Router();
const testAttemptController = require('../controllers/testAttemptController');
// const { authenticate } = require('../middleware/authMiddleware');

router.post('/:attemptId/answers', testAttemptController.submitAnswer);
router.get('/:attemptId/answers/:answerId/feedback', testAttemptController.getAnswerFeedback);

module.exports = router;
