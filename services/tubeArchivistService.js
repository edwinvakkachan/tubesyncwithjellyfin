import axios from "axios";
import config from "../config/config.js";

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

  await axios.post(
    `${config.tubeUrl}/api/watched/`,
    {
      id,
      is_watched: true
    },
    {
      headers: {
        Authorization: `Token ${config.tubeApi}`,
        "Content-Type": "application/json"
      }
    }
  );
}