// Socket/socket.js
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs").promises;
const mongoose = require("mongoose");
const { ChatMessage, ChatRoom } = require("../Models/ChatSchema");

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: true, // Allow all origins
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    allowEIO3: true, // Allow Engine.IO v3 clients
    transports: ["polling", "websocket"], // Try polling first for better compatibility
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Store active users and rooms
  const activeUsers = new Map();
  const roomUsers = new Map();
  const onlineUsers = new Map(); // Track online status by userId

  io.on("connection", (socket) => {
    console.log("✅ Client connected:", socket.id);

    // Handle user coming online
    socket.on("userOnline", ({ userId, userName }) => {
      console.log(`📡 User ${userName} (${userId}) came online`);

      onlineUsers.set(userId, {
        userName,
        socketId: socket.id,
        lastSeen: new Date(),
      });

      // Broadcast to all rooms this user is part of
      const userRooms = Array.from(roomUsers.keys()).filter((roomId) => {
        const roomUserList = roomUsers.get(roomId);
        return Array.from(roomUserList).some((u) => u.userId === userId);
      });

      console.log(
        `📡 Broadcasting online status for ${userName} to rooms: ${userRooms.join(
          ", "
        )}`
      );

      userRooms.forEach((roomId) => {
        socket.to(roomId).emit("userStatusChanged", {
          userId,
          userName,
          isOnline: true,
          lastSeen: new Date(),
        });
      });

      // Also broadcast to any potential private rooms (for cases where user might not be in room yet)
      // This is especially important for the initial online status broadcast
      io.emit("userStatusChanged", {
        userId,
        userName,
        isOnline: true,
        lastSeen: new Date(),
      });
    });

    // Handle user going offline
    socket.on("userOffline", ({ userId, userName }) => {
      console.log(`📡 User ${userName} (${userId}) went offline`);

      if (onlineUsers.has(userId)) {
        onlineUsers.delete(userId);

        // Broadcast to all rooms this user is part of
        const userRooms = Array.from(roomUsers.keys()).filter((roomId) => {
          const roomUserList = roomUsers.get(roomId);
          return Array.from(roomUserList).some((u) => u.userId === userId);
        });

        console.log(
          `📡 Broadcasting offline status for ${userName} to rooms: ${userRooms.join(
            ", "
          )}`
        );

        userRooms.forEach((roomId) => {
          socket.to(roomId).emit("userStatusChanged", {
            userId,
            userName,
            isOnline: false,
            lastSeen: new Date(),
          });
        });

        // Also broadcast globally for immediate status update
        io.emit("userStatusChanged", {
          userId,
          userName,
          isOnline: false,
          lastSeen: new Date(),
        });
      }
    });

    // Handle request for online users list
    socket.on("getOnlineUsers", () => {
      const onlineUserIds = Array.from(onlineUsers.keys());
      console.log(`📡 Sending online users list to client:`, onlineUserIds);
      socket.emit("onlineUsersList", { onlineUsers: onlineUserIds });
    });

    // Handle joining a chat room
    socket.on("joinRoom", async ({ roomId, userId, userName }) => {
      socket.join(roomId);

      // Store user info
      activeUsers.set(socket.id, { userId, userName, roomId });

      // Add user to room
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Set());
      }
      roomUsers.get(roomId).add({ socketId: socket.id, userId, userName });

      console.log(`👤 User ${userName} (${userId}) joined room ${roomId}`);

      try {
        // Create or update room in database
        let room = await ChatRoom.findOne({ roomId });

        if (!room) {
          room = await ChatRoom.createRoom({
            roomId,
            type: "private",
            participants: [
              {
                userId,
                userName,
                role: "member",
                joinedAt: new Date(),
                isActive: true,
              },
            ],
          });
        } else {
          // Add participant if not already in room
          const existingParticipant = room.participants.find(
            (p) => p.userId === userId
          );
          if (!existingParticipant) {
            await ChatRoom.addParticipant(roomId, {
              userId,
              userName,
              role: "member",
              joinedAt: new Date(),
              isActive: true,
            });
          } else {
            // Update last seen
            await ChatRoom.findOneAndUpdate(
              { roomId, "participants.userId": userId },
              {
                $set: {
                  "participants.$.lastSeenAt": new Date(),
                  "participants.$.isActive": true,
                },
              }
            );
          }
        }

        // Send existing messages to the user who just joined
        console.log(`🔍 Loading messages for room: ${roomId}`);
        const existingMessages = await ChatMessage.find({
          roomId,
          isDeleted: false,
        })
          .sort({ createdAt: 1 })
          .limit(50) // Load last 50 messages
          .exec();

        console.log(
          `📊 Found ${existingMessages.length} existing messages for room ${roomId}`
        );

        // Always emit loadExistingMessages, even if empty
        socket.emit("loadExistingMessages", {
          roomId,
          messages: existingMessages,
        });

        if (existingMessages.length > 0) {
          const bookingProposals = existingMessages.filter(
            (msg) => msg.type === "booking_proposal"
          );
          console.log(`📤 Sent ${existingMessages.length} messages to client`);
        } else {
          console.log(
            `📭 No existing messages found for room ${roomId} - sent empty array`
          );
        }
      } catch (error) {
        console.error("Error managing room in database:", error);
        socket.emit("joinError", {
          error: "Failed to join room",
          roomId,
        });
      }

      // Notify others in the room
      socket.to(roomId).emit("userJoined", {
        userId,
        userName,
        message: `${userName} joined the chat`,
      });

      // If user is now online, broadcast their status to the room
      if (onlineUsers.has(userId)) {
        socket.to(roomId).emit("userStatusChanged", {
          userId,
          userName,
          isOnline: true,
          lastSeen: new Date(),
        });
      }

      // Send current online users in room
      const currentUsers = roomUsers.get(roomId);
      const userList = currentUsers
        ? Array.from(currentUsers).map((u) => ({
            userId: u.userId,
            userName: u.userName,
          }))
        : [];

      socket.emit("roomUsers", { roomId, users: userList });

      // Send online status of all users in this room to the newly joined user
      const roomUserIds = Array.from(currentUsers || []).map((u) => u.userId);
      roomUserIds.forEach((rUserId) => {
        if (rUserId !== userId && onlineUsers.has(rUserId)) {
          const onlineUser = onlineUsers.get(rUserId);
          socket.emit("userStatusChanged", {
            userId: rUserId,
            userName: onlineUser.userName,
            isOnline: true,
            lastSeen: onlineUser.lastSeen,
          });
        }
      });
    });

    // Handle sending messages
    socket.on("sendMessage", async (data) => {
      console.log("📩 Message received:", data);

      const { roomId, sender, senderName, type, content, timestamp } = data;

      // Add server timestamp if not provided
      const messageData = {
        ...data,
        timestamp: timestamp || new Date().toISOString(),
        serverId: `msg_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      };

      try {
        // Save message to database
        const chatMessage = new ChatMessage({
          messageId: messageData.serverId,
          roomId,
          sender,
          senderName,
          type: type || "text",
          content,
          fileData: data.fileData || null,
          replyTo: data.replyTo || null,
        });

        await chatMessage.save();

        // Broadcast to all OTHER clients in the room (excluding sender)
        socket.to(roomId).emit("receiveMessage", {
          ...messageData,
          _id: chatMessage._id,
          messageId: chatMessage.messageId,
          createdAt: chatMessage.createdAt,
        });

        // Send confirmation back to sender only
        socket.emit("messageConfirmed", {
          ...messageData,
          _id: chatMessage._id,
          messageId: chatMessage.messageId,
          createdAt: chatMessage.createdAt,
        });

        // Log message for debugging
        console.log(
          `💬 Message in room ${roomId}: ${senderName} sent ${type}: ${content.substring(
            0,
            50
          )}...`
        );
      } catch (error) {
        console.error("Error saving message:", error);

        // Still broadcast even if database save fails
        io.to(roomId).emit("receiveMessage", messageData);

        // Send error to sender
        socket.emit("messageError", {
          error: "Failed to save message",
          originalMessage: messageData,
        });
      }
    });

    // Handle typing indicators
    socket.on("typing", ({ roomId, userId, userName, isTyping }) => {
      socket.to(roomId).emit("userTyping", {
        userId,
        userName,
        isTyping,
      });
    });

    // Handle file sharing
    socket.on("shareFile", (fileData) => {
      const { roomId } = fileData;
      console.log("📎 File shared:", fileData.originalName);

      // Broadcast file to all users in room
      io.to(roomId).emit("receiveMessage", {
        ...fileData,
        timestamp: new Date().toISOString(),
        serverId: `file_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      });
    });

    // Handle booking proposals
    socket.on("send_booking_proposal", async (data) => {
      console.log("📅 Booking proposal received:", data);

      const { roomId, bookingData, message } = data;

      try {
        // Create booking proposal message
        const messageData = {
          roomId,
          sender: bookingData.officiantId,
          senderName: bookingData.officiantName,
          type: "booking_proposal",
          content: message || `Booking proposal for ${bookingData.eventName}`,
          bookingData: bookingData,
          timestamp: new Date().toISOString(),
          serverId: `booking_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
        };

        // Save booking proposal to database
        const chatMessage = new ChatMessage({
          messageId: messageData.serverId,
          roomId,
          sender: bookingData.officiantId,
          senderName: bookingData.officiantName,
          type: "booking_proposal",
          content: messageData.content,
          bookingData: bookingData,
        });

        console.log("💾 Saving booking proposal to database:", {
          messageId: messageData.serverId,
          roomId,
          type: "booking_proposal",
          bookingData: bookingData,
        });

        const savedMessage = await chatMessage.save();
        console.log("✅ Booking proposal saved with ID:", savedMessage._id);

        // Broadcast to all users in the room (including sender) - this ensures everyone gets it exactly once
        const broadcastData = {
          ...messageData,
          _id: savedMessage._id,
          messageId: savedMessage.messageId,
          createdAt: savedMessage.createdAt,
        };

        console.log(
          "📡 Broadcasting booking proposal to room:",
          roomId,
          broadcastData
        );
        io.to(roomId).emit("booking_proposal_received", broadcastData);

        console.log(
          `📅 Booking proposal sent in room ${roomId}: ${bookingData.eventName} for $${bookingData.price}`
        );
      } catch (error) {
        console.error("Error sending booking proposal:", error);
        socket.emit("booking_proposal_error", {
          error: "Failed to send booking proposal",
          originalData: data,
        });
      }
    });

    // Handle booking proposal responses
    socket.on("booking_proposal_response", async (data) => {
      console.log("📅 Booking proposal response received:", data);

      const { roomId, messageId, response, bookingData } = data;

      try {
        // Update the booking proposal status in the database
        // Try to find by either _id (as ObjectId) or messageId field
        let query;
        if (mongoose.Types.ObjectId.isValid(messageId)) {
          query = {
            $or: [
              { _id: new mongoose.Types.ObjectId(messageId) },
              { messageId: messageId },
            ],
            type: "booking_proposal",
          };
        } else {
          query = {
            messageId: messageId,
            type: "booking_proposal",
          };
        }

        console.log("🔍 Searching for booking proposal with query:", query);

        const updatedMessage = await ChatMessage.findOneAndUpdate(
          query,
          {
            $set: {
              "bookingData.status":
                response === "accept" ? "accepted" : "declined",
              "bookingData.respondedBy":
                bookingData?.clientId || bookingData?.respondedBy,
              "bookingData.respondedAt": new Date(),
            },
          },
          { new: true }
        );

        console.log("📝 Updated message:", updatedMessage);

        if (updatedMessage) {
          // Broadcast the updated booking proposal to all users in the room
          // This will update the original message for both officiant and client
          const responseData = {
            messageId: messageId,
            response: response,
            userId: bookingData?.clientId || bookingData?.respondedBy,
            bookingData: updatedMessage.bookingData,
          };

          console.log(
            "📡 Broadcasting response to room:",
            roomId,
            responseData
          );
          io.to(roomId).emit(
            "booking_proposal_response_received",
            responseData
          );

          console.log(
            `📅 Booking proposal ${response}ed in room ${roomId}: ${updatedMessage.bookingData?.eventName}`
          );
        } else {
          console.error(
            "❌ Could not find booking proposal message to update with messageId:",
            messageId
          );

          // Try to find any booking proposal in this room for debugging
          const allBookingProposals = await ChatMessage.find({
            roomId,
            type: "booking_proposal",
          });
          console.log(
            "🔍 All booking proposals in room:",
            allBookingProposals.map((m) => ({
              _id: m._id,
              messageId: m.messageId,
              eventName: m.bookingData?.eventName,
            }))
          );
        }
      } catch (error) {
        console.error("Error processing booking proposal response:", error);
        socket.emit("booking_proposal_response_error", {
          error: "Failed to process booking proposal response",
          originalData: data,
        });
      }
    });

    // Handle leaving a room
    socket.on("leaveRoom", ({ roomId, userId, userName }) => {
      socket.leave(roomId);

      // Remove user from room
      if (roomUsers.has(roomId)) {
        const users = roomUsers.get(roomId);
        // Convert Set to Array to use find, then delete the found user
        const userArray = Array.from(users);
        const userToDelete = userArray.find((u) => u.socketId === socket.id);
        if (userToDelete) {
          users.delete(userToDelete);
        }

        if (users.size === 0) {
          roomUsers.delete(roomId);
        }
      }

      // Notify others in the room
      socket.to(roomId).emit("userLeft", {
        userId,
        userName,
        message: `${userName} left the chat`,
      });

      console.log(`👋 User ${userName} left room ${roomId}`);
    });

    // Handle getting room users
    socket.on("getRoomUsers", (roomId) => {
      const users = roomUsers.get(roomId);
      const userList = users
        ? Array.from(users).map((u) => ({
            userId: u.userId,
            userName: u.userName,
          }))
        : [];

      socket.emit("roomUsers", { roomId, users: userList });
    });

    // Handle message reactions
    socket.on(
      "addReaction",
      async ({ messageId, roomId, emoji, userId, userName }) => {
        try {
          // Save reaction to database
          await ChatMessage.findOneAndUpdate(
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
            }
          );

          io.to(roomId).emit("messageReaction", {
            messageId,
            emoji,
            userId,
            userName,
            action: "add",
          });
        } catch (error) {
          console.error("Error adding reaction:", error);
          socket.emit("reactionError", {
            error: "Failed to add reaction",
            messageId,
          });
        }
      }
    );

    socket.on(
      "removeReaction",
      async ({ messageId, roomId, emoji, userId, userName }) => {
        try {
          // Remove reaction from database
          await ChatMessage.findOneAndUpdate(
            { messageId },
            {
              $pull: {
                reactions: {
                  emoji,
                  userId,
                },
              },
            }
          );

          io.to(roomId).emit("messageReaction", {
            messageId,
            emoji,
            userId,
            userName,
            action: "remove",
          });
        } catch (error) {
          console.error("Error removing reaction:", error);
          socket.emit("reactionError", {
            error: "Failed to remove reaction",
            messageId,
          });
        }
      }
    );

    // Handle message status updates (read receipts)
    socket.on(
      "markAsRead",
      async ({ roomId, messageIds, userId, userName }) => {
        try {
          // Update read status in database
          await ChatMessage.markAsRead(messageIds, userId, userName);

          socket.to(roomId).emit("messagesRead", {
            messageIds,
            userId,
            userName,
            readAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error marking messages as read:", error);
          socket.emit("readError", {
            error: "Failed to mark messages as read",
            messageIds,
          });
        }
      }
    );

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);

      const user = activeUsers.get(socket.id);
      if (user) {
        const { roomId, userId, userName } = user;

        // Remove from online users
        if (onlineUsers.has(userId)) {
          onlineUsers.delete(userId);

          // Broadcast offline status to all rooms this user was part of
          const userRooms = Array.from(roomUsers.keys()).filter((rId) => {
            const roomUserList = roomUsers.get(rId);
            return Array.from(roomUserList).some((u) => u.userId === userId);
          });

          userRooms.forEach((rId) => {
            socket.to(rId).emit("userStatusChanged", {
              userId,
              userName,
              isOnline: false,
              lastSeen: new Date(),
            });
          });
        }

        // Remove from room users
        if (roomUsers.has(roomId)) {
          const users = roomUsers.get(roomId);
          // Convert Set to Array to use find, then delete the found user
          const userArray = Array.from(users);
          const userToDelete = userArray.find((u) => u.socketId === socket.id);
          if (userToDelete) {
            users.delete(userToDelete);
          }

          if (users.size === 0) {
            roomUsers.delete(roomId);
          }
        }

        // Notify room about user leaving
        socket.to(roomId).emit("userLeft", {
          userId,
          userName,
          message: `${userName} disconnected`,
        });

        activeUsers.delete(socket.id);
      }
    });

    // Error handling
    socket.on("error", (error) => {
      console.error("❗ Socket error:", error);
    });
  });

  return io;
}

module.exports = setupSocket;
