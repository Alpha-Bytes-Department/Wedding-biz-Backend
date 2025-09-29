const e = require("express");
const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  ceremonyType: { type: String, required: true },
  price: { type: Number, required: false, default: 0 }, // Add price field for booking proposals
  // Greetings step fields
  groomName: { type: String, required: false },
  brideName: { type: String, required: false },
  language: { type: String, required: false },
  greetingSpeech: { type: String, required: false },
  presentationOfBride: { type: String, required: false },
  questionForPresentation: { type: String, required: false },
  responseToQuestion: { type: String, required: false },
  invocation: { type: String, required: false },
  // Vows step fields
  chargeToGroomAndBride: { type: String, required: false },
  pledge: { type: String, required: false },
  introductionToExchangeOfVows: { type: String, required: false },
  vows: { type: String, required: false },
  readings: { type: String, required: false },
  introductionToExchangeOfRings: { type: String, required: false },
  blessingsOfRings: { type: String, required: false },
  exchangeOfRingsGroom: { type: String, required: false },
  exchangeOfRingsBride: { type: String, required: false },
  prayerOnTheNewUnion: { type: String, required: false },
  // Rituals step fields
  ritualsSelection: { type: String, required: false },
  ritualsOption: { type: String, required: false },
  closingStatement: { type: String, required: false },
  pronouncing: { type: String, required: false },
  kiss: { type: String, required: false },
  introductionOfCouple: { type: String, required: false },
  eventDate: { type: Date, required: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  userId: { type: String, required: true },
  officiantId: { type: String, required: false },
  officiantName: { type: String, required: false },
  rehearsalDate: { type: Date, required: false },
  location: { type: String, required: false },
  eventTime: { type: Date, required: false },
  status: {
    type: String,
    enum: ["planned", "submitted", "approved", "completed", "canceled"],
    default: "planned",
  },
});

module.exports = mongoose.model("Event", EventSchema);
