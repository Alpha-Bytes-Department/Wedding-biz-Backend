const mongoose = require("mongoose");

const ApplicantsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  contactNo: { type: String, required: true },
  email: { type: String, required: true },
  experience: { type: Number, required: true },
  address: { type: String, required: true },
  experience_details: { type: String, required: true },
  portfolio: { type: String, required: true },
  profilePicture: { type: String, required: true },
  language: { type: [String], required: true },
  speciality: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  appliedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Applicant", ApplicantsSchema);