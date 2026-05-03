import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "../db.js";
import { User } from "../models/User.js";
import { normalizeKzPhone } from "../lib/phone.js";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Задайте MONGODB_URI в .env");
    process.exit(1);
  }
  const phone = normalizeKzPhone(process.env.ADMIN_PHONE);
  const password = process.env.ADMIN_PASSWORD;
  if (!phone || !password) {
    console.error("Задайте ADMIN_PHONE и ADMIN_PASSWORD в .env");
    process.exit(1);
  }

  await connectDb(uri);
  const passwordHash = await bcrypt.hash(password, 10);
  const doc = await User.findOneAndUpdate(
    { phone },
    { $set: { phone, name: "Admin", passwordHash, role: "admin" } },
    { upsert: true, new: true },
  );
  console.log("Админ готов:", doc.phone, "role=", doc.role);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
