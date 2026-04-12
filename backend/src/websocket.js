import { Server } from "socket.io";
import config from "./config/index.js";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on("subscribe", (jobId) => {
      socket.join(`job:${jobId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function emitProgress(jobId, data) {
  if (io) {
    io.to(`job:${jobId}`).emit("progress", { jobId, ...data });
  }
}

export function emitComplete(jobId, data) {
  if (io) {
    io.to(`job:${jobId}`).emit("complete", { jobId, ...data });
  }
}

export function emitError(jobId, error) {
  if (io) {
    io.to(`job:${jobId}`).emit("error", { jobId, error });
  }
}
