import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export function requireAuth(secret) {
  return async (req, res, next) => {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "Требуется токен" });
    try {
      const payload = jwt.verify(token, secret);
      const user = await User.findById(payload.sub).lean();
      if (!user) return res.status(401).json({ message: "Пользователь не найден" });
      req.user = {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      };
      next();
    } catch {
      return res.status(401).json({ message: "Недействительный токен" });
    }
  };
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Нужны права администратора" });
  }
  next();
}

/** Көру: әкімші немесе мұғалім (тізім, стат, журнал — тек оқу). */
export function requireStaff(req, res, next) {
  const r = req.user?.role;
  if (r === "admin" || r === "teacher") return next();
  return res.status(403).json({ message: "Нужны права администратора или преподавателя" });
}
