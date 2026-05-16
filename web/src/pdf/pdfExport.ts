/**
 * PDF Export client utility.
 * Sends template + data to the backend for server-side PDF generation.
 */
import { authFetch } from '../auth/auth.ts';
import type { AnyElementProps } from '../types.ts';

export async function downloadPdf(
  templateElements: AnyElementProps[],
  dataArray: Record<string, unknown>[],
  itemsPerPage: number,
  fileName?: string
): Promise<void> {
  const res = await authFetch('/api/pdf/generate', {
    method: 'POST',
    body: JSON.stringify({
      templateElements,
      dataArray,
      itemsPerPage,
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
