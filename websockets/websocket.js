// const WebSocket = require("ws");
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");

// const adminSockets = new Map();
// const userSockets = new Map();
// const OMSockets = new Map();
// const CEOSockets = new Map();

// function setupWebSocket(server) {
//     const wss = new WebSocket.Server({ server, verifyClient });

//     function verifyClient(info, done) {
//         const token = getTokenFromHeaders(info.req);

//         if (!token) {
//             console.log("❌ WebSocket connection rejected: No token provided.");
//             return done(false, 401, "Unauthorized");
//         }

//         try {
//             const decoded = jwt.verify(token, process.env.JWT_SECRET);
//             console.log("✅ WebSocket authenticated:", decoded.id);
//             info.req.user = decoded;
//             done(true);
//         } catch (err) {
//             console.error("❌ WebSocket auth error:", err.message);
//             done(false, 401, "Unauthorized");
//         }
//     }

//     function getTokenFromHeaders(req) {
//         return req.headers["sec-websocket-protocol"] || null;
//     }

//     wss.on("connection", async (ws, req) => {
//         try {
//             const user = await User.findById(req.user.id);
//             if (!user) {
//                 console.log("❌ User not found, closing WebSocket.");
//                 ws.close(1008, "Unauthorized");
//                 return;
//             }

//             ws.user = user;
//             console.log(`✅ WebSocket connection established for user: ${user.name} (${user.role})`);

//             // Store socket based on user role
//             if (user.role === "admin") {
//                 adminSockets.set(user.id, ws);
//                 console.log("👑 Admin added to WebSocket pool.");
//             }
//             else if (user.role === "operations_manager") {
//                 OMSockets.set(user.id, ws);
//                 console.log("👑 Operation Manager added to WebSocket pool.");
//             }
//             else if (user.role === "ceo") {
//                 CEOSockets.set(user.id, ws);
//                 console.log("👑 Ceo added to WebSocket pool.");
//             }
//             else {
//                 userSockets.set(user.id, ws);
//                 console.log("👤 User added to WebSocket pool.");
//             }

//             // Handle messages
//             ws.on("message", (message) => {
//                 const data = JSON.parse(message);
//                 console.log("📩 Received message:", data);

//                 // if (data.event === "admin_join") {
//                 //     notifyAdmins({ event: data.event, ws })
//                 //     console.log("Admin joined.");
//                 // }

//             });

//             // Handle disconnection
//             ws.on("close", () => {
//                 if (user.role === "admin") {
//                     adminSockets.delete(user.id);
//                     console.log("❌ Admin disconnected.");
//                 }
//                 else if (user.role === "ceo") {
//                     CEOSockets.delete(user.id);
//                     console.log("❌ CEO disconnected.");
//                 }
//                 else if (user.role === "operations_manager") {
//                     OMSockets.delete(user.id);
//                     console.log("❌ Operation Manager disconnected.");
//                 }
//                 else {
//                     userSockets.delete(user.id);
//                     console.log("❌ User disconnected.");
//                 }
//             });

//         } catch (err) {
//             console.error("❌ WebSocket error:", err.message);
//             ws.close(1008, "Unauthorized");
//         }
//     });

//     return wss;
// }

// // 🔔 Notify all admins
// function notifyAdmins(event, data) {
//     adminSockets.forEach((socket) => {
//         socket.send(JSON.stringify({ event, data }));
//     });
// }

// function notifyOMs(event, data) {
//     OMSockets.forEach((socket) => {
//         socket.send(JSON.stringify({ event, data }));
//     });
// }

// function notifyCEOs(event, data) {
//     CEOSockets.forEach((socket) => {
//         socket.send(JSON.stringify({ event, data }));
//     });
// }

// // 🔔 Notify specific users
// function notifyUsers(notify_users, event, data) {
//     // console.log(userSockets)
//     notify_users.forEach((userId) => {
//         const socket = userSockets.get(userId) || adminSockets.get(userId) || OMSockets.get(userId) || CEOSockets.get(userId);
//         console.log(socket)
//         if (socket) {
//             socket.send(JSON.stringify({ event, data }));
//         } else {
//             console.log(`❌ User ${userId} not connected.`);
//         }
//     });
// }


// module.exports = { setupWebSocket, notifyAdmins, notifyUsers, notifyOMs, notifyCEOs };
