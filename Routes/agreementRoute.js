const express = require("express");
const router = express.Router();
const auth = require("../Middleware/authMiddleware");
const upload = require("../Middleware/upload");
const {
  createAgreement,
  getAgreementByUserId,
  getAllAgreementsByUserId,
  getAllAgreementsByOfficiantId,
  getAgreementById,
  updateAgreementDetails,
  uploadUserSignatures,
  sendPaymentRequest,
  markPaymentCompleted,
  acceptPayLater,
  uploadOfficiantSignature,
  deleteAgreement,
  getAllAgreements,
} = require("../Controllers/AgreementController");

// Create Agreement (Officiant creates from scratch)
router.post("/create", auth, createAgreement);

// Get All Agreements by Officiant (must be before /:agreementId)
router.get("/officiant/my", auth, getAllAgreementsByOfficiantId);

// Get All Agreements by User ID (returns array)
router.get("/user/:userId/all", auth, getAllAgreementsByUserId);

// Get Agreement by User ID (single - legacy)
router.get("/user/:userId", auth, getAgreementByUserId);

// Get Agreement by ID
router.get("/:agreementId", auth, getAgreementById);

// Update Agreement Details (Officiant)
router.put("/update-details/:agreementId", auth, updateAgreementDetails);

// Delete Agreement (Officiant)
router.delete("/:agreementId", auth, deleteAgreement);

// Upload User Signatures (2 images)
router.post(
  "/upload-user-signatures/:agreementId",
  auth,
  upload.fields([
    { name: "partner1Signature", maxCount: 1 },
    { name: "partner2Signature", maxCount: 1 },
  ]),
  uploadUserSignatures,
);

// Send Payment Request (Officiant)
router.post("/send-payment-request/:agreementId", auth, sendPaymentRequest);

// Mark Payment as Completed
router.patch("/payment-completed/:agreementId", auth, markPaymentCompleted);

// Accept Pay Later
router.patch("/pay-later/:agreementId", auth, acceptPayLater);

// Upload Officiant Signature
router.post(
  "/upload-officiant-signature/:agreementId",
  auth,
  upload.single("officiantSignature"),
  uploadOfficiantSignature,
);

// Get All Agreements (Admin)
router.get("/admin/all", auth, getAllAgreements);

module.exports = router;
