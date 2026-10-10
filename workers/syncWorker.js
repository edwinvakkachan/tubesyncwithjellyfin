import pool from "../supabase/pool.js";
import {
  markTubeWatched
} from "../services/tubeArchivistService.js";

const MAX_RETRIES = 3;

function getErrorDetails(error) {
  return {
    message: error?.message ?? String(error),
    status: error?.response?.status ?? error?.status ?? null,
    response: error?.response?.data ?? error?.data ?? null
  };
}

function isConfirmedMissingVideo(error) {
  const { status, response, message } = getErrorDetails(error);

  // A 404 is treated as missing only if the API uses it
  // to indicate that the requested video does not exist.
  if (status === 404) {
    return true;
  }

  // Some APIs return HTTP 400 when the requested video
  // is absent. Check the actual response before classifying it.
  const responseText = [
    message,
    typeof response === "string"
      ? response
      : JSON.stringify(response ?? {})
  ].join(" ").toLowerCase();

  if (
    status === 400 &&
    (
      responseText.includes("video not found") ||
      responseText.includes("video does not exist") ||
      responseText.includes("video not in archive") ||
      responseText.includes("video not in database")
    )
  ) {
    return true;
  }

  return false;
}

export async function syncWorker() {
  console.log("");
  console.log("=================================================");
  console.log("🔄 SYNC WORKER STARTED");
  console.log("=================================================");

  let successCount = 0;
  let failedCount = 0;
  let deletedCount = 0;
  let missingCount = 0;

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
      console.log("-------------------------------------------------");
      console.log(`🎬 Processing YouTube ID: ${id}`);
      console.log(`🔢 Previous retry count: ${job.retry_count}`);

      try {
        // Step 1: Ask TubeArchivist to mark the video as watched.
        await markTubeWatched(id);

        // Step 2: Update Supabase only after API success.
        const result = await pool.query(
          `
          UPDATE public.tubearchivistjellyfinsync
          SET tubewatched = TRUE,
              retry_count = 0,
              updated_at = NOW()
          WHERE youtube_id = $1
            AND tubewatched = FALSE
          RETURNING youtube_id
          `,
          [id]
        );

        if (result.rowCount > 0) {
          successCount++;
          console.log(`✅ Successfully synced: ${id}`);
          console.log("🔄 Retry count reset to 0");
        } else {
          console.log(
            `ℹ️ Row already updated or removed: ${id}`
          );
        }
      } catch (error) {
        failedCount++;

        const details = getErrorDetails(error);

        console.error(`❌ Sync failed for: ${id}`);
        console.error(`   Message: ${details.message}`);
        console.error(`   HTTP status: ${details.status ?? "N/A"}`);
        console.error(
          "   API response:",
          JSON.stringify(details.response, null, 2)
        );

        try {
          // Step 3: Remove confirmed stale IDs immediately.
          if (isConfirmedMissingVideo(error)) {
            const deleted = await pool.query(
              `
              DELETE FROM public.tubearchivistjellyfinsync
              WHERE youtube_id = $1
                AND tubewatched = FALSE
              RETURNING youtube_id
              `,
              [id]
            );

            if (deleted.rowCount > 0) {
              deletedCount++;
              missingCount++;

              console.error(
                `🗑️ Confirmed missing in TubeArchivist; ` +
                `deleted stale row: ${id}`
              );
            } else {
              console.log(
                `ℹ️ No pending row to delete for: ${id}`
              );
            }

            continue;
          }

          // Step 4: Increment retry count for other errors.
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
              `ℹ️ No pending row found for: ${id}`
            );
            continue;
          }

          const retryCount = Number(result.rows[0].retry_count);

          console.log(
            `🔁 Failed attempts: ${retryCount}/${MAX_RETRIES + 1}`
          );

          // Preserve your requirement: delete after MORE than 3 failures.
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
                `🗑️ Deleted after ${retryCount} failed attempts: ${id}`
              );
            }
          } else {
            console.log(
              `⏳ Keeping row for retry: ${id}`
            );
          }
        } catch (dbError) {
          console.error(
            `❌ Database error while handling ${id}:`,
            dbError.message
          );
        }
      }
    }

    console.log("");
    console.log("=================================================");
    console.log("🏁 SYNC WORKER COMPLETED");
    console.log("=================================================");
    console.log(`📋 Total jobs: ${jobs.rows.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed this run: ${failedCount}`);
    console.log(`🔎 Confirmed missing IDs: ${missingCount}`);
    console.log(`🗑️ Total rows deleted: ${deletedCount}`);
    console.log("=================================================");
  } catch (error) {
    console.error(
      "💥 Sync worker failed:",
      error.message
    );
    throw error;
  }
}