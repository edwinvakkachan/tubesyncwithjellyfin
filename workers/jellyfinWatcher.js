
import { getWatchedVideos } from "../services/jellyfinService.js";
import pool from "../supabase/pool.js";

export async function jellyfinWatcher() {
  console.log("");
  console.log("=================================================");
  console.log("🎬 JELLYFIN WATCHER STARTED");
  console.log("=================================================");

  let insertedCount = 0;
  let existingCount = 0;
  let failedCount = 0;

  try {
    const watchedIds = await getWatchedVideos();

    if (!Array.isArray(watchedIds)) {
      throw new Error(
        "getWatchedVideos() did not return an array"
      );
    }

    const uniqueIds = [
      ...new Set(
        watchedIds.filter(
          id => typeof id === "string" && id.trim()
        ).map(id => id.trim())
      )
    ];

    console.log(
      `📋 Watched IDs returned by Jellyfin: ${uniqueIds.length}`
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
          VALUES ($1, FALSE, 0)
          ON CONFLICT (youtube_id)
          DO NOTHING
          RETURNING youtube_id;
          `,
          [youtubeId]
        );

        if (result.rowCount > 0) {
          insertedCount++;

          console.log(
            `➕ Added watched ID to sync queue: ${youtubeId}`
          );
        } else {
          existingCount++;

          console.log(
            `ℹ️ ID already exists in sync table: ${youtubeId}`
          );
        }
      } catch (error) {
        failedCount++;

        console.error(
          `❌ Failed to queue Jellyfin ID: ${youtubeId}`
        );
        console.error("   Message:", error.message);
        console.error("   Code:", error.code ?? "N/A");
      }
    }

    console.log("");
    console.log("=================================================");
    console.log("🏁 JELLYFIN WATCHER COMPLETED");
    console.log("=================================================");
    console.log(`📋 Unique watched IDs: ${uniqueIds.length}`);
    console.log(`➕ Newly inserted: ${insertedCount}`);
    console.log(`ℹ️ Already existed: ${existingCount}`);
    console.log(`❌ Failed inserts: ${failedCount}`);
    console.log("=================================================");

  } catch (error) {
    console.error("");
    console.error("💥 JELLYFIN WATCHER FAILED");
    console.error("   Message:", error.message);
    console.error("=================================================");

    // Let the main loop log the failure and retry next cycle.
    throw error;
  }
}
