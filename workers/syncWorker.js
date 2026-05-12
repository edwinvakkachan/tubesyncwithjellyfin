import { connectMongo } from "../db/mongo.js";

import {
  markTubeWatched,
  getTubeWatchedVideos
} from "../services/tubeArchivistService.js";

import {
  getAllJellyfinItems,
  markJellyfinWatched
} from "../services/jellyfinService.js";

function pathContainsYoutubeId(path, youtubeId) {

  if (!path) return false;

  return new RegExp(
    `/${youtubeId}\\.(mp4|mkv|webm)$`
  ).test(path);
}

export async function syncWorker() {

  const db = await connectMongo();

  const jobs = await db.collection("syncJobs")
    .find({
      status: "pending",
      retries: { $lt: 10 }
    })
    .limit(20)
    .toArray();

  const jellyfinItems = await getAllJellyfinItems();

  const tubeWatched = new Set(
    await getTubeWatchedVideos()
  );

  for (const job of jobs) {

    try {

      if (job.action === "markTubeWatched") {

        if (!tubeWatched.has(job.youtubeId)) {

          await markTubeWatched(job.youtubeId);

          console.log(
            `✅ marked TubeArchivist watched ${job.youtubeId}`
          );
        }
      }

      if (job.action === "markJellyfinWatched") {

        for (const item of jellyfinItems) {

          if (
            pathContainsYoutubeId(
              item.Path,
              job.youtubeId
            )
          ) {

            if (!item.UserData?.Played) {

              await markJellyfinWatched(item.Id);

              console.log(
                `✅ marked Jellyfin watched ${job.youtubeId}`
              );
            }

            break;
          }
        }
      }

      await db.collection("syncJobs").updateOne(
        {
          _id: job._id
        },
        {
          $set: {
            status: "completed",
            processedAt: new Date()
          }
        }
      );

    } catch (error) {

      console.error(error);

      await db.collection("syncJobs").updateOne(
        {
          _id: job._id
        },
        {
          $inc: {
            retries: 1
          },
          $set: {
            error: error.message
          }
        }
      );
    }
  }

  console.log(`✅ worker completed (${jobs.length})`);
}