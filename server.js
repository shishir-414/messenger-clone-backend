const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5500",
        methods: ["GET", "POST"],
    },
});

// Middleware
app.use(cors());
app.use(express.json());

const users = {};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (userId) => {
        users[userId] = socket.id;
        console.log("Users:", users);
        io.emit("userList", Object.keys(users)); // Broadcast updated user list
    });

    socket.on("privateMessage", ({ senderId, receiverId, message, file }) => {
        console.log(`Message from ${senderId} to ${receiverId}: ${message}`);
        if (file) {
            console.log(`File sent: ${file.name}, Type: ${file.type}, Size: ${file.url ? file.url.length : 0} bytes`);
        }
        const receiverSocketId = users[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("receiveMessage", { senderId, message, file });
        } else {
            console.log(`Receiver ${receiverId} not found`);
        }
    });

    socket.on("typing", ({ senderId, receiverId }) => {
        const receiverSocketId = users[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("typing", { senderId });
            console.log(`${senderId} is typing to ${receiverId}`);
        }
    });

    socket.on("stopTyping", ({ senderId, receiverId }) => {
        const receiverSocketId = users[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("stopTyping");
            console.log(`${senderId} stopped typing to ${receiverId}`);
        }
    });

    // Video call signaling
    socket.on("callUser", ({ callerId, receiverId, offer }) => {
        const receiverSocketId = users[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("incomingCall", { callerId, offer });
            console.log(`Call from ${callerId} to ${receiverId}`);
        } else {
            socket.emit("callFailed", { receiverId });
            console.log(`Receiver ${receiverId} not available for call`);
        }
    });

    socket.on("answerCall", ({ callerId, receiverId, answer }) => {
        const callerSocketId = users[callerId];
        if (callerSocketId) {
            io.to(callerSocketId).emit("callAnswered", { receiverId, answer });
            console.log(`${receiverId} answered call from ${callerId}`);
        }
    });

    socket.on("iceCandidate", ({ targetId, candidate }) => {
        const targetSocketId = users[targetId];
        if (targetSocketId) {
            io.to(targetSocketId).emit("iceCandidate", { candidate });
            console.log(`ICE candidate sent to ${targetId}`);
        }
    });

    socket.on("endCall", ({ targetId }) => {
        const targetSocketId = users[targetId];
        if (targetSocketId) {
            io.to(targetSocketId).emit("callEnded");
            console.log(`Call ended with ${targetId}`);
        }
    });

    socket.on("disconnect", () => {
        for (let userId in users) {
            if (users[userId] === socket.id) {
                delete users[userId];
                console.log(`User disconnected: ${userId}, Socket ID: ${socket.id}`);
                io.emit("userList", Object.keys(users)); // Update user list
                break;
            }
        }
    });
});

app.get("/", (req, res) => {
    res.send("Server is running!");
});

const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server running on port ${port}`));