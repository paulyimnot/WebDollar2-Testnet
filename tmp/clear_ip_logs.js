
import pg from "pg";

const { Pool } = pg;

async function clearIpLogs() {
  const DATABASE_URL = "postgresql://webdollar2user:Olv9cQnKE2aHT3g7OcSr80ciWkow3pne@dpg-d6vn1615pdvs738ohf00-a.oregon-postgres.render.com/webdollar2db?sslmode=require";

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log("Connecting to database and clearing IP registration logs...");
    // TRUNCATE the registration_ip_log table to allow new registrations from previous IPs
    await pool.query("TRUNCATE TABLE registration_ip_log CASCADE;");
    console.log("Successfully cleared all IP registration logs.");
  } catch (error) {
    console.error("Error clearing IP logs:", error);
  } finally {
    await pool.end();
  }
}

clearIpLogs();
