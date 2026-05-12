import { connectMongo } from "../db/mongo.js";
import { getWatchedVideos } from "../services/jellyfinService.js";

export async function jellyfinWatcher() {

  const db = await connectMongo();

  const watchedIds = await getWatchedVideos();

  for (const youtubeId of watchedIds) {

    try {

      await db.collection("syncJobs").updateOne(
        {
          youtubeId,
          action: "markTubeWatched"
        },
        {
          $setOnInsert: {
            youtubeId,
            action: "markTubeWatched",
            status: "pending",
            retries: 0,
            createdAt: new Date()
          }
        },
        {
          upsert: true
        }
      );

    } catch (error) {

      if (error.code !== 11000) {
        console.error(error);
      }
    }
  }

  console.log(
    `✅ jellyfin watcher completed (${watchedIds.length})`
  );
}