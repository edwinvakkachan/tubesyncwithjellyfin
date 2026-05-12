import { MongoClient } from "mongodb";
import config from "../config/config.js";

const client = new MongoClient(config.mongoUri);

let db;

export async function connectMongo() {

  if (db) return db;

  await client.connect();

  db = client.db(config.dbName);

  console.log("✅ MongoDB connected");

  await db.collection("syncJobs").createIndex(
    {
      youtubeId: 1,
      action: 1
    },
    {
      unique: true
    }
  );

  return db;
}