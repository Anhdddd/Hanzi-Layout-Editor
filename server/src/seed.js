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
    description: 'Bố cục trang nhã 1 chữ/trang: SVG chữ lớn, stroke progression, thông tin chi tiết và lưới luyện viết.',
    file: 'hanziWorkbookTemplate.json',
    itemsPerPage: 1,
  },
  {
    name: '3 Words Practice',
    description: '3 chữ mỗi trang, mỗi slot gồm SVG chữ, thông tin ngắn gọn và lưới luyện viết.',
    file: 'hanziTriplePracticeTemplate.json',
    itemsPerPage: 3,
  },
  {
    name: 'Minimal',
    description: 'Bố cục tối giản 1 chữ/trang: chữ SVG lớn, thông tin cơ bản và nhiều ô luyện viết.',
    file: 'hanziMinimalTemplate.json',
    itemsPerPage: 1,
  },
  {
    name: 'Flashcard',
    description: 'Thẻ flashcard 2 chữ/trang: SVG chữ lớn, nghĩa và lưới luyện viết nhỏ gọn.',
    file: 'hanziFlashcardTemplate.json',
    itemsPerPage: 2,
  },
  {
    name: 'Stroke Order Focus',
    description: 'Tập trung thứ tự nét viết: SVG chữ lớn, stroke progression chi tiết và lưới 米字格.',
    file: 'hanziStrokeOrderTemplate.json',
    itemsPerPage: 1,
  },
  {
    name: 'Compact Dual',
    description: '2 chữ mỗi trang: SVG chữ, stroke progression và lưới 田字格 gọn gàng.',
    file: 'hanziCompactDualTemplate.json',
    itemsPerPage: 2,
  },
  {
    name: 'Classroom Standard',
    description: '4 chữ/trang kiểu worksheet trường học: pinyin + chữ mẫu + stroke progression + hàng ô 田字格.',
    file: 'hanziClassroomTemplate.json',
    itemsPerPage: 4,
  },
  {
    name: 'Calligraphy Sheet',
    description: '1 chữ/trang kiểu luyện thư pháp: chữ SVG lớn, stroke progression chi tiết, lưới 米字格 ô lớn.',
    file: 'hanziCalligraphyTemplate.json',
    itemsPerPage: 1,
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

  // Delete old sample layouts to re-seed with updated templates
  const deleteResult = await pool.query('DELETE FROM layouts WHERE is_sample = TRUE');
  console.log(`  🗑 Deleted ${deleteResult.rowCount} old sample layouts`);

  for (const layout of sampleLayouts) {

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
