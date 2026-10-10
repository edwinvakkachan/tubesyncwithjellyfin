import { jellyfinWatcher } from "./workers/jellyfinWatcher.js";
import { initDB } from "./supabase/db.js";
import { delay } from "./utils/delay.js";
import { syncWatchedItems } from "./syncjellyfinUsers.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {


async function runTask(name, task) {
  try {
    console.log(`\n▶️ Starting: ${name}`);
    await task();
    console.log(`✅ Completed: ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${name}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

try {
  console.log("\n========================");
  console.log("🚀 SYNC CYCLE STARTED");
  console.log("========================\n");

  await runTask("Initialize database", () => initDB());

  const targetuserid = process.env.JELLYFIN_TARGET_USER_ID;
  const sourceuserid = process.env.JELLYFIN_SOURCE_USER_ID;

  await runTask(
    "Sync source Jellyfin to target Jellyfin",
    () => syncWatchedItems(sourceuserid, targetuserid)
  );

  await delay(2000, true);

  await runTask(
    "Sync target Jellyfin to source Jellyfin",
    () => syncWatchedItems(targetuserid, sourceuserid)
  );

  await delay(2000, true);

  await runTask("Jellyfin watcher", () => jellyfinWatcher());


  console.log("\n✅ SYNC CYCLE FINISHED");
  process.exit(0)
} catch (error) {
  console.error("❌ Unexpected main-loop error:", error.message);
}

}

main();