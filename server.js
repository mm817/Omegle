const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files (index.html, css, etc.)
app.use(express.static(path.join(__dirname, "public")));

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // If there is already a waiting user -> pair them
  if (waitingUser) {
    socket.emit("chatStart", { initiator: true });
    waitingUser.emit("chatStart", { initiator: false });

    socket.partner = waitingUser;
    waitingUser.partner = socket;

    waitingUser = null;
  } else {
    // Otherwise put user in waiting
    waitingUser = socket;
    socket.emit("waiting", "Waiting for a partner...");
  }

  // --- Handle chat messages ---
  socket.on("message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("message", msg);
    }
  });

  // --- Handle reports ---
  socket.on("report", (reason) => {
    console.log("User reported:", reason);
    // TODO: Save reports to DB or alert admin
  });

  // --- WebRTC signaling ---
  socket.on("webrtc-offer", (offer) => {
    if (socket.partner) {
      socket.partner.emit("webrtc-offer", offer);
    }
  });

  socket.on("webrtc-answer", (answer) => {
    if (socket.partner) {
      socket.partner.emit("webrtc-answer", answer);
    }
  });

  socket.on("webrtc-ice-candidate", (candidate) => {
    if (socket.partner) {
      socket.partner.emit("webrtc-ice-candidate", candidate);
    }
  });

  // --- Handle disconnects ---
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (waitingUser === socket) {
      waitingUser = null;
    }
    if (socket.partner) {
      socket.partner.emit("message", "Partner disconnected ❌");
      socket.partner.partner = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on port", PORT));