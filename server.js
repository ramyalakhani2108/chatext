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
    console.log("A user connected:", socket.id);

    socket.on("userJoined", (name) => {
        if (name && typeof name === 'string' && name.trim()) {
            users[socket.id] = name.trim();
            console.log('User joined:', name, 'Socket ID:', socket.id);
            io.emit("updateUsers", Object.values(users));
            console.log('Emitted updateUsers:', Object.values(users));
        } else {
            console.log('Invalid name received:', name);
        }
    });

    socket.on("chatMessage", (msgData) => {
        if (msgData && msgData.message && users[socket.id]) {
            console.log('Chat message from:', users[socket.id], 'Message:', msgData.message);
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
            console.log(`${users[socket.id]} is typing...`);
            socket.broadcast.emit("typing", { name: users[socket.id] }); // Send to all except sender
        }
    });

    socket.on("stopTyping", () => {
        if (users[socket.id]) {
            console.log(`${users[socket.id]} stopped typing`);
            socket.broadcast.emit("stopTyping", { name: users[socket.id] });
        }
    });

    socket.on("disconnect", () => {
        const name = users[socket.id];
        delete users[socket.id];
        console.log('User disconnected:', name, 'Socket ID:', socket.id);
        io.emit("updateUsers", Object.values(users));
        console.log('Emitted updateUsers after disconnect:', Object.values(users));
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});