
import pg from "pg";

const { Pool } = pg;

async function clearUsers() {
  const DATABASE_URL = "postgresql://webdollar2user:Olv9cQnKE2aHT3g7OcSr80ciWkow3pne@dpg-d6vn1615pdvs738ohf00-a.oregon-postgres.render.com/webdollar2db?sslmode=require";

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log("Connecting to database and clearing users...");
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
