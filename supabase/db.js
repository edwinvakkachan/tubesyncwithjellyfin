
import pool from "../supabase/pool.js"
export async function initDB() {
try {
  
    console.log("supabase db connected");

} catch (error) {
console.log(error)
  process.exit(1);
}

  return pool;
}

