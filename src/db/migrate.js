import { pool } from "./index.js";

async function main() {
  // Tabel users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Tabel attendance
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      check_out TIMESTAMPTZ,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Tambah kolom baru (GPS + Photo) jika belum ada
  await pool.query(`
    DO $$ 
    BEGIN
      BEGIN
        ALTER TABLE attendance ADD COLUMN latitude DOUBLE PRECISION;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      BEGIN
        ALTER TABLE attendance ADD COLUMN longitude DOUBLE PRECISION;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
      BEGIN
        ALTER TABLE attendance ADD COLUMN photo TEXT;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
    END $$;
  `);

  // Index
  await pool.query(`
    CREATE INDEX IF NOT EXISTS attendance_user_id_check_in_idx
    ON attendance(user_id, check_in DESC);
  `);

  console.log("Migration done.");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
