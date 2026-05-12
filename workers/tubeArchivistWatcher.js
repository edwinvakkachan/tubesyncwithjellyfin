import { connectMongo } from "../db/mongo.js";
import { getTubeWatchedVideos } from "../services/tubeArchivistService.js";

export async function tubeArchivistWatcher() {

  const db = await connectMongo();

  const watchedIds = await getTubeWatchedVideos();

  for (const youtubeId of watchedIds) {

    try {

      await db.collection("syncJobs").updateOne(
        {
          youtubeId,
          action: "markJellyfinWatched"
        },
        {
          $setOnInsert: {
            youtubeId,
            action: "markJellyfinWatched",
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
    `✅ TubeArchivist watcher completed (${watchedIds.length})`
  );
}