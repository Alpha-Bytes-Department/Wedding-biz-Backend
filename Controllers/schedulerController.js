const { create } = require("../Models/NotificationSchema");
const Schedule = require("../Models/ScheduleSchema");
const { createNotification } = require("./notificationController");

// Create a new schedule
exports.createSchedule = async (req, res) => {
  try {
    const schedule = new Schedule(req.body);
    console.log("Creating schedule with data:", req.body);
    createNotification(
      req.body.officiantId,
      "Booking",
      `You have a new booking from ${req.body.fromUserName} on ${req.body.scheduleDate}.`
    );
    await schedule.save();
    createNotification(
      req.body.fromUserId,
      "Booking",
      `Your booking request with ${req.body.officiantName} on ${req.body.scheduleDate} is ${schedule.approvedStatus}.`
    );
    console.log("Schedule created successfully:", schedule.approvedStatus);
    res.status(201).json(schedule);
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(400).json({ error: error.message });
  }
};

// Get schedules for a user
exports.getSchedulesByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Fetching schedules for userId:", userId);
    const schedules = await Schedule.find({
      $or: [{ fromUserId: userId }, { officiantId: userId }],
    }).sort({ createdAt: -1 });
    console.log(`Found ${schedules.length} schedules for userId:`, userId);
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// shcedule gettng for officiant
exports.getScheduleByOfficiant = async (req, res) => {
  try {
    const officiantId = req.params.userId;
    // console.log("Fetching schedules for officiantId:", officiantId);
    const schedules = await Schedule.find({ officiantId }).sort({ createdAt: -1 });
    // console.log(`Found ${schedules.length} schedules for officiantId:`, officiantId);
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update schedule status
exports.updateScheduleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduleStatus, approvedStatus } = req.body;
    const schedule = await Schedule.findByIdAndUpdate(
        id,
        {  approvedStatus },
        { new: true }
    );

    if(schedule) createNotification(schedule.fromUserId, "Schedule Update", `Your booking request has been ${approvedStatus}.`);

    createNotification(schedule.fromUserId,"Booking",`Your booking  has been ${approvedStatus }.`);
    res.status(200).json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a schedule
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    await Schedule.findByIdAndDelete(id);
    res.status(200).json({ message: "Schedule deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } 
};