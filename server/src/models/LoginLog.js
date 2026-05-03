import mongoose from "mongoose";

const loginLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["user", "admin", "teacher"], required: true },
    phoneMasked: { type: String, default: "" },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

loginLogSchema.index({ createdAt: -1 });

export const LoginLog = mongoose.models.LoginLog || mongoose.model("LoginLog", loginLogSchema);
