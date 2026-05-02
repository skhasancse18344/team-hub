import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import profileRouter from "./routes/profile";
import workspaceRouter, { inviteRouter } from "./routes/workspace";
import notificationRouter from "./routes/notification";
import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./socket";

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: process.env.CLIENT_URL ?? "http://localhost:3000",
  credentials: true, // required for cookies cross-origin
}));
app.use(express.json());
app.use(cookieParser());

app.use("/", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/workspaces", workspaceRouter);
app.use("/api/invites", inviteRouter);
app.use("/api/notifications", notificationRouter);
app.use(errorHandler);

initSocket(httpServer);

const PORT = process.env.PORT ?? 4000;

httpServer.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
