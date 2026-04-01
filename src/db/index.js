import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ml_accounts (
      id SERIAL PRIMARY KEY,
      ml_user_id TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      app_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}