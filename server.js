import axios from 'axios';
import { jellyfinWatchedDetails, markTubeWatched } from './jobs/jellyfinTotubeArchivist.js';
import { delay } from './utils/delay.js';
import { tubearchivistWatchedDetails,findJellyfinItem } from './jobs/tubearchivistTojellyfin.js';





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
