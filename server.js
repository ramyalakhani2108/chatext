const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

const io = new Server(server, {
    cors: { origin: '*' }
});

const users = {};

io.on("connection", (socket) => {

    socket.on("userJoined", (name) => {
        if (name && typeof name === 'string' && name.trim()) {
            users[socket.id] = name.trim();
            io.emit("updateUsers", Object.values(users));
        } else {
        }
    });

    socket.on("chatMessage", (msgData) => {
        if (msgData && msgData.message && users[socket.id]) {
            io.emit("chatMessage", {
                message: msgData.message,
                socketId: socket.id,
                name: users[socket.id],
                replyTo: msgData.replyTo
            });
        }
    });

    socket.on("typing", () => {
        if (users[socket.id]) {
            socket.broadcast.emit("typing", { name: users[socket.id] }); // Send to all except sender
        }
    });

    socket.on("stopTyping", () => {
        if (users[socket.id]) {
            socket.broadcast.emit("stopTyping", { name: users[socket.id] });
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