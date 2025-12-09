// socket-server.js
import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);
const onlineUsers = new Set();
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("join-chat-room", (roomId) => {
    socket.join(roomId);
  });

  socket.on("online-room", (email) => {
    socket.email = email;
    onlineUsers.add(email);

    socket.join(email);
    io.emit("user-online-status", {
      email,
      isOnline: true,
    });
  });

  socket.on("request-online-users", () => {
    socket.emit("online-users-list", Array.from(onlineUsers));
  });

  socket.on("send-message", async (data) => {
    const { senderEmail, roomId, text } = data;

    try {
      io.to(roomId).emit("receive-message", {
        chatboxId: roomId,
        senderEmail,
        text,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      socket.emit("error-message", { error: "Failed to send message" });
    }
  });

  socket.on("edit-message", async ({ messageId, newText, roomId }) => {
    try {
      io.to(roomId).emit("message-edited", {
        messageId,
        newText,
      });
    } catch (error) {
      socket.emit("error-message", { error: "Failed to edit message" });
    }
  });

  socket.on("delete-message", async ({ messageId, roomId }) => {
    try {

      io.to(roomId).emit("message-deleted", {
        messageId,
      });
    } catch (error) {
      socket.emit("error-message", { error: "Failed to delete message" });
    }
  });

  socket.on("chat-created", ({ chatbox, users }) => {
    users.forEach((userEmail) => {
      io.to(userEmail).emit("chat-created", { chatbox });
    });
  });

  socket.on("chat-deleted", ({ chatboxId, users }) => {
    users.forEach((userEmail) => {
      io.to(userEmail).emit("chat-deleted", { chatboxId });
    });
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
});

