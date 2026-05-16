import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { generatePdf } from '../services/pdfService.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/pdf/generate
 * Body: { templateElements, dataArray, itemsPerPage }
 * Returns: PDF file as binary download
 */
router.post('/generate', async (req, res) => {
  try {
    const { templateElements, dataArray, itemsPerPage } = req.body;

    if (!templateElements || !Array.isArray(templateElements) || templateElements.length === 0) {
      return res.status(400).json({ error: 'templateElements is required and must be a non-empty array' });
    }

    console.log(`[PDF] Generating PDF: ${templateElements.length} elements, ${(dataArray || []).length} data items, ${itemsPerPage || 1} items/page`);

    const pdfBuffer = await generatePdf({
      templateElements,
      dataArray: dataArray || [],
      itemsPerPage: itemsPerPage || 1,
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
