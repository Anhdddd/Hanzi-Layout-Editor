/**
 * Seed script — populates sample layouts from template JSON files.
 * Run: node src/seed.js
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './config/database.js';
import { initDatabase } from './config/init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDataDir = resolve(__dirname, '../../web/src/data');

const sampleLayouts = [
  {
    name: 'Elegant Workbook',
    description: 'Bố cục trang nhã với khối chữ, pinyin, và bảng luyện viết. 1 từ/trang.',
    file: 'hanziWorkbookTemplate.json',
    itemsPerPage: 1,
  },
  {
    name: '3 Words Practice',
    description: 'Bố cục 3 từ mỗi trang, tối ưu không gian luyện viết.',
    file: 'hanziTriplePracticeTemplate.json',
    itemsPerPage: 3,
  },
  {
    name: 'Minimal',
    description: 'Bố cục tối giản, tập trung vào ô luyện viết.',
    file: 'hanziMinimalTemplate.json',
    itemsPerPage: 1,
  },
  {
    name: 'Flashcard',
    description: 'Thẻ flashcard 2 mỗi trang, kết hợp nhận diện và luyện viết.',
    file: 'hanziFlashcardTemplate.json',
    itemsPerPage: 2,
  },
];

async function seed() {
  await initDatabase();

  // Get admin user ID
  const userResult = await pool.query("SELECT id FROM users WHERE email = 'admin@gmail.com'");
  if (userResult.rows.length === 0) {
    console.error('Admin user not found! Run initDatabase first.');
    process.exit(1);
  }
  const adminId = userResult.rows[0].id;

  // Load sample data
  let sampleData;
  try {
    sampleData = JSON.parse(readFileSync(resolve(webDataDir, 'sampleData.json'), 'utf-8'));
  } catch {
    console.warn('⚠ Could not load sampleData.json, seeding without data_source');
    sampleData = null;
  }

  for (const layout of sampleLayouts) {
    // Check if already exists
    const existing = await pool.query(
      'SELECT id FROM layouts WHERE name = $1 AND is_sample = TRUE',
      [layout.name]
    );

    if (existing.rows.length > 0) {
      console.log(`  ⏩ Sample layout "${layout.name}" already exists, skipping`);
      continue;
    }

    try {
      const templateData = JSON.parse(readFileSync(resolve(webDataDir, layout.file), 'utf-8'));

      await pool.query(
        `INSERT INTO layouts (user_id, name, description, template_data, data_source, items_per_page, is_sample)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [
          adminId,
          layout.name,
          layout.description,
          JSON.stringify(templateData),
          sampleData ? JSON.stringify(sampleData) : null,
          layout.itemsPerPage,
        ]
      );
      console.log(`  ✓ Seeded sample layout: ${layout.name}`);
    } catch (err) {
      console.error(`  ✗ Failed to seed "${layout.name}":`, err.message);
    }
  }

  console.log('\n✓ Seed complete');
  await pool.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
