// socket-server.js
import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "./lib/mongodb.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this
  },
});

io.on("connection", (socket) => {
  socket.on("join-room", (chatboxId) => {
    socket.join(chatboxId);
  });

  socket.on("send-message", async (data) => {
    const { senderEmail, chatboxId, text } = data;

    try {
      const { db } = await connectToDatabase();

      // Create a unique message document
      const message = {
        _id: new ObjectId(),
        senderEmail,
        text,
        timestamp: new Date(),
      };

      // 1. Store the full message in the frnd_msg collection
      await db.collection("frnd_msg").insertOne(message);

      // 2. Store only the message _id in the chatboxes.messages array
      await db.collection("chatboxes").updateOne(
        { _id: new ObjectId(chatboxId) },
        {
          $push: { messages: message._id },
          $set: { lastModified: new Date() },
        }
      );

      // 3. Emit the message (without _id, optionally include if needed)
      io.to(chatboxId).emit("receive-message", {
        chatboxId,
        senderEmail,
        text,
        timestamp: message.timestamp.toISOString(),
        _id: message._id.toString(), // Optional, if you want to send this
      });

    } catch (error) {
      console.error("❌ Error in send-message:", error);
      socket.emit("error-message", { error: "Failed to send message" });
    }
  });

   socket.on("edit-message", async ({ messageId, newText, chatboxId }) => {
    try {
      const { db } = await connectToDatabase();

      await db.collection("frnd_msg").updateOne(
        { _id: new ObjectId(messageId) },
        { $set: { text: newText } }
      );

      io.to(chatboxId).emit("message-edited", {
        messageId,
        newText,
      });
    } catch (error) {
      console.error("❌ Error in edit-message:", error);
      socket.emit("error-message", { error: "Failed to edit message" });
    }
  });

  // ✅ Delete Message
  socket.on("delete-message", async ({ messageId, chatboxId }) => {
    try {
      const { db } = await connectToDatabase();

      await db.collection("frnd_msg").deleteOne({ _id: new ObjectId(messageId) });

      await db.collection("chatboxes").updateOne(
        { _id: new ObjectId(chatboxId) },
        { $pull: { messages: new ObjectId(messageId) } }
      );

      io.to(chatboxId).emit("message-deleted", {
        messageId,
      });
    } catch (error) {
      console.error("❌ Error in delete-message:", error);
      socket.emit("error-message", { error: "Failed to delete message" });
    }
  });

  socket.on("send-ai-message", async ({ chatboxId, senderName, text, role }) => {
    try {
      // Save user message
      const userMsgRes = await db.collection("messages").insertOne({
        senderName,
        text,
        role,
        timestamp: new Date(),
      });

      // Get AI response
      const aiRes = await axios.post("https://askdemia1.onrender.com/chat", {
        user_id: senderName,
        message: text,
      });

      const aiText = aiRes?.data?.response || "Unexpected response.";

      // Save AI response
      const aiMsgRes = await db.collection("messages").insertOne({
        senderName: "AI",
        text: aiText,
        role: "ai",
        timestamp: new Date(),
      });

      // Emit AI response back to sender
      io.to(chatboxId).emit("receive-bot-message", {
        role: "bot",
        text: aiText,
      });

      // Optionally: Save message pair if needed
      await db.collection("conversations").updateOne(
        { _id: new ObjectId(chatboxId) },
        {
          $push: {
            messages: {
              userMessageId: userMsgRes.insertedId,
              aiResponseId: aiMsgRes.insertedId,
            },
          },
        }
      );
    } catch (err) {
      console.error("Socket error:", err);
      socket.emit("error-message", "Something went wrong on the server.");
    }
  });
  socket.on("disconnect", () => {
    //console.log("❌ Socket disconnected:", socket.id);
  });
});

server.listen(3002, () => {
  //console.log("🚀 WebSocket Server listening on http://localhost:3002");
});
