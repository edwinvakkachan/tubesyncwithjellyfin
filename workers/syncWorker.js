
import pool from "../supabase/pool.js";
import { delay } from "../utils/delay.js";
import {
  markTubeWatched
} from "../services/tubeArchivistService.js";

const MAX_RETRIES = 3;

export async function syncWorker() {
  console.log("");
  console.log("=================================================");
  console.log("🔄 SYNC WORKER STARTED");
  console.log("=================================================");

  let successCount = 0;
  let failedCount = 0;
  let deletedCount = 0;

  try {
    const jobs = await pool.query(`
      SELECT youtube_id, COALESCE(retry_count, 0) AS retry_count
      FROM public.tubearchivistjellyfinsync
      WHERE tubewatched = FALSE
      ORDER BY youtube_id
    `);

    console.log(`📋 Pending videos: ${jobs.rows.length}`);

    for (const job of jobs.rows) {
      const id = job.youtube_id;

      console.log("");
      console.log(`🎬 Processing: ${id}`);
      console.log(`🔢 Previous retry count: ${job.retry_count}`);

      try {
        // Step 1: Mark the video as watched in TubeArchivist.
        await markTubeWatched(id);

        // Step 2: Update Supabase only after API success.
        await pool.query(
          `
          UPDATE public.tubearchivistjellyfinsync
          SET tubewatched = TRUE,
              retry_count = 0,
              updated_at = NOW()
          WHERE youtube_id = $1
          `,
          [id]
        );

        successCount++;

        console.log(`✅ Successfully synced: ${id}`);
        console.log("🔄 Retry count reset to 0");

      } catch (error) {
        failedCount++;

        console.error(`❌ Sync failed: ${id}`);
        console.error(`   Error: ${error.message}`);
        console.error(
          `   HTTP status: ${error.response?.status ?? "N/A"}`
        );

        try {
          // Step 3: Increment retry count after failure.
          const result = await pool.query(
            `
            UPDATE public.tubearchivistjellyfinsync
            SET retry_count = COALESCE(retry_count, 0) + 1,
                updated_at = NOW()
            WHERE youtube_id = $1
              AND tubewatched = FALSE
            RETURNING retry_count
            `,
            [id]
          );

          if (result.rowCount === 0) {
            console.log(
              `⚠️ No pending database row found for: ${id}`
            );
            continue;
          }

          const retryCount = result.rows[0].retry_count;

          console.log(
            `🔁 Retry count: ${retryCount}/${MAX_RETRIES + 1}`
          );

          // Delete only after more than 3 failed attempts.
          if (retryCount > MAX_RETRIES) {
            const deleted = await pool.query(
              `
              DELETE FROM public.tubearchivistjellyfinsync
              WHERE youtube_id = $1
                AND tubewatched = FALSE
                AND retry_count > $2
              RETURNING youtube_id
              `,
              [id, MAX_RETRIES]
            );

            if (deleted.rowCount > 0) {
              deletedCount++;
              console.error(
                `🗑️ Deleted row after ${retryCount} failed attempts: ${id}`
              );
            }
          } else {
            console.log(
              `⏳ Keeping row for another attempt: ${id}`
            );
          }
        } catch (dbError) {
          console.error(
            `❌ Failed to update retry count for ${id}:`,
            dbError.message
          );
        }
      }

      // await delay(300, true);
    }

    console.log("");
    console.log("=================================================");
    console.log("🏁 SYNC WORKER COMPLETED");
    console.log("=================================================");
    console.log(`📋 Total jobs: ${jobs.rows.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed this run: ${failedCount}`);
    console.log(`🗑️ Rows deleted: ${deletedCount}`);
    console.log("=================================================");

  } catch (error) {
    console.error("💥 Sync worker failed:", error.message);
    throw error;
  }
}
