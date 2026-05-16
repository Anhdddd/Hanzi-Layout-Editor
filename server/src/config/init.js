import pool from './database.js';
import bcrypt from 'bcryptjs';

/**
 * Initialize database tables and seed data.
 */
export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS layouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        thumbnail TEXT DEFAULT '',
        template_data JSONB NOT NULL DEFAULT '{}',
        data_source JSONB DEFAULT NULL,
        items_per_page INTEGER DEFAULT 1,
        is_sample BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Seed admin user if not exists
    const adminCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@gmail.com']
    );

    if (adminCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash('123456', 10);
      await client.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)',
        ['admin@gmail.com', passwordHash, 'Admin']
      );
      console.log('✓ Seeded admin user: admin@gmail.com / 123456');
    }

    console.log('✓ Database tables initialized');
  } finally {
    client.release();
  }
}
