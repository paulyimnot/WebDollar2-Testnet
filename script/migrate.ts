
import pg from "pg";
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log("Checking for missing columns...");
  const client = await pool.connect();
  try {
    // Fix NULL balances
    await client.query(`
      UPDATE users SET balance = '0' WHERE balance IS NULL;
      UPDATE users SET staked_balance = '0' WHERE staked_balance IS NULL;
      UPDATE wallet_addresses SET balance = '0' WHERE balance IS NULL;
      UPDATE users SET nonce = 0 WHERE nonce IS NULL;
    `);

    // Add nonce to users if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='nonce') THEN
          ALTER TABLE users ADD COLUMN nonce INTEGER DEFAULT 0 NOT NULL;
          RAISE NOTICE 'Added nonce column to users table.';
        END IF;
      END
      $$;
    `);
    console.log("Database migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
