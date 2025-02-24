const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

const io = new Server(server, {
    cors: { origin: '*' } // Adjust for production security
});

const users = {}; // { socketId: username }

io.on("connection", (socket) => {

    socket.on("userJoined", (name) => {
        if (name && typeof name === 'string' && name.trim()) {
            users[socket.id] = name.trim();
            io.emit("updateUsers", Object.values(users));
        } else {
            console.log('Invalid name received:', name);
        }
    });

    socket.on("chatMessage", (msgData) => {
        if (msgData && msgData.message && users[socket.id]) {
            io.emit("chatMessage", {
                message: msgData.message,
                socketId: socket.id,
                name: users[socket.id]
            });
        }
    });

    socket.on("disconnect", () => {
        const name = users[socket.id];
        delete users[socket.id];
        io.emit("updateUsers", Object.values(users));
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});