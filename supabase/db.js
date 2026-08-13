// import pkg from "pg";
// const { Pool } = pkg;
// import 'dotenv/config';
import { delay } from "../utils/delay.js";

import pool from "../supabase/pool.js"
import { triggerHomeAssistantWebhookWhenErrorOccurs } from "../homeassistant/homeAssistantWebhook.js";
import { retry } from "../homeassistant/retryWrapper.js";

export async function initDB() {
try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tubearchivistjellyfinsync (
        id SERIAL PRIMARY KEY,
        youtube_id VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    console.log("supabase db connected");

} catch (error) {
  console.error("DB insert error:", error);
          await retry(
    triggerHomeAssistantWebhookWhenErrorOccurs,
    { status: "error" },
    "homeassistant-error",
    5
  );

  process.exit(1);
}

  return pool;
}


export async function insertLinkIfNew(href) {
  try {
    const result = await pool.query(
      `INSERT INTO piratebay_movie_processed_links (href)
       VALUES ($1)
       ON CONFLICT (href) DO NOTHING
       RETURNING id`,
      [href]
    );
    await delay(300,true);
    return result.rowCount === 1; // true if new
  } catch (err) {
    console.error("DB insertLinkIfNew:", err);
            await retry(
    triggerHomeAssistantWebhookWhenErrorOccurs,
    { status: "error" },
    "homeassistant-error",
    5
  );


  process.exit(1);
  }
}
