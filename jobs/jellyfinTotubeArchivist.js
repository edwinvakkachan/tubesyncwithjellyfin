import axios from 'axios';
import config from '../config/config.js';
import { delay } from '../utils/delay.js';


async function checkwatched(id){
try {
    const res = await axios.get(`${config.ipTube}/api/video/${id}/`,{
headers: {
          Authorization: `Token ${config.apiTube}`,
          "Content-Type": "application/json"
        },
  })

return {
   exists: true,
    watched:res.data.player.watched}
} catch (error) {
  if (error.response?.status === 404) {
      console.log(`⚠️ Video not found in TubeArchivist: ${id}`);
      return {
        exists: false,
        watched: false
      };
    }

}
}

export async function jellyfinWatchedDetails(){
   try {

const res = await axios.get(
  `${config.ip}/Users/${config.userId}/Items`,
  {
    headers: { "X-Emby-Token": config.api },
    params: {
      Recursive: true,
      Fields: "Path,MediaSources",
      Filters: "IsPlayed",
      IsPlayed: true,
      IncludeItemTypes: "Movie,Episode",
      EnableUserData: true
    }
  }
);
const idArray = [];

    for (const item of res.data.Items) {
      if (!item.Path) continue;

      const match = item.Path.match(/\/([A-Za-z0-9_-]{11})\.mp4$/);
      if (!match) continue;

      idArray.push(match[1]);
    }

    return idArray;

   } catch (error) {
    console.error(error)
   }
}

export async function markTubeWatched(jellyId){
  for (const id of jellyId){
  const status = await checkwatched(id);

    if (!status.exists) continue;
    if (status.watched) continue;


    try {
       const res=await axios.post(`${config.ipTube}/api/watched/`,
             {
              id: id,
              is_watched: true
            },
            {
              headers: {
                Authorization: `Token ${config.apiTube}`,
                "Content-Type": "application/json"
              }
            })
    
            console.log('video marked as watched' ,id);
    
    } catch (error) {
      console.error(error)
    } 

  }
  await delay(300);
}