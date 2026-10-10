import axios from "axios";
import config from "../config/config.js";
import { delay } from "../utils/delay.js";

export async function getTubeWatchedVideos() {

  let page = 1;

  const ids = [];

  while (true) {

    const res = await axios.get(
      `${config.tubeUrl}/api/video/`,
      {
        headers: {
          Authorization: `Token ${config.tubeApi}`
        },
        params: {
          watch: "watched",
          page
        }
      }
    );

    const videos = res.data.data || [];

    if (videos.length === 0) {
      break;
    }

    ids.push(...videos.map(v => v.youtube_id));

    page++;
  }

  return ids;
}


export async function markTubeWatched(id) {
  if (!id || typeof id !== "string") {
    throw new Error(`Invalid YouTube video ID: ${id}`);
  }

  // await delay(500, true);

  try {
    const response = await axios.post(
      `${config.tubeUrl}/api/watched/`,
      {
        id,
        is_watched: true
      },
      {
        headers: {
          Authorization: `Token ${config.tubeApi}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    console.log(`✅ TubeArchivist marked watched: ${id}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to mark watched: ${id}`);
    console.error("HTTP status:", error.response?.status ?? "No response");
    console.error(
      "Server response:",
      typeof error.response?.data === "string"
        ? error.response.data
        : JSON.stringify(error.response?.data ?? error.message)
    );

    throw error;
  }
}
