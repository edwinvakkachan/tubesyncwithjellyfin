import { jellyfinWatcher } from "./workers/jellyfinWatcher.js";
import { tubeArchivistWatcher } from "./workers/tubeArchivistWatcher.js";
import { syncWorker } from "./workers/syncWorker.js";
import { initDB } from "./supabase/db.js";
import { delay } from "./utils/delay.js";

async function main() {

  while (true) {

    try {

      console.log("\n========================");
      console.log("🚀 sync cycle started");
      console.log("========================\n");
      await initDB();

      await jellyfinWatcher();

      await tubeArchivistWatcher();

      await syncWorker();

      console.log("\n✅ cycle completed");

    } catch (error) {

      console.error(
        "❌ error in main loop",
        error
      );
    }

    console.log("⏳ waiting 5 minutes...\n");

    await delay(5 * 60 * 1000);
  }
}

main();