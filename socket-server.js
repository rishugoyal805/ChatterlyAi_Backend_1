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
    origin: "*", // Set to your frontend domain in production
  },
});

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("join-room", (chatboxId) => {
    socket.join(chatboxId);
    console.log(`🟢 Joined room: ${chatboxId}`);
  });

  socket.on("send-message", async (data) => {
    const { senderEmail, chatboxId, text } = data;

    const { db } = await connectToDatabase();

    const message = {
      senderEmail,
      text,
      timestamp: new Date(),
    };

    await db.collection("chatboxes").updateOne(
      { _id: new ObjectId(chatboxId) },
      {$push: { messages: message },
      $set: { lastModified: new Date() }
      });

    io.to(chatboxId).emit("receive-message", message); // 🔄 broadcast to all in room
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

server.listen(3002, () => {
  console.log("🚀 WebSocket Server listening on http://localhost:3002");
});
