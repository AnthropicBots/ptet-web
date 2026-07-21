const express = require("express");

const router = express.Router();

const adminController = require("../../controllers/adminController");

const {
  authenticate,
  authorize,
} = require("../../middleware/authMiddleware");

router.get(
  "/",
  authenticate,
  authorize("admin"),
  adminController.getAnalytics
);

module.exports = router;
