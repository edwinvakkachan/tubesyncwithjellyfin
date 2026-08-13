import pool from "../supabase/pool.js";

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


  const jobs =  await pool.query(`
  SELECT youtube_id
  FROM tubearchivistjellyfinsync
  WHERE tubewatched = FALSE
`);



  for (const job of jobs.rows) {

    try {

          await markTubeWatched(job.youtube_id);

          console.log(
            `✅ marked TubeArchivist watched ${job.youtube_id}`
          );

      // if (job.action === "markJellyfinWatched") {

      //   for (const item of jellyfinItems) {

      //     if (
      //       pathContainsYoutubeId(
      //         item.Path,
      //         job.youtubeId
      //       )
      //     ) {

      //       if (!item.UserData?.Played) {

      //         await markJellyfinWatched(item.Id);

      //         console.log(
      //           `✅ marked Jellyfin watched ${job.youtubeId}`
      //         );
      //       }

      //       break;
      //     }
      //   }
      // }

      // await db.collection("syncJobs").updateOne(
      //   {
      //     _id: job._id
      //   },
      //   {
      //     $set: {
      //       status: "completed",
      //       processedAt: new Date()
      //     }
      //   }
      // );

    } catch (error) {

      console.error(error);


    }
  }

  console.log(`✅ worker completed (${jobs.rows.length})`);
}