// ─── PDF Image Extraction Service ─────────────────────────────────────────────
// Renders each page of a PDF to a JPEG data URL using pdfjs-dist.
// Images are session-only (not persisted to localStorage).

import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export interface PdfPage {
  pageNum: number
  dataUrl: string
}

/**
 * Renders each page of the given PDF file to a JPEG data URL.
 * @param file    - The PDF File object
 * @param maxPages - Max pages to render (default 12)
 * @param scale   - Render scale factor (default 1.4 → ~800px wide for A4)
 */
export async function extractPdfPages(
  file: File,
  maxPages = 12,
  scale = 1.4,
): Promise<PdfPage[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: PdfPage[] = []
  const limit = Math.min(pdf.numPages, maxPages)

  for (let i = 1; i <= limit; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: ctx, canvas, viewport }).promise
    pages.push({
      pageNum: i,
      dataUrl: canvas.toDataURL('image/jpeg', 0.72),
    })
  }

  return pages
}
