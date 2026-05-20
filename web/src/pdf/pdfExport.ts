/**
 * PDF Export client utility.
 * Sends the client-rendered HTML to the server for Puppeteer PDF conversion.
 * This ensures pixel-perfect output matching the preview.
 */
import { authFetch } from '../auth/auth.ts';

export async function downloadPdf(
  pagesHtml: string,
  pageSize: 'A4' | 'A5' = 'A4',
  fileName?: string
): Promise<void> {
  const res = await authFetch('/api/pdf/generate', {
    method: 'POST',
    body: JSON.stringify({
      pagesHtml,
      pageSize,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'PDF generation failed' }));
    throw new Error(err.error || 'PDF generation failed');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || `hanzi-layout-${Date.now()}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
