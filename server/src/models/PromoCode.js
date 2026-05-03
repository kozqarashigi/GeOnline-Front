import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    label: { type: String, default: "Бонус", trim: true },
    maxUses: { type: Number, default: null },
    uses: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

promoCodeSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    code: this.code,
    label: this.label,
    maxUses: this.maxUses,
    uses: this.uses,
    active: this.active,
    expiresAt: this.expiresAt,
    createdAt: this.createdAt,
  };
};

export const PromoCode = mongoose.models.PromoCode || mongoose.model("PromoCode", promoCodeSchema);
