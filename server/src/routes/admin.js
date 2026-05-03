import { Router } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { PromoCode } from "../models/PromoCode.js";
import { LoginLog } from "../models/LoginLog.js";
import { mergeTopicsWithDefaults } from "../lib/dashboardDefaults.js";
import { requireAuth, requireAdmin, requireStaff } from "../middleware/auth.js";

function overallTopicProgressPct(leanUser) {
  const topics = mergeTopicsWithDefaults(leanUser.dashboardState?.topics);
  if (!topics.length) return 0;
  const s = topics.reduce((a, x) => a + (Number(x.percent) || 0), 0);
  return Math.round(s / topics.length);
}

function maskPhoneForLeaderboard(phone) {
  const s = String(phone || "").trim();
  if (s.length <= 6) return s || "—";
  return s.slice(0, Math.min(5, s.length)) + "···" + s.slice(-2);
}

export function createAdminRouter({ jwtSecret }) {
  const r = Router();
  const auth = requireAuth(jwtSecret);
  const staff = [auth, requireStaff];
  const adminOnly = [auth, requireAdmin];

  r.get("/users", ...staff, async (req, res) => {
    try {
      const users = await User.find().sort({ createdAt: -1 }).limit(200).lean();
      res.json({
        users: users.map((u) => ({
          id: u._id.toString(),
          phone: u.phone,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt,
        })),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.get("/stats", ...staff, async (req, res) => {
    try {
      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        admins,
        regularUsers,
        teachers,
        promoCodesCount,
        promoCodesActive,
        registrationsLast7Days,
        registrationsLast30Days,
        usesAgg,
        loginsLast7Days,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "user" }),
        User.countDocuments({ role: "teacher" }),
        PromoCode.countDocuments(),
        PromoCode.countDocuments({ active: true }),
        User.countDocuments({ createdAt: { $gte: d7 } }),
        User.countDocuments({ createdAt: { $gte: d30 } }),
        PromoCode.aggregate([{ $group: { _id: null, sum: { $sum: "$uses" } } }]),
        LoginLog.countDocuments({ createdAt: { $gte: d7 } }),
      ]);

      const promoRedemptionsTotal = Number(usesAgg[0]?.sum) || 0;

      res.json({
        totalUsers,
        admins,
        regularUsers,
        teachers,
        promoCodesCount,
        promoCodesActive,
        promoRedemptionsTotal,
        registrationsLast7Days,
        registrationsLast30Days,
        loginsLast7Days,
        serverUptimeSec: Math.floor(process.uptime()),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.get("/login-logs", ...staff, async (req, res) => {
    try {
      const n = Number(req.query.limit);
      const limit = Number.isFinite(n) ? Math.min(100, Math.max(5, n)) : 50;
      const rows = await LoginLog.find().sort({ createdAt: -1 }).limit(limit).lean();
      res.json({
        logs: rows.map((r) => ({
          id: r._id.toString(),
          at: r.createdAt,
          role: r.role,
          phoneMasked: r.phoneMasked || "",
          ip: r.ip || "",
          userAgent: r.userAgent || "",
        })),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.get("/leaderboard", ...staff, async (req, res) => {
    try {
      const n = Number(req.query.limit);
      const limit = Number.isFinite(n) ? Math.min(50, Math.max(3, n)) : 10;
      const rows = await User.find({ role: "user" }).select("name phone dashboardState").limit(400).lean();
      const ranked = rows
        .map((u) => ({
          id: u._id.toString(),
          name: String(u.name || "").trim() || "—",
          phoneMasked: maskPhoneForLeaderboard(u.phone),
          progress: overallTopicProgressPct(u),
        }))
        .sort((a, b) => b.progress - a.progress)
        .slice(0, limit);
      res.json({ leaderboard: ranked });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.patch("/users/:id", ...adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Некорректный id" });

      const { name, role } = req.body;
      const u = await User.findById(id);
      if (!u) return res.status(404).json({ message: "Пользователь не найден" });

      if (name !== undefined) u.name = String(name).trim().slice(0, 120);

      if (role === "user" || role === "admin" || role === "teacher") {
        if ((role === "user" || role === "teacher") && u.role === "admin") {
          const adminCount = await User.countDocuments({ role: "admin" });
          if (adminCount <= 1) {
            return res.status(400).json({ message: "Нельзя снять последнего администратора" });
          }
        }
        u.role = role;
      }

      await u.save();
      return res.json({ user: u.toPublicJSON() });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.delete("/users/:id", ...adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Некорректный id" });
      if (id === req.user.id) return res.status(400).json({ message: "Нельзя удалить свою учётную запись" });

      const u = await User.findById(id);
      if (!u) return res.status(404).json({ message: "Пользователь не найден" });
      if (u.role === "admin") {
        const n = await User.countDocuments({ role: "admin" });
        if (n <= 1) return res.status(400).json({ message: "Нельзя удалить последнего администратора" });
      }

      await User.findByIdAndDelete(id);
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.get("/promos", ...staff, async (_req, res) => {
    try {
      const promos = await PromoCode.find().sort({ createdAt: -1 }).limit(500).lean();
      res.json({
        promos: promos.map((p) => ({
          id: p._id.toString(),
          code: p.code,
          label: p.label,
          maxUses: p.maxUses,
          uses: p.uses,
          active: p.active,
          expiresAt: p.expiresAt,
          createdAt: p.createdAt,
        })),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.post("/promos", ...adminOnly, async (req, res) => {
    try {
      const code = String(req.body.code || "")
        .trim()
        .toUpperCase();
      if (!code || code.length < 4) return res.status(400).json({ message: "Код не короче 4 символов" });
      const label = String(req.body.label || "Бонус").trim().slice(0, 200);
      let maxUses = req.body.maxUses;
      if (maxUses === "" || maxUses === undefined) maxUses = null;
      else {
        maxUses = Number(maxUses);
        if (!Number.isFinite(maxUses) || maxUses < 1) maxUses = 1;
        if (maxUses > 1_000_000) maxUses = 1_000_000;
      }
      let expiresAt = null;
      if (req.body.expiresAt) {
        const d = new Date(req.body.expiresAt);
        if (!Number.isNaN(d.getTime())) expiresAt = d;
      }
      const active = req.body.active !== false;
      const doc = await PromoCode.create({ code, label, maxUses, uses: 0, active, expiresAt });
      return res.status(201).json({ promo: doc.toPublicJSON() });
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: "Такой код уже есть" });
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.patch("/promos/:id", ...adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Некорректный id" });
      const p = await PromoCode.findById(id);
      if (!p) return res.status(404).json({ message: "Не найден" });
      const { label, active, maxUses } = req.body;
      if (label !== undefined) p.label = String(label).trim().slice(0, 200);
      if (active !== undefined) p.active = Boolean(active);
      if (maxUses !== undefined) {
        if (maxUses === null || maxUses === "") p.maxUses = null;
        else {
          const n = Number(maxUses);
          p.maxUses = Number.isFinite(n) && n >= 1 ? Math.min(n, 1_000_000) : p.maxUses;
        }
      }
      if (req.body.expiresAt !== undefined) {
        if (!req.body.expiresAt) p.expiresAt = null;
        else {
          const d = new Date(req.body.expiresAt);
          p.expiresAt = Number.isNaN(d.getTime()) ? p.expiresAt : d;
        }
      }
      await p.save();
      return res.json({ promo: p.toPublicJSON() });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.delete("/promos/:id", ...adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Некорректный id" });
      await PromoCode.findByIdAndDelete(id);
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  return r;
}
