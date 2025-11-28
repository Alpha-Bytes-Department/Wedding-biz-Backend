const mongoose = require("mongoose");

const BillSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  eventType: { type: String, required: true },
  eventDate: { type: Date, required: true },
  eventName: { type: String, required: true },
  officiantName: { type: String, required: true },
  officiantId: { type: String, required: true },
  cost: { type: Number, required: true },
  travelFee: { type: Number, required: false, default: 0 },
  eventId: { type: String, required: false }, // Legacy field for event-based bookings
  agreementId: { type: String, required: false }, // New field for agreement-based payments
  amount: { type: Number, required: true },
  status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
  issuedAt: { type: Date, default: Date.now },
  paidAt: { type: Date },
  location: {
    line1: { type: String },
    city: { type: String },
    postal_code: { type: String },
    country: { type: String },
  },
  contacts: { type: String },
  transactionId: { type: String },
  billingMail: { type: String },
  billingName: { type: String },
});

module.exports = mongoose.model("Bill", BillSchema);
