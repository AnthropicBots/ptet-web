const express = require("express");
const router = express.Router();

const questionController = require("../../controllers/questionController");
const {validateQuestion} = require("../../middleware/validators/question.validator");

const {
  authenticate,
  authorize,
} = require("../../middleware/authMiddleware");

router.post(
  "/",
  authenticate,
  authorize("admin"),
  validateQuestion,
  questionController.createQuestion
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validateQuestion,
  questionController.updateQuestion
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  questionController.deleteQuestion
);

module.exports = router;
