const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
// const { all } = require("../Routes/userRoute");

const userSchema = new mongoose.Schema({
  partner_1:String,
  partner_2: String,
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ["user", "admin", "officiant"], default: "user" },
  address: String,
  phone: String,
  contact: {
    partner_1: String,
    partner_2: String,
  },
  weddingDate: Date,
  location: String,
  
  languages: [String],
  profilePicture: String,
  name: String,
  AgreementAccepted: { type: Boolean, default: false },
  specialization: String,
  bookingPackage: [
    {
      id: String,
      name: String,
      price: Number,
      description: String,
      features: [String],
    },
  ],
  experience: { type: Number, default: 0 },
  bookingMoney: { type: Number, default: 0 },
  bio: String,
  availability: { type: Boolean, default: true },
  allowDownload: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  refreshToken: {
    type: String,
    default: null,
  },
});

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
