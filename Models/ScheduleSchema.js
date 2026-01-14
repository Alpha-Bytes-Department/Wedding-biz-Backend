const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema({
    fromUserId: { type: String, required: true },
    fromUserName: { type: String, required: true },
    fromUserImage: { type: String, required: false },
    eventId: { type: String },
    eventName: { type: String },
    scheduleDate: { type: Date, required: false },
    scheduleDateTime: { type: String, required: false },
    officiantName: { type: String, required: true },
    officiantImage: { type: String, required: false },
    officiantId: { type: String, required: true },
    agreementId: { type: String, required: false },
    message: { type: String, required: false },
    packageName: { type: String },
    approvedStatus: { type: String, enum: ['approved', 'pending', 'rejected'], required: false, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Schedule", ScheduleSchema);
