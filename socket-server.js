// socket-server.js
import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "./lib/mongodb.js";
import axios from "axios";

const app = express();
const server = http.createServer(app);
const onlineUsers = new Set();
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this
  },
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`✅ User ${socket.id} joined room: ${roomId}`);
  });

  socket.on("join-room", (email) => {
  socket.email = email;
  onlineUsers.add(email);

  // Notify all users somebody is online
  io.emit("user-online-status", {
    email,
    isOnline: true,
  });
});

  socket.on("send-message", async (data) => {
    const { senderEmail, roomId, text } = data;

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
        { _id: new ObjectId(roomId) },
        {
          $push: { messages: message._id },
          $set: { lastModified: new Date() },
        }
      );

      // 3. Emit the message (without _id, optionally include if needed)
      io.to(roomId).emit("receive-message", {
        roomId,
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

  socket.on("edit-message", async ({ messageId, newText, roomId }) => {
    try {
      const { db } = await connectToDatabase();

      await db.collection("frnd_msg").updateOne(
        { _id: new ObjectId(messageId) },
        { $set: { text: newText } }
      );

      io.to(roomId).emit("message-edited", {
        messageId,
        newText,
      });
    } catch (error) {
      console.error("❌ Error in edit-message:", error);
      socket.emit("error-message", { error: "Failed to edit message" });
    }
  });

  // ✅ Delete Message
  socket.on("delete-message", async ({ messageId, roomId }) => {
    try {
      const { db } = await connectToDatabase();

      await db.collection("frnd_msg").deleteOne({ _id: new ObjectId(messageId) });

      await db.collection("chatboxes").updateOne(
        { _id: new ObjectId(roomId) },
        { $pull: { messages: new ObjectId(messageId) } }
      );

      io.to(roomId).emit("message-deleted", {
        messageId,
      });
    } catch (error) {
      console.error("❌ Error in delete-message:", error);
      socket.emit("error-message", { error: "Failed to delete message" });
    }
  });

  socket.on("edit-user-message", ({ messageId, newText, senderEmail }) => {
    io.emit("receive-edited-message", { messageId, newText, senderEmail });
  });

  // When a new chat is created
  socket.on("chat-created", ({ chatbox, users }) => {
    users.forEach((userEmail) => {
      io.to(userEmail).emit("chat-created", { chatbox });
    });
  });

  // When a chat is deleted
  socket.on("chat-deleted", ({ chatboxId, users }) => {
    users.forEach((userEmail) => {
      io.to(userEmail).emit("chat-deleted", { chatboxId });
    });
  });

  socket.on("send-ai-message", async ({ roomId, senderName, text, role }) => {
    try {
      const { db } = await connectToDatabase()
      // Save user message
      const userMsgRes = await db.collection("messages").insertOne({
        senderName,
        text,
        role,
        timestamp: new Date(),
      });

      // Immediately broadcast the user message to all clients in the room
      io.to(roomId).emit("receive-user-message", {
        senderName,
        text,
        role,
        timestamp: new Date(), // optional, for sorting
      });

      // Get AI response
      let aiText = "Sorry, I'm having trouble responding right now.";
      try {
        const aiRes = await axios.post("https://askdemia.onrender.com/chat", {
          user_id: senderName,
          message: text,
        });
        aiText = aiRes?.data?.response ?? aiText;
      } catch (err) {
        console.error("AI service error:", err.message);
      }

      // Save AI response
      const aiMsgRes = await db.collection("messages").insertOne({
        senderName: "AI",
        text: aiText,
        role: "ai",
        timestamp: new Date(),
      });

      // Emit AI response back to sender
      io.to(roomId).emit("receive-bot-message", {
        role: "bot",
        text: aiText,
      });

      // Optionally: Save message pair if needed
      await db.collection("conversations").updateOne(
        { _id: new ObjectId(roomId) },
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
  if (socket.email) {
    onlineUsers.delete(socket.email);

    io.emit("user-online-status", {
      email: socket.email,
      isOnline: false,
    });
  }
});

});

const PORT = process.env.PORT || 3002;
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.head('/health', (req, res) => {
  res.status(200).end();
});

server.listen(PORT, () => {
  console.log(`🚀 WebSocket Server listening on port ${PORT}`);
});

