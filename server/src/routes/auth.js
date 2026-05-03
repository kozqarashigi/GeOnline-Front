import { Router } from "express";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { PromoCode } from "../models/PromoCode.js";
import { requireAuth } from "../middleware/auth.js";
import { normalizeKzPhone, maskPhoneForLog } from "../lib/phone.js";
import { LoginLog } from "../models/LoginLog.js";
import { mergeTopicsWithDefaults } from "../lib/dashboardDefaults.js";
import {
  setRegisterCode,
  verifyRegisterCode,
  isPhoneRegisterVerified,
  clearRegisterVerification,
} from "../lib/regVerification.js";
import { isMailConfigured, sendRegistrationCode } from "../lib/mailer.js";

function signToken(userId, secret) {
  return jwt.sign({ sub: userId }, secret, { expiresIn: "7d" });
}

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (xf) {
    const first = String(xf).split(",")[0].trim();
    if (first) return first.slice(0, 64);
  }
  const raw = req.socket?.remoteAddress || req.ip || "";
  return String(raw).replace(/^::ffff:/, "").slice(0, 64);
}

function clientUa(req) {
  return String(req.headers["user-agent"] || "").slice(0, 420);
}

function prevUtcDayKey(dayKey) {
  const t = Date.parse(`${dayKey}T12:00:00.000Z`);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function createAuthRouter({ jwtSecret }) {
  const r = Router();

  function publicRegisterBaseUrl(req) {
    const fromEnv = String(process.env.PUBLIC_ORIGIN || "").trim();
    if (fromEnv) return fromEnv.replace(/\/$/, "");
    const host = req.get("host") || "localhost";
    const proto = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    return `${proto}://${host}`;
  }

  /** Қадам 2: код сұрау (email бар болса — хат жіберу, әйтпесе demoCode жауапта). */
  r.post("/register/request-code", async (req, res) => {
    try {
      const phone = normalizeKzPhone(req.body.phone);
      if (!phone) return res.status(400).json({ message: "Некорректный телефон (+7 и 10 цифр)" });

      const exists = await User.findOne({ phone });
      if (exists) return res.status(409).json({ message: "Этот номер уже зарегистрирован" });

      const email = String(req.body.email || "")
        .trim()
        .toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Некорректный email" });
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      setRegisterCode(phone, code);

      const digits = phone.replace(/\D/g, "");
      const base = publicRegisterBaseUrl(req);
      const confirmUrl = `${base}/register.html#verify?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(digits)}`;

      let emailSent = false;
      if (email && isMailConfigured()) {
        try {
          await sendRegistrationCode({ to: email, code, phone, confirmUrl });
          emailSent = true;
        } catch (err) {
          console.error("[reg] email send failed:", err.message || err);
        }
      }

      console.info(
        `[reg] request-code ${phone} emailSent=${emailSent}` +
          (emailSent ? "" : " (false = нет SMTP или пустой email; код в ответе demoCode)"),
      );

      const payload = { ok: true, emailSent };
      if (!emailSent) {
        payload.demoCode = code;
        payload.message =
          "Письмо не отправлено (нет SMTP или email). Используйте код из ответа (режим демо).";
      }
      return res.json(payload);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  /** Қадам 2 → 3: кодты тексеру. */
  r.post("/register/verify-code", async (req, res) => {
    try {
      const phone = normalizeKzPhone(req.body.phone);
      if (!phone) return res.status(400).json({ message: "Некорректный телефон" });
      const code = String(req.body.code || "").trim();
      if (code.length < 6) return res.status(400).json({ message: "Введите 6-значный код" });

      const r0 = verifyRegisterCode(phone, code);
      if (!r0.ok) return res.status(400).json({ message: r0.message });

      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.post("/register", async (req, res) => {
    try {
      const name = String(req.body.name || "").trim();
      const password = String(req.body.password || "");
      const phone = normalizeKzPhone(req.body.phone);
      if (!phone) return res.status(400).json({ message: "Некорректный телефон (+7 и 10 цифр)" });
      if (name.length < 2) return res.status(400).json({ message: "Укажите имя (не короче 2 символов)" });
      if (password.length < 6) return res.status(400).json({ message: "Пароль не короче 6 символов" });

      if (!isPhoneRegisterVerified(phone)) {
        return res.status(400).json({
          message: "Сначала подтвердите номер: запросите код и введите его на шаге 2",
        });
      }

      const exists = await User.findOne({ phone });
      if (exists) return res.status(409).json({ message: "Этот номер уже зарегистрирован" });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({ phone, name, passwordHash, role: "user" });
      clearRegisterVerification(phone);
      const token = signToken(user._id.toString(), jwtSecret);
      return res.status(201).json({
        token,
        user: user.toPublicJSON(),
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.post("/login", async (req, res) => {
    try {
      const password = String(req.body.password || "");
      const phone = normalizeKzPhone(req.body.phone);
      if (!phone) return res.status(400).json({ message: "Некорректный телефон" });
      if (!password) return res.status(400).json({ message: "Введите пароль" });

      const user = await User.findOne({ phone });
      if (!user) return res.status(401).json({ message: "Неверный телефон или пароль" });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Неверный телефон или пароль" });

      const token = signToken(user._id.toString(), jwtSecret);
      LoginLog.create({
        userId: user._id,
        role: user.role,
        phoneMasked: maskPhoneForLog(phone),
        ip: clientIp(req),
        userAgent: clientUa(req),
      }).catch((err) => console.error("[login-log]", err.message || err));
      return res.json({
        token,
        user: user.toPublicJSON(),
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.get("/me", requireAuth(jwtSecret), async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(401).json({ message: "Пользователь не найден" });
      return res.json({ user: user.toPublicJSON() });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  /** Профиль: аты, email (телефонды осында өзгертпейміз) */
  r.patch("/me", requireAuth(jwtSecret), async (req, res) => {
    try {
      const u = await User.findById(req.user.id);
      if (!u) return res.status(401).json({ message: "Пользователь не найден" });
      const body = req.body || {};
      if (body.name === undefined && body.email === undefined) {
        return res.json({ user: u.toPublicJSON() });
      }
      if (body.name !== undefined) {
        const name = String(body.name || "").trim();
        if (name.length < 2) {
          return res.status(400).json({ message: "Укажите имя (не короче 2 символов)" });
        }
        u.name = name.slice(0, 120);
      }
      if (body.email !== undefined) {
        const raw = String(body.email || "")
          .trim()
          .toLowerCase();
        if (raw === "") {
          u.email = "";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
          return res.status(400).json({ message: "Некорректный email" });
        } else {
          u.email = raw.slice(0, 120);
        }
      }
      await u.save();
      return res.json({ user: u.toPublicJSON() });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  /** Күнделікті белсенділік: streak жаңартады */
  r.post("/ping", requireAuth(jwtSecret), async (req, res) => {
    try {
      const u = await User.findById(req.user.id);
      if (!u) return res.status(401).json({ message: "Пользователь не найден" });

      const today = utcDayKey();
      const cur = u.resolveDashboardState();
      const last = String(cur.lastActiveDay || "");
      let streak = Math.max(0, Number(cur.streak) || 0);

      if (last !== today) {
        if (last === "") {
          streak = 1;
        } else if (last === prevUtcDayKey(today)) {
          streak += 1;
        } else {
          streak = 1;
        }
        u.set("dashboardState", {
          streak,
          lastActiveDay: today,
          topics: cur.topics,
          weekPlan: cur.weekPlan,
        });
        await u.save();
      }

      return res.json({ user: u.toPublicJSON() });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.patch("/me/dashboard", requireAuth(jwtSecret), async (req, res) => {
    try {
      const u = await User.findById(req.user.id);
      if (!u) return res.status(401).json({ message: "Пользователь не найден" });

      const body = req.body || {};
      const base = u.resolveDashboardState();
      const raw = {
        streak: base.streak,
        lastActiveDay: base.lastActiveDay,
        topics: base.topics,
        weekPlan: base.weekPlan,
      };

      if (Array.isArray(body.topics)) {
        raw.topics = mergeTopicsWithDefaults(body.topics);
      }

      if (Array.isArray(body.weekPlan)) {
        raw.weekPlan = body.weekPlan.slice(0, 24).map((row) => ({
          id: String(row.id || randomUUID()).slice(0, 80),
          weekday: Math.min(6, Math.max(0, Number(row.weekday) || 0)),
          time: String(row.time || "").slice(0, 32),
          label: String(row.label || "").slice(0, 200),
          done: Boolean(row.done),
        }));
      }

      u.set("dashboardState", raw);
      await u.save();
      return res.json({ user: u.toPublicJSON() });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  r.post("/redeem", requireAuth(jwtSecret), async (req, res) => {
    try {
      const code = String(req.body.code || "")
        .trim()
        .toUpperCase();
      if (!code) return res.status(400).json({ message: "Введите промокод" });

      const u = await User.findById(req.user.id);
      if (!u) return res.status(401).json({ message: "Пользователь не найден" });

      if ((u.redeemedPromos || []).some((p) => p.code === code)) {
        return res.status(400).json({ message: "Промокод уже активирован" });
      }

      const promo = await PromoCode.findOne({ code, active: true });
      if (!promo) return res.status(404).json({ message: "Промокод не найден" });
      if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
        return res.status(400).json({ message: "Срок промокода истёк" });
      }
      if (promo.maxUses != null && promo.uses >= promo.maxUses) {
        return res.status(400).json({ message: "Лимит активаций исчерпан" });
      }

      promo.uses += 1;
      await promo.save();

      u.redeemedPromos = u.redeemedPromos || [];
      u.redeemedPromos.push({ code: promo.code, label: promo.label, redeemedAt: new Date() });
      await u.save();

      return res.json({ user: u.toPublicJSON() });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Ошибка сервера" });
    }
  });

  return r;
}
