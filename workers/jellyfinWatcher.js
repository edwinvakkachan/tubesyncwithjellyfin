
import { getWatchedVideos } from "../services/jellyfinService.js";
import pool from "../supabase/pool.js";


export async function jellyfinWatcher() {

  const watchedIds = await getWatchedVideos();

  for (const youtubeId of watchedIds) {

    try {

await pool.query(
    `
    INSERT INTO tubearchivistjellyfinsync (youtube_id)
    VALUES ($1)
    ON CONFLICT (youtube_id)
    DO NOTHING
    RETURNING *;
    `,
    [youtubeId]
  );

    } catch (error) {

      if (error.code !== 11000) {
        console.error(error);
      }
    }
  }

  console.log(
    `✅ jellyfin watched videos sync to db complete (${watchedIds.length})`
  );
}