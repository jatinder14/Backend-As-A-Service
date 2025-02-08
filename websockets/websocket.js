const WebSocket = require("ws");

const adminSockets = new Set(); // Store admin connections

// Initialize WebSocket Server
function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on("connection", (ws) => {
        console.log("New WebSocket client connected.");

        ws.on("message", (message) => {
            const data = JSON.parse(message);
            console.log("Data: ", data);

            if (data.event === "admin_join") {
                adminSockets.add(ws);
                console.log("Admin joined.");
            }
        });

        ws.on("close", () => {
            adminSockets.delete(ws);
            console.log("WebSocket client disconnected.");
        });
    });

    return wss;
}

// Function to send messages to all admin clients
function notifyAdmins(event, data) {
    adminSockets.forEach((socket) => {
        console.log(socket, data, event);
        socket.send(JSON.stringify({ event, data }));
    });
}

module.exports = { setupWebSocket, notifyAdmins };
