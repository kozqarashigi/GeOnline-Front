import mongoose from "mongoose";
import { mergeTopicsWithDefaults, getDefaultDashboardState } from "../lib/dashboardDefaults.js";

const checklistItemSchema = new mongoose.Schema(
  { key: { type: String, required: true }, done: { type: Boolean, default: false } },
  { _id: false },
);

const topicStateSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    percent: { type: Number, default: 0, min: 0, max: 100 },
    items: { type: [checklistItemSchema], default: [] },
  },
  { _id: false },
);

const weekPlanSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    weekday: { type: Number, min: 0, max: 6, default: 0 },
    time: { type: String, default: "" },
    label: { type: String, default: "" },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

const dashboardStateSchema = new mongoose.Schema(
  {
    streak: { type: Number, default: 0 },
    lastActiveDay: { type: String, default: "" },
    topics: { type: [topicStateSchema], default: undefined },
    weekPlan: { type: [weekPlanSchema], default: undefined },
  },
  { _id: false },
);

const redeemedPromoSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    label: { type: String, default: "" },
    redeemedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    name: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin", "teacher"], default: "user" },
    dashboardState: { type: dashboardStateSchema, default: undefined },
    redeemedPromos: { type: [redeemedPromoSchema], default: [] },
  },
  { timestamps: true },
);

userSchema.methods.resolveDashboardState = function resolveDashboardState() {
  const raw = this.dashboardState;
  const def = getDefaultDashboardState();
  if (!raw) return { ...def, topics: mergeTopicsWithDefaults([]) };

  const topics = mergeTopicsWithDefaults(raw.topics);
  const weekPlan = Array.isArray(raw.weekPlan)
    ? raw.weekPlan
        .filter((r) => r && typeof r === "object")
        .slice(0, 24)
        .map((r) => ({
          id: String(r.id || ""),
          weekday: Math.min(6, Math.max(0, Number(r.weekday) || 0)),
          time: String(r.time || "").slice(0, 32),
          label: String(r.label || "").slice(0, 200),
          done: Boolean(r.done),
        }))
        .filter((r) => r.id)
    : def.weekPlan;

  return {
    streak: Math.max(0, Number(raw.streak) || 0),
    lastActiveDay: String(raw.lastActiveDay || ""),
    topics,
    weekPlan,
  };
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    phone: this.phone,
    name: this.name,
    email: this.email || "",
    role: this.role,
    createdAt: this.createdAt,
    dashboardState: this.resolveDashboardState(),
    redeemedPromos: (this.redeemedPromos || []).map((p) => ({
      code: p.code,
      label: p.label,
      redeemedAt: p.redeemedAt,
    })),
  };
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);
