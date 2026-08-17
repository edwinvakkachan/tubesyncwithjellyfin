import pool from "../supabase/pool.js";
import { getTubeWatchedVideos } from "../services/tubeArchivistService.js";

export async function tubeArchivistWatcher() {


  const watchedIds = await getTubeWatchedVideos();

  for (const youtubeId of watchedIds) {

    try {

await pool.query(
    `INSERT INTO tubearchivistjellyfinsync (
    youtube_id,
    tubewatched
  )
  VALUES ($1, TRUE)
  ON CONFLICT (youtube_id)
  DO UPDATE SET
    tubewatched = TRUE,
    updated_at = NOW()
  RETURNING *;
  `
    ,
    [youtubeId]
  );

    } catch (error) {

      if (error.code !== 11000) {
        console.error('tube archivist is not available');
      }
    }
  }

  console.log(
    `✅ TubeArchivist watched videso sync to db completed (${watchedIds.length})`
  );
}