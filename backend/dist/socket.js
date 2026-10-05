import { Server } from "socket.io";
let io;
export function initializeSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173",
            methods: ["GET", "POST", "PATCH", "DELETE"],
        },
    });
    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);
        socket.on("join-organization", (organizationId) => {
            if (!organizationId) {
                return;
            }
            socket.join(`organization:${organizationId}`);
            console.log(`Socket ${socket.id} joined organization:${organizationId}`);
            socket.emit("organization-joined", {
                organizationId,
            });
        });
        socket.on("leave-organization", (organizationId) => {
            if (!organizationId) {
                return;
            }
            socket.leave(`organization:${organizationId}`);
            console.log(`Socket ${socket.id} left organization:${organizationId}`);
        });
        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
    return io;
}
export function getIO() {
    if (!io) {
        throw new Error("Socket.IO has not been initialized");
    }
    return io;
}
//# sourceMappingURL=socket.js.map