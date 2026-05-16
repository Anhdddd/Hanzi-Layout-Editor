import { Router } from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/layouts
 * Returns all layouts for the current user + sample layouts
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, name, description, thumbnail, items_per_page, is_sample, created_at, updated_at
       FROM layouts
       WHERE user_id = $1 OR is_sample = TRUE
       ORDER BY is_sample DESC, updated_at DESC`,
      [req.user.id]
    );

    res.json({ layouts: result.rows });
  } catch (err) {
    console.error('List layouts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/layouts/samples
 * Returns sample layouts only
 */
router.get('/samples', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, thumbnail, items_per_page, is_sample, created_at
       FROM layouts
       WHERE is_sample = TRUE
       ORDER BY name ASC`
    );

    res.json({ layouts: result.rows });
  } catch (err) {
    console.error('List samples error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/layouts/:id
 * Returns full layout data including template_data and data_source
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM layouts WHERE id = $1 AND (user_id = $2 OR is_sample = TRUE)`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    res.json({ layout: result.rows[0] });
  } catch (err) {
    console.error('Get layout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/layouts
 * Body: { name, description?, template_data, data_source?, items_per_page? }
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, template_data, data_source, items_per_page, thumbnail } = req.body;

    if (!name || !template_data) {
      return res.status(400).json({ error: 'Name and template_data are required' });
    }

    const result = await pool.query(
      `INSERT INTO layouts (user_id, name, description, thumbnail, template_data, data_source, items_per_page)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        name,
        description || '',
        thumbnail || '',
        JSON.stringify(template_data),
        data_source ? JSON.stringify(data_source) : null,
        items_per_page || 1,
      ]
    );

    res.status(201).json({ layout: result.rows[0] });
  } catch (err) {
    console.error('Create layout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/layouts/:id
 * Body: { name?, description?, template_data?, data_source?, items_per_page? }
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const existing = await pool.query(
      'SELECT id, user_id, is_sample FROM layouts WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    if (existing.rows[0].is_sample) {
      return res.status(403).json({ error: 'Cannot edit sample layouts' });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Not your layout' });
    }

    const { name, description, template_data, data_source, items_per_page, thumbnail } = req.body;

    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (name !== undefined) { updates.push(`name = $${paramIdx++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${paramIdx++}`); values.push(description); }
    if (thumbnail !== undefined) { updates.push(`thumbnail = $${paramIdx++}`); values.push(thumbnail); }
    if (template_data !== undefined) { updates.push(`template_data = $${paramIdx++}`); values.push(JSON.stringify(template_data)); }
    if (data_source !== undefined) { updates.push(`data_source = $${paramIdx++}`); values.push(data_source ? JSON.stringify(data_source) : null); }
    if (items_per_page !== undefined) { updates.push(`items_per_page = $${paramIdx++}`); values.push(items_per_page); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE layouts SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    res.json({ layout: result.rows[0] });
  } catch (err) {
    console.error('Update layout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/layouts/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id, user_id, is_sample FROM layouts WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    if (existing.rows[0].is_sample) {
      return res.status(403).json({ error: 'Cannot delete sample layouts' });
    }

    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Not your layout' });
    }

    await pool.query('DELETE FROM layouts WHERE id = $1', [id]);

    res.json({ message: 'Layout deleted successfully' });
  } catch (err) {
    console.error('Delete layout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
