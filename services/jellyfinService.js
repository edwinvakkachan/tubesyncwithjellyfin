import axios from "axios";
import config from "../config/config.js";

export async function getWatchedVideos() {

  const res = await axios.get(
    `${config.jellyfinUrl}/Users/${config.jellyfinUserId}/Items`,
    {
      headers: {
        "X-Emby-Token": config.jellyfinApi
      },
      params: {
        Recursive: true,
        Filters: "IsPlayed",
        IsPlayed: true,
        Fields: "Path"
      }
    }
  );

  const ids = [];

  for (const item of res.data.Items) {

    if (!item.Path) continue;

    const match = item.Path.match(
      /\/([A-Za-z0-9_-]{11})\.(mp4|mkv|webm)$/
    );

    if (match) {
      ids.push(match[1]);
    }
  }

  return ids;
}

export async function markJellyfinWatched(itemId) {

  await axios.post(
    `${config.jellyfinUrl}/Users/${config.jellyfinUserId}/PlayedItems/${itemId}`,
    {},
    {
      headers: {
        "X-Emby-Token": config.jellyfinApi
      }
    }
  );
}

export async function getAllJellyfinItems() {

  const res = await axios.get(
    `${config.jellyfinUrl}/Users/${config.jellyfinUserId}/Items`,
    {
      headers: {
        "X-Emby-Token": config.jellyfinApi
      },
      params: {
        Recursive: true,
        Fields: "Path"
      }
    }
  );

  return res.data.Items;
}