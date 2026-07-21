const express = require("express");
const router = express.Router();

const mockTestController = require("../../controllers/mockTestController");
const {
  authenticate,
  authorize,
} = require("../../middleware/authMiddleware");

router.post(
  "/",
  authenticate,
  authorize("admin"),
  mockTestController.createMockTest
);

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  mockTestController.updateMockTest
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  mockTestController.deleteMockTest
);

module.exports = router;
