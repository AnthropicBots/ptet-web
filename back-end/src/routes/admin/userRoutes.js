const express = require("express");
const router = express.Router();

const userController = require("../../controllers/userController");
const {
  authenticate,
  authorize,
} = require("../../middleware/authMiddleware");

// GET /api/admin/users
router.get(
  "/",
  authenticate,
  authorize("admin"),
  userController.getAdminUsers
);

// PATCH /api/admin/users/:id/role
router.patch(
  "/:id/role",
  authenticate,
  authorize("admin"),
  userController.updateUserRole
);

// DELETE /api/admin/users/:id
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  userController.deleteUser
);

module.exports = router;
