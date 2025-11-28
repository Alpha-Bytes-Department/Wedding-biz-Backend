const multer = require("multer");
const path = require("path");

// Storage configuration for regular profile pictures
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Storage configuration for applicant files
const applicantStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    if (file.fieldname === "profilePicture") {
      uploadPath = "uploads/profiles";
    } else if (file.fieldname === "portfolio") {
      uploadPath = "uploads/portfolios";
    } else if (
      file.fieldname === "partner1Signature" ||
      file.fieldname === "partner2Signature" ||
      file.fieldname === "officiantSignature"
    ) {
      uploadPath = "uploads/signatures";
    } else {
      uploadPath = "uploads/misc";
    }

    // Create directory if it doesn't exist
    require("fs").mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = `${file.fieldname}_${uniqueSuffix}${extension}`;
    cb(null, filename);
  },
});

// File filter for regular profile pictures
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

// File filter for applicant files (profile picture + portfolio + signatures)
const applicantFileFilter = (req, file, cb) => {
  if (
    file.fieldname === "profilePicture" ||
    file.fieldname === "partner1Signature" ||
    file.fieldname === "partner2Signature" ||
    file.fieldname === "officiantSignature"
  ) {
    // Only allow image files for profile picture and signatures
    const allowedImageTypes = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedImageTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Profile picture and signatures must be image files (jpg, jpeg, png, gif, webp)"
        ),
        false
      );
    }
  } else if (file.fieldname === "portfolio") {
    // Only allow PDF files for portfolio
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (fileExtension === ".pdf") {
      cb(null, true);
    } else {
      cb(new Error("Portfolio must be a PDF file"), false);
    }
  } else {
    cb(new Error("Unexpected field name"), false);
  }
};

// Regular upload for profile pictures (existing functionality)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for profile pictures
    files: 1, // Maximum 1 file for profile picture
  },
});

// Upload configuration for applicant applications and signatures
const applicantUpload = multer({
  storage: applicantStorage,
  fileFilter: applicantFileFilter,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit per file for signatures
    files: 3, // Maximum 3 files (profile picture/portfolio OR 3 signatures)
  },
});

module.exports = applicantUpload; // Default export uses applicantUpload to handle all file types
module.exports.upload = upload; // Named export for simple single file uploads
module.exports.applicantUpload = applicantUpload; // New upload configuration for applicants and signatures
