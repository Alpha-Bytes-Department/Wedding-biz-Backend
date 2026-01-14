const express = require("express");
const router = express.Router();
const auth = require("../Middleware/authMiddleware");
const upload = require("../Middleware/upload");
const {
  createAgreement,
  getAgreementByUserId,
  getAgreementById,
  updateAgreementDetails,
  uploadUserSignatures,
  sendPaymentRequest,
  markPaymentCompleted,
  uploadOfficiantSignature,
  getAllAgreements,
} = require("../Controllers/AgreementController");

// Create Agreement (Officiant creates from scratch)
router.post("/create", auth, createAgreement);

// Get Agreement by User ID
router.get("/user/:userId", auth, getAgreementByUserId);

// Get Agreement by ID
router.get("/:agreementId", auth, getAgreementById);

// Update Agreement Details (Officiant)
router.put("/update-details/:agreementId", auth, updateAgreementDetails);

// Upload User Signatures (2 images)
router.post(
  "/upload-user-signatures/:agreementId",
  auth,
  upload.fields([
    { name: "partner1Signature", maxCount: 1 },
    { name: "partner2Signature", maxCount: 1 },
  ]),
  uploadUserSignatures
);

// Send Payment Request (Officiant)
router.post("/send-payment-request/:agreementId", auth, sendPaymentRequest);

// Mark Payment as Completed
router.patch("/payment-completed/:agreementId", auth, markPaymentCompleted);

// Upload Officiant Signature
router.post(
  "/upload-officiant-signature/:agreementId",
  auth,
  upload.single("officiantSignature"),
  uploadOfficiantSignature
);

// Get All Agreements (Admin)
router.get("/admin/all", auth, getAllAgreements);

module.exports = router;
