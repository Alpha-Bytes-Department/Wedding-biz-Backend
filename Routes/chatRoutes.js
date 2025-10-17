// routes/chatRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { ChatMessage, ChatRoom } = require("../Models/ChatSchema");
const router = express.Router();

// Enhanced multer configuration for chat files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/chat";
    // Create directory if it doesn't exist
    require("fs").mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = `chat_${uniqueSuffix}${extension}`;
    cb(null, filename);
  },
});

// File filter for security
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
    document: [".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt"],
    archive: [".zip", ".rar", ".7z"],
    spreadsheet: [".xls", ".xlsx", ".csv"],
    presentation: [".ppt", ".pptx", ".odp"],
  };

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const allAllowedTypes = Object.values(allowedTypes).flat();

  if (allAllowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${fileExtension} is not allowed`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5, // Maximum 5 files at once
  },
});

// Upload single file for chat
router.post("/upload-chat-file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { roomId, sender, senderName, type } = req.body;

    if (!roomId || !sender || !senderName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: roomId, sender, senderName",
      });
    }

    // Determine file type based on extension
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let fileType = type || "file";

    if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(fileExtension)) {
      fileType = "image";
    } else if ([".pdf", ".doc", ".docx", ".txt"].includes(fileExtension)) {
      fileType = "document";
    }

    // Generate file URL with correct server base URL
    const baseUrl =
      process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const fileUrl = `${baseUrl}/uploads/chat/${req.file.filename}`;

    // Create message in database
    const chatMessage = new ChatMessage({
      roomId,
      sender,
      senderName,
      type: fileType,
      content: req.file.originalname,
      fileData: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        fileUrl: fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });

    await chatMessage.save();

    // File metadata for response
    const fileData = {
      id: chatMessage._id,
      messageId: chatMessage.messageId,
      roomId,
      sender,
      senderName,
      type: fileType,
      content: req.file.originalname,
      originalName: req.file.originalname,
      fileUrl: fileUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      timestamp: chatMessage.createdAt,
      fileData: chatMessage.fileData,
    };

    // Emit to socket if available
    const io = req.app.get("io");
    if (io) {
      io.to(roomId).emit("receiveMessage", fileData);
    }

    res.json({
      success: true,
      message: "File uploaded successfully",
      filename: req.file.filename,
      fileUrl: fileUrl,
      fileData: fileData,
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload file",
      error: error.message,
    });
  }
});

// Upload multiple files for chat
router.post(
  "/upload-chat-files",
  upload.array("files", 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded",
        });
      }

      const { roomId, sender, senderName } = req.body;

      if (!roomId || !sender || !senderName) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: roomId, sender, senderName",
        });
      }

      const uploadedFiles = req.files.map((file) => {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        let fileType = "file";

        if (
          [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(fileExtension)
        ) {
          fileType = "image";
        } else if ([".pdf", ".doc", ".docx", ".txt"].includes(fileExtension)) {
          fileType = "document";
        }

        const baseUrl =
          process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

        return {
          id: Date.now() + Math.random(),
          roomId,
          sender,
          senderName,
          type: fileType,
          content: file.filename,
          originalName: file.originalname,
          fileUrl: `${baseUrl}/uploads/chat/${file.filename}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date().toISOString(),
        };
      });

      res.json({
        success: true,
        message: `${req.files.length} files uploaded successfully`,
        files: uploadedFiles,
      });
    } catch (error) {
      console.error("Multiple files upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload files",
        error: error.message,
      });
    }
  }
);

// Get file information
router.get("/file-info/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, "../uploads/chat", filename);

    // Check if file exists
    await fs.access(filePath);
    const stats = await fs.stat(filePath);

    res.json({
      success: true,
      filename: filename,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: "File not found",
    });
  }
});

// Download file
router.get("/download/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, "../uploads/chat", filename);

    // Security check - ensure filename doesn't contain path traversal
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid filename",
      });
    }

    res.download(filePath, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(404).json({
          success: false,
          message: "File not found",
        });
      }
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download file",
    });
  }
});

// Delete file (optional - for cleanup)
router.delete("/delete-file/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, "../uploads/chat", filename);

    // Security check
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid filename",
      });
    }

    await fs.unlink(filePath);

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete file",
    });
  }
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 50MB.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum is 5 files at once.",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected field name for file upload.",
      });
    }
  }

  res.status(400).json({
    success: false,
    message: error.message,
  });
});

// ============ CHAT DATABASE ENDPOINTS ============

// Get messages for a room with pagination
router.get("/messages/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await ChatMessage.getMessagesByRoom(
      roomId,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

// Save a message to database
router.post("/messages", async (req, res) => {
  try {
    const {
      messageId,
      roomId,
      sender,
      senderName,
      type,
      content,
      fileData,
      replyTo,
    } = req.body;

    if (!roomId || !sender || !senderName || !content) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: roomId, sender, senderName, content",
      });
    }

    const message = new ChatMessage({
      messageId: messageId || undefined,
      roomId,
      sender,
      senderName,
      type: type || "text",
      content,
      fileData,
      replyTo,
    });

    await message.save();

    res.json({
      success: true,
      message: "Message saved successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error saving message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save message",
      error: error.message,
    });
  }
});

// Mark messages as read
router.post("/messages/mark-read", async (req, res) => {
  try {
    const { messageIds, userId, userName } = req.body;

    if (!messageIds || !userId || !userName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: messageIds, userId, userName",
      });
    }

    await ChatMessage.markAsRead(messageIds, userId, userName);

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
});

// Add reaction to a message
router.post("/messages/:messageId/reactions", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji, userId, userName } = req.body;

    if (!emoji || !userId || !userName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: emoji, userId, userName",
      });
    }

    const message = await ChatMessage.findOneAndUpdate(
      { messageId },
      {
        $addToSet: {
          reactions: {
            emoji,
            userId,
            userName,
            reactedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.json({
      success: true,
      message: "Reaction added successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error adding reaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add reaction",
      error: error.message,
    });
  }
});

// Remove reaction from a message
router.delete("/messages/:messageId/reactions", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji, userId } = req.body;

    if (!emoji || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: emoji, userId",
      });
    }

    const message = await ChatMessage.findOneAndUpdate(
      { messageId },
      {
        $pull: {
          reactions: {
            emoji,
            userId,
          },
        },
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.json({
      success: true,
      message: "Reaction removed successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error removing reaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove reaction",
      error: error.message,
    });
  }
});

// ============ CHAT ROOM ENDPOINTS ============

// Create a new chat room
router.post("/rooms", async (req, res) => {
  try {
    const { roomId, name, description, type, participants, settings } =
      req.body;

    const room = await ChatRoom.createRoom({
      roomId,
      name,
      description,
      type: type || "private",
      participants: participants || [],
      settings: settings || {},
    });

    res.json({
      success: true,
      message: "Chat room created successfully",
      data: room,
    });
  } catch (error) {
    console.error("Error creating chat room:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create chat room",
      error: error.message,
    });
  }
});

// Get room information
router.get("/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await ChatRoom.findOne({ roomId });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    console.error("Error fetching chat room:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat room",
      error: error.message,
    });
  }
});

// Join a chat room
router.post("/rooms/:roomId/join", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, userName, role } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, userName",
      });
    }

    const room = await ChatRoom.addParticipant(roomId, {
      userId,
      userName,
      role: role || "member",
      joinedAt: new Date(),
      isActive: true,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    res.json({
      success: true,
      message: "Successfully joined chat room",
      data: room,
    });
  } catch (error) {
    console.error("Error joining chat room:", error);
    res.status(500).json({
      success: false,
      message: "Failed to join chat room",
      error: error.message,
    });
  }
});

// Leave a chat room
router.post("/rooms/:roomId/leave", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: userId",
      });
    }

    const room = await ChatRoom.removeParticipant(roomId, userId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    res.json({
      success: true,
      message: "Successfully left chat room",
      data: room,
    });
  } catch (error) {
    console.error("Error leaving chat room:", error);
    res.status(500).json({
      success: false,
      message: "Failed to leave chat room",
      error: error.message,
    });
  }
});

// Get user's chat rooms
router.get("/user/:userId/rooms", async (req, res) => {
  try {
    const { userId } = req.params;

    const rooms = await ChatRoom.find({
      "participants.userId": userId,
      "participants.isActive": true,
    }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    console.error("Error fetching user rooms:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user rooms",
      error: error.message,
    });
  }
});

// Get officiants for chat
router.get("/officiants", async (req, res) => {
  try {
    const User = require("../Models/UserCredential");

    const officiants = await User.find(
      { role: "officiant", isVerified: true },
      {
        _id: 1,
        name: 1,
        email: 1,
        specialization: 1,
        profilePicture: 1,
        bio: 1,
        bookingPackage: 1,
        languages: 1,
        location: 1,
      }
    ).sort({ name: 1 });

    res.json({
      success: true,
      data: officiants,
    });
  } catch (error) {
    console.error("Error fetching officiants:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch officiants",
      error: error.message,
    });
  }
});

// Get users who have messaged an officiant
router.get("/users-for-officiant/:officiantId", async (req, res) => {
  try {
    console.log("Fetching users for officiant chat", req.params);
    const { officiantId } = req.params;
    const User = require("../Models/UserCredential");

    // Find all private rooms involving this officiant
    const roomPattern = new RegExp(
      `private_.*${officiantId}.*|private_${officiantId}_.*`
    );

    // Get unique user IDs from chat messages in rooms involving this officiant
    const userMessages = await ChatMessage.aggregate([
      {
        $match: {
          roomId: { $regex: roomPattern },
          sender: { $ne: officiantId }, // Exclude messages from the officiant themselves
        },
      },
      {
        $group: {
          _id: "$sender",
          lastMessage: { $last: "$createdAt" },
          senderName: { $last: "$senderName" },
        },
      },
      {
        $sort: { lastMessage: -1 },
      },
    ]);

    // Get user details for each unique sender
    const userIds = userMessages.map((msg) => msg._id);
    const users = await User.find(
      {
        _id: { $in: userIds },
        role: { $ne: "officiant" }, // Ensure they are not officiants
      },
      {
        _id: 1,
        partner_1: 1,
        partner_2: 1,
        email: 1,
        profilePicture: 1,
        role: 1,
      }
    );

    // Combine user data with chat info
    const usersWithChatInfo = users
      .map((user) => {
        const chatInfo = userMessages.find(
          (msg) => msg._id.toString() === user._id.toString()
        );
        return {
          ...user.toObject(),
          name: user.name || user.partner_1 || "User",
          lastMessageTime: chatInfo?.lastMessage,
          online: false, // Will be updated by socket
        };
      })
      .sort(
        (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      );

    res.json({
      success: true,
      data: usersWithChatInfo,
    });
  } catch (error) {
    console.error("Error fetching users for officiant:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users for officiant",
      error: error.message,
    });
  }
});

// Create booking proposal message (for officiants)
router.post("/booking-proposal", async (req, res) => {
  try {
    const { roomId, sender, senderName, proposalDetails } = req.body;

    if (!roomId || !sender || !senderName || !proposalDetails) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: roomId, sender, senderName, proposalDetails",
      });
    }

    const bookingProposal = {
      id: `proposal_${Date.now()}`,
      type: "booking_proposal",
      title: proposalDetails.title || "Wedding Ceremony Booking",
      description: proposalDetails.description,
      price: proposalDetails.price,
      currency: proposalDetails.currency || "USD",
      features: proposalDetails.features || [],
      eventDate: proposalDetails.eventDate,
      location: proposalDetails.location,
      duration: proposalDetails.duration,
      packageId: proposalDetails.packageId,
      validUntil: proposalDetails.validUntil,
    };

    const message = new ChatMessage({
      roomId,
      sender,
      senderName,
      type: "booking_proposal",
      content: JSON.stringify(bookingProposal),
    });

    await message.save();

    res.json({
      success: true,
      message: "Booking proposal created successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error creating booking proposal:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create booking proposal",
      error: error.message,
    });
  }
});

// Handle booking proposal response
router.post("/booking-proposal/:messageId/respond", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { action, userId, userName } = req.body; // action: 'accept' or 'decline'

    if (!action || !userId || !userName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: action, userId, userName",
      });
    }

    const message = await ChatMessage.findOne({ messageId });
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Booking proposal not found",
      });
    }

    // Update the message to include response
    const proposalData = JSON.parse(message.content);
    proposalData.response = {
      action,
      respondedBy: userId,
      respondedByName: userName,
      respondedAt: new Date().toISOString(),
    };

    message.content = JSON.stringify(proposalData);
    await message.save();

    res.json({
      success: true,
      message: `Booking proposal ${action}ed successfully`,
      data: message,
      proposalData,
    });
  } catch (error) {
    console.error("Error responding to booking proposal:", error);
    res.status(500).json({
      success: false,
      message: "Failed to respond to booking proposal",
      error: error.message,
    });
  }
});

module.exports = router;
