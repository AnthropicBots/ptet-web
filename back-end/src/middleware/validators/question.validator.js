const { body } = require("express-validator");
const { handleValidationErrors } = require("../middlewares/validation");

exports.validateQuestion = [
  body("question_text")
    .trim()
    .notEmpty()
    .withMessage("Question text is required"),

  body("options")
    .isArray({ min: 2 })
    .withMessage("At least two options are required"),

  body("correct_answer")
    .notEmpty()
    .withMessage("Correct answer is required"),

  body("difficulty")
    .optional()
    .isIn(["easy", "medium", "hard"])
    .withMessage("Invalid difficulty level"),

  body("marks")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Marks must be a positive integer"),

  handleValidationErrors,
];