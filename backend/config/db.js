// backend/config/db.js
import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });
  console.log(`🗄  Mongo connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

  mongoose.connection.on("error", err => {
    console.error("Mongo error:", err);
  });
}