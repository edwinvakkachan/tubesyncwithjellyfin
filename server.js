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
  const res = await axios.get(`${ipTube}/api/video/${id}/`,{
headers: {
          Authorization: `Token ${apiTube}`,
          "Content-Type": "application/json"
        },
  })

return res.data.player.watched
}
async function markTubeWatched(jellyId){
  for (const id of jellyId){
    if(await checkwatched(id)){
      // console.log('already watched ',id)
      continue
    }


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

async function tubearchivistWatchedDetails(){
  const youtubeid=[];
  const res = await axios.get(`${ipTube}/api/video/`, {
    headers: {
          Authorization: `Token ${apiTube}`,
          "Content-Type": "application/json"
        },
    params: {
      sort:"downloaded",
      watch:"watched",

    }
  });
  
  for (let i=0;i<=res.data.data.length;i++){

    for(const value of res.data.data){
      
      youtubeid.push(value.youtube_id)
      
    
    }
  }


return youtubeid;

}

// async function tubearchivistMarkingWatched(youtubeId){

//   for (const id of youtubeId){
// try {
//    const res=await axios.post(`${ipTube}/api/watched/`,
//          {
//           id: id,
//           is_watched: true
//         },
//         {
//           headers: {
//             Authorization: `Token ${apiTube}`,
//             "Content-Type": "application/json"
//           }
//         })

// } catch (error) {
//   console.error(error)
// } 
// await delay(300); 
//   }


// }
async function pathContainsYoutubeId(path, youtubeId) {
  if (!path || !youtubeId) return false;

  const pattern = new RegExp(`/${youtubeId}\\.(mp4|mkv|webm)?$`);
  return pattern.test(path);
}

async function jellyfinMarkAsWatched(itemId) {
  await axios.post(
    `${ip}/Users/18c88a40709b4222baa0eab02c68efe8/PlayedItems/${itemId}`,{},{
      headers: { "X-Emby-Token": api },
    });

     console.log("✅ Marked as watched:", itemId);
}


async function findJellyfinItem(youtubeId) {
  const res = await axios.get(`${ip}/Users/18c88a40709b4222baa0eab02c68efe8/Items`, {
  headers: { "X-Emby-Token": api },
  params: {
    Recursive: true,
    mediaTypes:'Video',
    IsPlayed: false,
    Fields: "Path",
  }
});
const youtubeIdSet = new Set(youtubeId);

for (const id of youtubeIdSet){
for (const value of res.data.Items){
  if(await pathContainsYoutubeId(value.Path,id)){
    if(!value.UserData.played){
      console.log(value.UserData.ItemId)
      console.log(`marking ${value.Name} as played \n`);
      await jellyfinMarkAsWatched(value.UserData.ItemId)
       break;
      
    }
  }
  
}
}
}

async function main(){
    console.log('started wait for 10sec ✅')
 const jellyfinWatchedyoutubeId =await jellyfinWatchedDetails();
await markTubeWatched(jellyfinWatchedyoutubeId);
console.log("marking jellyfin to tubearchivist complete ✅");

await delay(400)

const tubearchivistWatchedYoutubeid = await tubearchivistWatchedDetails();

await findJellyfinItem(tubearchivistWatchedYoutubeid)
console.log('✅ every thing completed')




}

main();
