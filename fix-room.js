// fix-room.js
const mongoose = require("mongoose");
require("dotenv").config();

const { ChatRoom } = require("./Models/ChatSchema");
const User = require("./Models/UserCredential");

async function fixRoom() {
  try {
    await mongoose.connect(process.env.MONGODBURL);
    console.log("🔗 Connected to database");

    const roomId = "private_68ed8c78c2691f3073594604_68ed97d6c2691f30735946fa";

    // Find the room
    const room = await ChatRoom.findOne({ roomId });
    console.log(
      "🔍 Current room participants:",
      room?.participants?.length || 0
    );

    if (room) {
      console.log(
        "🔍 Existing participants:",
        room.participants.map((p) => ({
          userId: p.userId,
          userName: p.userName,
        }))
      );
    }

    // Find Joy Sutradhar (officiant) - the first ID in the room name
    const officiantId = "68ed8c78c2691f3073594604";
    const officiant = await User.findById(officiantId).select(
      "_id name email role"
    );
    console.log("🔍 Officiant found:", officiant);

    if (officiant && room) {
      // Check if officiant is already in participants
      const hasOfficiant = room.participants.some(
        (p) => p.userId === officiantId
      );

      if (!hasOfficiant) {
        // Add officiant to room participants
        room.participants.push({
          userId: officiant._id.toString(),
          userName: officiant.name,
          role: "member",
          joinedAt: new Date(),
          isActive: true,
        });

        await room.save();
        console.log("✅ Added officiant to room participants");
      } else {
        console.log("ℹ️ Officiant already in room");
      }

      console.log("🔍 Final room participants:", room.participants.length);
      room.participants.forEach((p) => {
        console.log(`  - ${p.userName} (${p.userId})`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    mongoose.connection.close();
    console.log("🔚 Done");
  }
}

fixRoom();
