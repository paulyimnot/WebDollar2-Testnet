import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function wipe() {
  const client = await pool.connect();
  try {
    console.log("Wiping Database...");
    await client.query(`
      TRUNCATE TABLE transactions CASCADE;
      TRUNCATE TABLE blocks CASCADE;
      TRUNCATE TABLE wallet_addresses CASCADE;
      TRUNCATE TABLE conversion_requests CASCADE;
      TRUNCATE TABLE registration_ip_log CASCADE;
      TRUNCATE TABLE faucet_claim_log CASCADE;
      TRUNCATE TABLE banned_ips CASCADE;
      TRUNCATE TABLE users CASCADE;
      TRUNCATE TABLE card_waitlist CASCADE;
      TRUNCATE TABLE user_rewards CASCADE;
    `);
    console.log("Wipe successful!");
  } catch (err) {
    console.error("Wipe failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

wipe();
