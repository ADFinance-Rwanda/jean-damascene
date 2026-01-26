import { initSocket } from "../config/socket.js";

export const setupSockets = (httpServer) => {
    const io = initSocket(httpServer);

    return io;
};
