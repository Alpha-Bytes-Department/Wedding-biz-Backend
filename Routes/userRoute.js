const express = require("express");
const {
  registerUser,
  loginUser,
  verifyEmail,
  refreshToken,
  logoutUser,
  getUser,
  getAllUsers,
  forgetPassword,
  resetPassword,
  updateUser,
  getOfficiants,
  getOfficiantDetails,
  socialLogin,
  changePassword,
  deleteUser,
  changeUserInfo,
  deleteAnyUser,
  assignOfficiantToUser,
} = require("../Controllers/UserController");
const auth = require("../Middleware/authMiddleware");
const upload = require("../Middleware/upload");

const router = express.Router(); // Public
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forget", forgetPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/verify/:token", verifyEmail);
router.get("/officiants", getOfficiants);
router.get("/officiants/:id", getOfficiantDetails);
router.post("/social-login", socialLogin);

// Protected
router.get("/get-user", auth, getUser);
router.get("/get-all-users", auth, getAllUsers);
router.patch(
  "/update/:id",
  auth,
  upload.single("profilePicture"),
  changeUserInfo
);
router.post("/refresh-token", refreshToken);
router.post("/logout", auth, logoutUser);
router.patch("/update", auth, upload.single("profilePicture"), updateUser);
router.patch("/change-password", auth, changePassword);
router.delete("/delete-account", auth, deleteUser);
router.delete("/delete-account/:id", auth, deleteAnyUser);
router.post("/assign-officiant/:userId", auth, assignOfficiantToUser);

module.exports = router;
