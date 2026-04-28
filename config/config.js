import dotenv from 'dotenv'
dotenv.config();

const config ={
 ip : process.env.IP,
 api : process.env.APIjelly,
 userId:process.env.JELLYFIN_USER_ID,
 ipTube:process.env.IPtube,
 apiTube:process.env.APItube,
}

export default config 