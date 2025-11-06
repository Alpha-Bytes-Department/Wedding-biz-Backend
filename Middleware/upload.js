const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// File filter for security and file type validation
const fileFilter = (req, file, cb) => {
  // Define allowed file types for profile pictures
  const allowedImageTypes = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedImageTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${fileExtension} is not allowed. Only images are allowed.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for profile pictures
    files: 1, // Maximum 1 file for profile picture
  },
});

module.exports = upload;
