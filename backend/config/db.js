// backend/config/db.js
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Supabase
  },
});

// Test connection
pool.connect()
  .then(() => {
    console.log("✅ Connected to PostgreSQL (Supabase)");
  })
  .catch((err) => {
    console.error("❌ PostgreSQL connection error:", err.message);
  });

export default pool;
