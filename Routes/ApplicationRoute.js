const express = require("express");
const multer = require("multer");
const auth = require("../Middleware/authMiddleware");
const {
  createApplication,
  updateApplicationStatus,
  getApplicationById,
  getAllApplications,
  deleteApplication,
} = require("../Controllers/ApplicantController");
const { applicantUpload } = require("../Middleware/upload");
const router = express.Router();

// ===============Create Application ===============
router.post(
  "/",
  auth,
  applicantUpload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "portfolio", maxCount: 1 },
  ]),
  createApplication
);
// ===============Update Application Status ================
router.patch("/:id", auth, updateApplicationStatus);
// ===============Get Application by ID =================
router.get("/:id", auth, getApplicationById);
// ===============Get All Applications ===============
router.get("/", auth, getAllApplications);
// ==============Delete Application ===============
router.delete("/:id", auth, deleteApplication);

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "File size too large. Maximum allowed size is 5MB.",
      error: "FILE_TOO_LARGE",
    });
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "Too many files. Maximum allowed is 2 files.",
      error: "TOO_MANY_FILES",
    });
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Unexpected field name for file upload.",
      error: "UNEXPECTED_FIELD",
    });
  }

  if (
    error.message &&
    (error.message.includes("Profile picture") ||
      error.message.includes("Portfolio"))
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: "INVALID_FILE_TYPE",
    });
  }

  // For other multer errors
  if (error.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: "File upload error: " + error.message,
      error: "UPLOAD_ERROR",
    });
  }

  // Pass other errors to default error handler
  next(error);
});

module.exports = router;
