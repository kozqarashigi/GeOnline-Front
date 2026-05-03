import mongoose from "mongoose";

/** На Windows Node часто резолвит localhost в ::1, а mongod слушает только 127.0.0.1 */
function normalizeMongoUri(uri) {
  try {
    const u = new URL(uri);
    if (u.hostname === "localhost") u.hostname = "127.0.0.1";
    return u.toString();
  } catch {
    return uri;
  }
}

export async function connectDb(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(normalizeMongoUri(uri));
  return mongoose.connection;
}
