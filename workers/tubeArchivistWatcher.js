
import pool from "../supabase/pool.js";
import {
  getTubeWatchedVideos
} from "../services/tubeArchivistService.js";

export async function tubeArchivistWatcher() {
  console.log("");
  console.log("=================================================");
  console.log("🎬 TUBEARCHIVIST WATCHER STARTED");
  console.log("=================================================");

  let insertedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  try {
    const watchedIds = await getTubeWatchedVideos();

    if (!Array.isArray(watchedIds)) {
      throw new Error(
        "getTubeWatchedVideos() did not return an array"
      );
    }

    const uniqueIds = [
      ...new Set(
        watchedIds
          .filter(
            id => typeof id === "string" && id.trim()
          )
          .map(id => id.trim())
      )
    ];

    console.log(
      `📋 TubeArchivist watched IDs: ${uniqueIds.length}`
    );

    for (const youtubeId of uniqueIds) {
      try {
        const result = await pool.query(
          `
          INSERT INTO public.tubearchivistjellyfinsync (
            youtube_id,
            tubewatched,
            retry_count
          )
          VALUES ($1, TRUE, 0)
          ON CONFLICT (youtube_id)
          DO UPDATE SET
            tubewatched = TRUE,
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted;
          `,
          [youtubeId]
        );

        if (result.rows[0]?.inserted) {
          insertedCount++;

          console.log(
            `➕ Added TubeArchivist watched ID: ${youtubeId}`
          );
        } else {
          updatedCount++;

          console.log(
            `✅ TubeArchivist watched state confirmed: ${youtubeId}`
          );
        }
      } catch (error) {
        failedCount++;

        console.error(
          `❌ Failed to save TubeArchivist ID: ${youtubeId}`
        );
        console.error("   Message:", error.message);
        console.error("   Code:", error.code ?? "N/A");
      }
    }

    console.log("");
    console.log("=================================================");
    console.log("🏁 TUBEARCHIVIST WATCHER COMPLETED");
    console.log("=================================================");
    console.log(`📋 Unique watched IDs: ${uniqueIds.length}`);
    console.log(`➕ Newly inserted: ${insertedCount}`);
    console.log(`✅ Existing rows updated: ${updatedCount}`);
    console.log(`❌ Failed database operations: ${failedCount}`);
    console.log("=================================================");

  } catch (error) {
    console.error("");
    console.error("💥 TUBEARCHIVIST WATCHER FAILED");
    console.error("   Message:", error.message);
    console.error("=================================================");

    // Propagate API or database errors to the main loop.
    throw error;
  }
}
