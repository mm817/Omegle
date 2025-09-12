// server.js (CommonJS)
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();

// If you want to serve frontend from backend (optional):
// app.use(express.static(path.join(__dirname, "../frontend/public")));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // when deploying, you can restrict to your Netlify domain
    methods: ["GET", "POST"]
  }
});

// Simple waiting queue (pair users one-to-one)
let waitingSocketId = null;
const sockets = {}; // socket.id -> socket reference (for safety if you need more later)

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  sockets[socket.id] = socket;

  // pairing logic
  if (waitingSocketId && waitingSocketId !== socket.id) {
    const partnerId = waitingSocketId;
    const partnerSocket = sockets[partnerId];

    // clear waiting
    waitingSocketId = null;

    // notify both sides that a partner is found
    socket.emit("chatStart", { initiator: true, partnerId });
    partnerSocket.emit("chatStart", { initiator: false, partnerId: socket.id });

    // store partners on socket objects
    socket.partnerId = partnerId;
    partnerSocket.partnerId = socket.id;
  } else {
    waitingSocketId = socket.id;
    socket.emit("waiting", "⏳ Waiting for a partner...");
  }

  // ---------- Signaling ----------
  socket.on("webrtc-offer", (offer) => {
    const pid = socket.partnerId;
    if (pid && sockets[pid]) sockets[pid].emit("webrtc-offer", offer);
  });

  socket.on("webrtc-answer", (answer) => {
    const pid = socket.partnerId;
    if (pid && sockets[pid]) sockets[pid].emit("webrtc-answer", answer);
  });

  socket.on("webrtc-ice-candidate", (candidate) => {
    const pid = socket.partnerId;
    if (pid && sockets[pid]) sockets[pid].emit("webrtc-ice-candidate", candidate);
  });

  // ---------- Chat ----------
  socket.on("message", (msg) => {
    const pid = socket.partnerId;
    if (pid && sockets[pid]) sockets[pid].emit("message", msg);
  });

  // ---------- Report ----------
  socket.on("report", (reason) => {
    console.log(`Report from ${socket.id} about ${socket.partnerId || "unknown"}:`, reason);
    const pid = socket.partnerId;
    if (pid && sockets[pid]) sockets[pid].emit("message", "⚠️ You were reported.");
    // TODO: store report in DB or notify admin
  });

  // ---------- Disconnect ----------
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // if they were waiting, clear waiting
    if (waitingSocketId === socket.id) waitingSocketId = null;

    // tell partner that this socket disconnected
    const pid = socket.partnerId;
    if (pid && sockets[pid]) {
      sockets[pid].emit("message", "⚠️ Your partner disconnected.");
      sockets[pid].partnerId = null;
    }

    delete sockets[socket.id];
  });
});

// Start server (Render provides PORT in env)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});