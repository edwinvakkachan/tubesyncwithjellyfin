import axios from "axios";
import dotenv from "dotenv";

dotenv.config();


async function getWatchedItems(userId) {
  try {
    const { data } = await axios.get(
      `${process.env.JELLYFIN_URL}/Users/${userId}/Items`,
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

    console.log(`Found ${data.Items.length} watched items`);

    return data.Items;
  } catch (error) {
    // console.error(
    //   "Failed to get watched items:",
    //   error.response?.data || error.message
    // );
  }
}


const watched = await getWatchedItems("1726db7d58b44a0dbdc3dcbbffdee90a");

for (const item of watched) {
  console.log({
    id: item.Id,
    name: item.Name,
    type: item.Type,
    played: item.UserData?.Played,
    playedDate: item.UserData?.LastPlayedDate,
    imdbId: item.ProviderIds?.Imdb,
    tvdbId: item.ProviderIds?.Tvdb
  });
}