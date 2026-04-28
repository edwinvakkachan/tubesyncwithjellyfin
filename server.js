import axios from 'axios';
import dotenv from 'dotenv'
dotenv.config();


const ip = process.env.IP;
const api = process.env.APIjelly;
const userId=process.env.JELLYFIN_USER_ID
const ipTube=process.env.IPtube;
const apiTube=process.env.APItube

if (!api || !ip || !userId) {
  console.error("❌ Missing env variables:", { api, ip, userId });
  process.exit(1);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}



// marking jellyfin to tubearechivist
async function checkwatched(id){
try {
    const res = await axios.get(`${ipTube}/api/video/${id}/`,{
headers: {
          Authorization: `Token ${apiTube}`,
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


async function markTubeWatched(jellyId){
  for (const id of jellyId){
  const status = await checkwatched(id);

    if (!status.exists) continue;
    if (status.watched) continue;


    try {
       const res=await axios.post(`${ipTube}/api/watched/`,
             {
              id: id,
              is_watched: true
            },
            {
              headers: {
                Authorization: `Token ${apiTube}`,
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
//marking tubearchivist to jellyfin

async function jellyfinWatchedDetails(){
   try {

const res = await axios.get(
  `${ip}/Users/18c88a40709b4222baa0eab02c68efe8/Items`,
  {
    headers: { "X-Emby-Token": api },
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
//--------------------------------------



async function tubearchivistWatchedDetails() {
  let page = 1;
  let allIds = [];

  while (true) {
    const res = await axios.get(`${ipTube}/api/video/`, {
       headers: {
          Authorization: `Token ${apiTube}`,
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

    // console.log(`Fetched page ${page}: ${videos.length} videos`);

    page++;
  }

  return allIds;
}

async function pathContainsYoutubeId(path, youtubeId) {
  if (!path || !youtubeId) return false;

// console.log('false',path,youtubeId)
  const pattern = new RegExp(`/${youtubeId}\\.(mp4|mkv|webm)?$`);
  return pattern.test(path);
 
}

async function jellyfinMarkAsWatched(itemId) {
  try {
    await axios.post(
    `${ip}/Users/18c88a40709b4222baa0eab02c68efe8/PlayedItems/${itemId}`,{},{
      headers: { "X-Emby-Token": api },
    });
  } catch (error) {
    console.error('error in jellyfinMArkAsWatched',error)
  }
  
}


async function findJellyfinItem(youtubeId) {
  const res = await axios.get(`${ip}/Users/18c88a40709b4222baa0eab02c68efe8/Items`, {
  headers: { "X-Emby-Token": api },
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

async function main(){
  try {
    console.log('started wait for 10sec ✅')
 const jellyfinWatchedyoutubeId =await jellyfinWatchedDetails();
await markTubeWatched(jellyfinWatchedyoutubeId);
console.log("marking jellyfin to tubearchivist completed ✅");

await delay(400)
console.log('started to marking tuberchivist to jellyfin');

const tubearchivistWatchedYoutubeid = await tubearchivistWatchedDetails();

await findJellyfinItem(tubearchivistWatchedYoutubeid)
console.log('✅ everything completed')
  } catch (error) {
    console.error('error in main ',error)
  }
    




}

main();
