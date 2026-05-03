import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { connectDb } from "./db.js";
import { createAuthRouter } from "./routes/auth.js";
import { createAdminRouter } from "./routes/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

if (!MONGODB_URI) {
  console.error("Укажите MONGODB_URI в файле server/.env");
  process.exit(1);
}

const corsOrigins =
  CORS_ORIGIN === "*"
    ? true
    : CORS_ORIGIN.split(",")
        .map((s) => s.trim())
        .filter(Boolean);

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);

app.use("/api/auth", createAuthRouter({ jwtSecret: JWT_SECRET }));
app.use("/api/admin", createAdminRouter({ jwtSecret: JWT_SECRET }));

const siteRoot = path.join(__dirname, "..", "..");
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(siteRoot));
app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "geoonline-api" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Внутренняя ошибка" });
});

await connectDb(MONGODB_URI);

const server = app.listen(PORT, () => {
  console.log(`Сайт және API: http://localhost:${PORT}/`);
  console.log(`Админка: http://localhost:${PORT}/admin.html`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Порт ${PORT} уже занят (EADDRINUSE). Другой экземпляр API уже запущен — откройте http://127.0.0.1:${PORT}/api/health ` +
        `или завершите процесс Node в диспетчере задач. Либо задайте в .env другой PORT (например 3001).`,
    );
    process.exit(1);
  }
  throw err;
});
