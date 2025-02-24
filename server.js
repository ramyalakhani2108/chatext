const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

const io = new Server(server, {
    cors: { origin: '*' }
});

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('chatMessage', (msgData) => {
        console.log('Server received:', `${msgData.name}: ${msgData.message}`); 
        io.emit('chatMessage', { 
            message: msgData.message, 
            socketId: socket.id, 
            name: msgData.name 
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});