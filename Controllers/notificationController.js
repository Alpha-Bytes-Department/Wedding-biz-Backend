const Notification = require("../Models/NotificationSchema");

// Get user notifications
exports.getUserNotifications = async (req, res) => {
  try {
    // Get user id from auth token
    if (!req.user || !req.user.id) {
      console.log("User not found in token");
      return res.status(400).json({ error: "User not found in token" });
    }

    const tokenUserId = req.user.id;
    // console.log(`Fetching notifications for user ID: ${tokenUserId}`);
    const notifications = await Notification.find({
      userId: tokenUserId.toString(),
    }).sort({ createdAt: 1 });

    res.status(200).json({ notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: err.message });
  }
};

//update for Toggle read status
exports.toggleReadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    notification.isRead = !notification.isRead;
    await notification.save();

    res.status(200).json({
      msg: `Notification marked as ${notification.isRead ? "read" : "unread"}`,
      notification,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Manual notification creation
exports.createNotificationManual = async (req, res) => {
  try {
    const { userId, type, customMessage } = req.body;
    const notification = await createNotification(userId, type, customMessage);

    res.status(201).json({ msg: "Notification created", notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Exported function to create notifications
exports.createNotification = async (userId, type, customMessage ) => {
  try {
    const message = customMessage;
    console.log("Creating notification with message:", message);
    if (!message) {
      console.log("No custom message provided");
      return null;
    }
    const notification = new Notification({
      userId,
      message,
      type,
    });
    await notification.save();
    console.log(`Notification sent to user ${userId}: ${message}`);
    return notification;
  } catch (err) {
    console.error("Error creating notification:", err);
  }
};
