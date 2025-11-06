// Routes/testEmailRoute.js
const express = require("express");
const router = express.Router();
const EmailService = require("../Services/EmailService");
const auth = require("../Middleware/authMiddleware");

// Test endpoint for offline email notifications
router.post("/test-offline-notification", auth, async (req, res) => {
  try {
    const { recipientId, senderName, messageContent, roomId } = req.body;

    // Use defaults if not provided
    const testData = {
      recipientId: recipientId || req.user.id,
      senderName: senderName || "Test Sender",
      senderRole: "officiant",
      messageContent:
        messageContent || "This is a test offline message notification.",
      roomId: roomId || "test_room_123",
    };

    const result = await EmailService.sendOfflineMessageNotification(testData);

    if (result) {
      res.json({
        success: true,
        message: "Test email notification sent successfully",
        testData,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send test email notification",
      });
    }
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending test email",
      error: error.message,
    });
  }
});

// Test email service connection
router.get("/test-connection", async (req, res) => {
  try {
    const isConnected = await EmailService.testConnection();

    res.json({
      success: isConnected,
      message: isConnected
        ? "Email service is connected and ready"
        : "Email service connection failed",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error testing email connection",
      error: error.message,
    });
  }
});

module.exports = router;
