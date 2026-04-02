
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

async function clearUsers() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Connecting to database...");
    // TRUNCATE is faster and will clear all data. 
    // CASCADE handles foreign key dependencies if any.
    await pool.query("TRUNCATE TABLE users CASCADE;");
    console.log("Successfully deleted all user accounts.");
  } catch (error) {
    console.error("Error deleting users:", error);
  } finally {
    await pool.end();
  }
}

clearUsers();
