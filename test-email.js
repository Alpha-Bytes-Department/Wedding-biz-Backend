// test-email.js - Quick test script for offline email notifications
const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODBURL);

const User = require("./Models/UserCredential");
const EmailService = require("./Services/EmailService");

async function testEmailNotification() {
  try {
    console.log("🧪 Testing Email Notification System...");

    // Test email service connection
    console.log("📧 Testing email connection...");
    const isConnected = await EmailService.testConnection();
    console.log(`📧 Email service connected: ${isConnected ? "✅" : "❌"}`);

    if (!isConnected) {
      console.log(
        "❌ Email service connection failed. Check EMAIL_USER and EMAIL_PASS in .env"
      );
      return;
    }

    // Find a test user (preferably with your email)
    const testUser = await User.findOne({ email: { $exists: true } }).limit(1);

    if (!testUser) {
      console.log("❌ No users found in database for testing");
      return;
    }

    console.log(`👤 Testing with user: ${testUser.email}`);

    // Send test notification
    const testResult = await EmailService.sendOfflineMessageNotification({
      recipientId: testUser._id.toString(),
      senderName: "Test Officiant",
      senderRole: "officiant",
      messageContent:
        "This is a test offline message notification. If you receive this email, the system is working perfectly! 🎉",
      roomId: "test_room_" + Date.now(),
    });

    if (testResult) {
      console.log("✅ Test email sent successfully!");
      console.log(`📬 Check the inbox for: ${testUser.email}`);
      console.log("🎯 The offline email notification system is working!");
    } else {
      console.log("❌ Failed to send test email");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    mongoose.connection.close();
    console.log("🔚 Test completed");
  }
}

// Run the test
testEmailNotification();
