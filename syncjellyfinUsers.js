import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
import { delay } from "./utils/delay.js";

export async function syncWatchedItems( sourceUserId, targetUserId) {

    const sourceResponse = await axios.get(
      `${process.env.JELLYFIN_URL}/Users/${sourceUserId}/Items`,
      {
        params: {
          Recursive: true,
          Filters: "IsPlayed",
          IncludeItemTypes: "Episode",
          IncludeUserData: true,
          Fields: "ProviderIds,Path,MediaSources"
        },
        headers: {
          "X-Emby-Token": process.env.JELLYFIN_API
        }
      }
    );


const destinationResponse = await axios.get(
      `${process.env.JELLYFIN_URL}/Users/${targetUserId}/Items`,
      {
        params: {
          Recursive: true,
          Filters: "IsPlayed",
          IncludeItemTypes: "Episode",
          IncludeUserData: true,
          Fields: "ProviderIds,Path,MediaSources"
        },
        headers: {
          "X-Emby-Token": process.env.JELLYFIN_API
        }
      }
    );


  const sourceItems = sourceResponse.data.Items;
  const destinationItems = destinationResponse.data.Items;

  const destinationWatchedIds = new Set(
    destinationItems.map(item => item.Id)
  );

  console.log(
    `Source watched: ${sourceItems.length}`
  );

  console.log(
    `Destination watched: ${destinationItems.length}`
  );

  let synced = 0;

  for (const item of sourceItems) {
    if (destinationWatchedIds.has(item.Id)) {
      continue;
    }

    try {
await delay(500,true);
await axios.post(
  `${process.env.JELLYFIN_URL}/Users/${targetUserId}/PlayedItems/${item.Id}`,
  {},
  {
    headers: {
      "X-Emby-Token": process.env.JELLYFIN_API
    }
  }
);
      synced++;

      console.log(`Synced: ${item.Name}`);
    } catch (error) {
      console.error(
        `Failed: ${item.Name}`,
        error.response?.data || error.message
      );
    }
  }

  console.log(`Synced ${synced} new watched items`);

  return {
    sourceWatched: sourceItems.length,
    destinationWatched: destinationItems.length,
    synced
  };
}