import "dotenv/config";
import { connectDb } from "../db.js";
import { PromoCode } from "../models/PromoCode.js";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Задайте MONGODB_URI в .env");
    process.exit(1);
  }
  await connectDb(uri);
  await PromoCode.updateOne(
    { code: "GEONLINE2021" },
    {
      $setOnInsert: {
        code: "GEONLINE2021",
        label: "Стартовый бонус GeoOnline",
        maxUses: null,
        uses: 0,
        active: true,
        expiresAt: null,
      },
    },
    { upsert: true },
  );
  const doc = await PromoCode.findOne({ code: "GEONLINE2021" }).lean();
  console.log("Промокод:", doc?.code, "uses:", doc?.uses);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
