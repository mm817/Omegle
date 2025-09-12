import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  if (waitingUser) {
    io.to(socket.id).emit("partner-found");
    io.to(waitingUser).emit("partner-found");
    waitingUser = null;
  } else {
    waitingUser = socket.id;
  }

  // Signaling
  socket.on("offer", (offer) => socket.broadcast.emit("offer", offer));
  socket.on("answer", (answer) => socket.broadcast.emit("answer", answer));
  socket.on("ice-candidate", (candidate) => socket.broadcast.emit("ice-candidate", candidate));

  // Chat
  socket.on("chat-message", (msg) => socket.broadcast.emit("chat-message", msg));

  // Report
  socket.on("report", (reason) => {
    console.log("Report received:", reason);
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket.id) waitingUser = null;
  });
});

server.listen(3000, () => console.log("Server running on port 3000"));    if (socket.partner) {
      socket.partner.emit("webrtc-answer", answer);
    }
  });

  // Handle ICE candidates
  socket.on("webrtc-ice-candidate", (candidate) => {
    if (socket.partner) {
      socket.partner.emit("webrtc-ice-candidate", candidate);
    }
  });

  // Handle text messages
  socket.on("message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("message", msg);
    }
  });

  // Handle report
  socket.on("report", (reason) => {
    console.log(`⚠️ User ${socket.id} reported partner: ${reason}`);
    if (socket.partner) {
      socket.partner.emit("message", "⚠️ You were reported.");
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    if (socket.partner) {
      socket.partner.emit("message", "⚠️ Your partner disconnected.");
      socket.partner.partner = null;
    }

    if (waitingUser === socket) {
      waitingUser = null;
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});