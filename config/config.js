import dotenv from "dotenv";

dotenv.config();

export default {

  jellyfinUrl: process.env.JELLYFIN_URL,
  jellyfinApi: process.env.JELLYFIN_API,
  jellyfinUserId: process.env.JELLYFIN_USER_ID,

  tubeUrl: process.env.TUBEARCHIVIST_URL,
  tubeApi: process.env.TUBEARCHIVIST_API,

  mongoUri: process.env.MONGO_URI,
  dbName: process.env.DB_NAME
};