import axios from 'axios';
import config from '../config/config.js';
import { delay } from '../utils/delay.js';



export async function tubearchivistWatchedDetails() {
  let page = 1;
  let allIds = [];

  while (true) {
    const res = await axios.get(`${config.ipTube}/api/video/`, {
       headers: {
          Authorization: `Token ${config.apiTube}`,
          "Content-Type": "application/json"
        },
      params: {
        watch: "watched",
        sort: "downloaded",
        order: "desc",
        page
      }
    });

    const videos = res.data.data || [];

    if (videos.length === 0) break;

    allIds.push(...videos.map(v => v.youtube_id));
    page++;
  }

  return allIds;
}

async function pathContainsYoutubeId(path, youtubeId) {
  if (!path || !youtubeId) return false;

  const pattern = new RegExp(`/${youtubeId}\\.(mp4|mkv|webm)?$`);
  return pattern.test(path);
 
}

async function jellyfinMarkAsWatched(itemId) {
  try {
    await axios.post(
    `${config.ip}/Users/${config.userId}/PlayedItems/${itemId}`,{},{
      headers: { "X-Emby-Token": config.api },
    });
  } catch (error) {
    console.error('error in jellyfinMArkAsWatched',error)
  }
  
}


export async function findJellyfinItem(youtubeId) {
  const res = await axios.get(`${config.ip}/Users/${config.userId}/Items`, {
  headers: { "X-Emby-Token": config.api },
  params: {
    Recursive: true,
    mediaTypes:'Video',
    Fields: "Path",
  }
});
const youtubeIdSet = new Set(youtubeId);

for (const id of youtubeIdSet){
for (const value of res.data.Items){
  if(await pathContainsYoutubeId(value.Path,id)){
    if(!value.UserData.Played){

      console.log(`✅ marking ${value.Name} as played \n`);
      await jellyfinMarkAsWatched(value.UserData.ItemId)
       break;
      
    }
  }
  
}
}
}