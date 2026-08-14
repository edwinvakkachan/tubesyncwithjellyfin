import { jellyfinWatcher } from "./workers/jellyfinWatcher.js";
import { tubeArchivistWatcher } from "./workers/tubeArchivistWatcher.js";
import { syncWorker } from "./workers/syncWorker.js";
import { initDB } from "./supabase/db.js";
import { delay } from "./utils/delay.js";
import { syncWatchedItems } from "./syncjellyfinUsers.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {

  while (true) {

    try {

      console.log("\n========================");
      console.log("🚀 sync cycle started");
      console.log("========================\n");
      await initDB();

      
      const targetuserid =  process.env.JELLYFIN_TARGET_USER_ID;
      const sourceuserid = process.env.JELLYFIN_SOURCE_USER_ID
      await syncWatchedItems(sourceuserid,targetuserid
      );

      await delay (2000,true);
      
      await syncWatchedItems(targetuserid,sourceuserid
);

await delay (2000,true)

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