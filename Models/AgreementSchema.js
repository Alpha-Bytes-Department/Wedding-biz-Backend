const mongoose = require("mongoose");

const AgreementSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  officiantId: { type: String, required: true },

  // Event Details (filled by officiant)
  officiantName: { type: String, required: false },
  eventDate: { type: Date, required: false },
  partner1Name: { type: String, required: false },
  partner2Name: { type: String, required: false },
  location: { type: String, required: false },
  price: { type: Number, required: false, default: 0 },
  travelFee: { type: Number, required: false, default: 0 },

  // Agreement Status
  status: {
    type: String,
    enum: [
      "pending",
      "officiant_filled",
      "user_signed",
      "payment_requested",
      "payment_completed",
      "officiant_signed",
      "completed",
      "used",
    ],
    default: "pending",
  },

  // Track if agreement was used for ceremony submission
  isUsedForCeremony: { type: Boolean, default: false },
  ceremonySubmittedAt: { type: Date, required: false },

  // Signatures (image URLs)
  partner1Signature: { type: String, required: false },
  partner2Signature: { type: String, required: false },
  officiantSignature: { type: String, required: false },

  // Tracking
  officiantFilledAt: { type: Date },
  userSignedAt: { type: Date },
  paymentRequestedAt: { type: Date },
  paymentCompletedAt: { type: Date },
  officiantSignedAt: { type: Date },
  completedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for fast lookups (removed unique constraint to allow multiple agreements)
AgreementSchema.index({ userId: 1, officiantId: 1 });

module.exports = mongoose.model("Agreement", AgreementSchema);
