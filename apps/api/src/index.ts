import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ?? "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cors({
  origin: process.env.CLIENT_URL ?? "http://localhost:3000",
  credentials: true, // required for cookies cross-origin
}));
app.use(express.json());
app.use(cookieParser());

app.use("/", healthRouter);
app.use("/api/auth", authRouter);
app.use(errorHandler);

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT ?? 4000;

httpServer.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
