const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Waiting queue
let waitingUser = null;

// When a user connects
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  if (waitingUser) {
    // Pair with waiting user
    const partner = waitingUser;
    waitingUser = null;

    socket.partner = partner;
    partner.partner = socket;

    // Tell both they are connected
    socket.emit("chatStart", { initiator: true });
    partner.emit("chatStart", { initiator: false });

  } else {
    // Put in waiting
    waitingUser = socket;
    socket.emit("waiting", "⏳ Waiting for a partner...");
  }

  // Handle WebRTC offer
  socket.on("webrtc-offer", (offer) => {
    if (socket.partner) {
      socket.partner.emit("webrtc-offer", offer);
    }
  });

  // Handle WebRTC answer
  socket.on("webrtc-answer", (answer) => {
    if (socket.partner) {
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