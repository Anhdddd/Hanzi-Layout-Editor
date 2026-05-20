import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { generatePdf } from '../services/pdfService.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/pdf/generate
 * Body: { pagesHtml, pageSize }
 * - pagesHtml: Pre-rendered HTML from the client (contains all pages with SVGs, grids, etc.)
 * - pageSize: 'A4' or 'A5' (booklet mode)
 * Returns: PDF file as binary download
 */
router.post('/generate', async (req, res) => {
  try {
    const { pagesHtml, pageSize } = req.body;

    if (!pagesHtml || typeof pagesHtml !== 'string') {
      return res.status(400).json({ error: 'pagesHtml is required and must be a string' });
    }

    console.log(`[PDF] Generating PDF: pageSize=${pageSize || 'A4'}, html length=${pagesHtml.length}`);

    const pdfBuffer = await generatePdf({
      pagesHtml,
      pageSize: pageSize || 'A4',
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="hanzi-layout-${Date.now()}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error('[PDF] Generation error:', err);
    res.status(500).json({ error: 'PDF generation failed: ' + err.message });
  }
});

export default router;
