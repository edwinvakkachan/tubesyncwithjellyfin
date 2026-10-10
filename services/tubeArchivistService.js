
import axios from "axios";
import config from "../config/config.js";

const API_TIMEOUT = 15000;

// ============================================================
// CUSTOM ERROR CLASS
// ============================================================

export class TubeArchivistApiError extends Error {
  constructor(message, options = {}) {
    super(message);

    this.name = "TubeArchivistApiError";
    this.status = options.status ?? null;
    this.responseData = options.responseData ?? null;
    this.isMissingVideo = options.isMissingVideo ?? false;
    this.code = options.code ?? null;
    this.cause = options.cause;
  }
}

// ============================================================
// HELPERS
// ============================================================

function getResponseText(data) {
  if (typeof data === "string") {
    return data;
  }

  try {
    return JSON.stringify(data ?? {});
  } catch {
    return String(data);
  }
}

function isExplicitMissingVideoError(status, data) {
  const text = getResponseText(data).toLowerCase();

  // Require an explicit indication that the VIDEO or ID
  // is missing. A generic HTTP 404 is not sufficient.
  const explicitlyMissing =
    /\b(video|youtube[_ ]?id|youtube video|requested id)\b.{0,100}\b(not found|does not exist|doesn't exist|not present|not in archive|not in database)\b/i.test(text) ||
    /\b(not found|does not exist|doesn't exist|not present|not in archive|not in database)\b.{0,100}\b(video|youtube[_ ]?id|youtube video|requested id)\b/i.test(text);

  return explicitlyMissing &&
    (status === 400 || status === 404);
}

function createApiError(error, operation) {
  const status = error.response?.status ?? null;
  const responseData = error.response?.data ?? null;

  const responseText = getResponseText(responseData);

  const message = status
    ? `${operation} failed with HTTP ${status}: ${responseText}`
    : `${operation} failed: ${error.message}`;

  return new TubeArchivistApiError(message, {
    status,
    responseData,
    isMissingVideo: isExplicitMissingVideoError(
      status,
      responseData
    ),
    code: error.code ?? null,
    cause: error
  });
}

// ============================================================
// GET ALL TUBEARCHIVIST WATCHED VIDEOS
// ============================================================

export async function getTubeWatchedVideos() {
  let page = 1;
  const ids = [];

  console.log("🔎 Fetching watched videos from TubeArchivist...");

  try {
    while (true) {
      console.log(`📄 Fetching TubeArchivist page ${page}`);

      const response = await axios.get(
        `${config.tubeUrl}/api/video/`,
        {
          headers: {
            Authorization: `Token ${config.tubeApi}`
          },
          params: {
            watch: "watched",
            page
          },
          timeout: API_TIMEOUT
        }
      );

      const videos = response.data?.data ?? [];

      if (!Array.isArray(videos)) {
        throw new Error(
          `Unexpected TubeArchivist response on page ${page}`
        );
      }

      if (videos.length === 0) {
        break;
      }

      for (const video of videos) {
        if (
          typeof video?.youtube_id === "string" &&
          video.youtube_id.trim()
        ) {
          ids.push(video.youtube_id);
        }
      }

      page++;
    }

    const uniqueIds = [...new Set(ids)];

    console.log(
      `✅ TubeArchivist returned ${uniqueIds.length} watched video IDs`
    );

    return uniqueIds;
  } catch (error) {
    const apiError = error instanceof TubeArchivistApiError
      ? error
      : createApiError(error, "Fetching watched videos");

    console.error("❌ Failed to fetch TubeArchivist watched videos");
    console.error("   HTTP status:", apiError.status ?? "No response");
    console.error("   Error:", apiError.message);

    throw apiError;
  }
}

// ============================================================
// MARK A VIDEO AS WATCHED IN TUBEARCHIVIST
// ============================================================

export async function markTubeWatched(id) {
  if (
    typeof id !== "string" ||
    !id.trim()
  ) {
    throw new TubeArchivistApiError(
      `Invalid YouTube video ID: ${id}`,
      {
        code: "INVALID_YOUTUBE_ID"
      }
    );
  }

  const youtubeId = id.trim();

  console.log(
    `🔄 Requesting TubeArchivist watched update: ${youtubeId}`
  );

  try {
    const response = await axios.post(
      `${config.tubeUrl}/api/watched/`,
      {
        id: youtubeId,
        is_watched: true
      },
      {
        headers: {
          Authorization: `Token ${config.tubeApi}`,
          "Content-Type": "application/json"
        },
        timeout: API_TIMEOUT
      }
    );

    console.log(
      `✅ TubeArchivist marked video as watched: ${youtubeId}`
    );

    return response.data;
  } catch (error) {
    const apiError = createApiError(
      error,
      `Marking ${youtubeId} as watched`
    );

    console.error("");
    console.error("❌ TUBEARCHIVIST WATCHED UPDATE FAILED");
    console.error(`   YouTube ID: ${youtubeId}`);
    console.error(
      `   HTTP status: ${apiError.status ?? "No response"}`
    );
    console.error(`   Error: ${apiError.message}`);
    console.error(
      `   Confirmed missing video: ${apiError.isMissingVideo}`
    );
    console.error(
      "   API response:",
      JSON.stringify(apiError.responseData, null, 2)
    );
    console.error("");

    throw apiError;
  }
}
