const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let waitingUser = null;

io.on('connection', socket => {
    console.log('User connected:', socket.id);

    if (waitingUser) {
        socket.emit('chatStart', { partnerId: waitingUser.id });
        waitingUser.emit('chatStart', { partnerId: socket.id });

        socket.partner = waitingUser;
        waitingUser.partner = socket;

        waitingUser = null;
    } else {
        waitingUser = socket;
        socket.emit('waiting', 'Waiting for a partner...');
    }

    socket.on('message', msg => { if(socket.partner) socket.partner.emit('message', msg); });
    socket.on('webrtc-offer', data => { if(socket.partner) socket.partner.emit('webrtc-offer', data); });
    socket.on('webrtc-answer', data => { if(socket.partner) socket.partner.emit('webrtc-answer', data); });
    socket.on('webrtc-ice-candidate', data => { if(socket.partner) socket.partner.emit('webrtc-ice-candidate', data); });
    socket.on('report', reason => { if(socket.partner) socket.partner.emit('reported', 'You were reported!'); });

    socket.on('disconnect', () => {
        if(waitingUser === socket) waitingUser = null;
        if(socket.partner) {
            socket.partner.emit('partnerLeft', 'Your partner left the chat.');
            socket.partner.partner = null;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));