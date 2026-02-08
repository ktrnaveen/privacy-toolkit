/**
 * PDF Redaction utilities using pdf-lib
 * All processing happens client-side
 */

import { PDFDocument, PDFPage, rgb } from 'pdf-lib';

export interface RedactionArea {
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Apply black box redactions to a PDF
 */
export async function applyRedactionsToPDF(
    pdfBytes: Uint8Array,
    redactions: RedactionArea[]
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Group redactions by page
    const redactionsByPage = new Map<number, RedactionArea[]>();
    redactions.forEach(r => {
        if (!redactionsByPage.has(r.pageIndex)) {
            redactionsByPage.set(r.pageIndex, []);
        }
        redactionsByPage.get(r.pageIndex)!.push(r);
    });

    // Apply redactions to each page
    redactionsByPage.forEach((pageRedactions, pageIndex) => {
        if (pageIndex >= 0 && pageIndex < pages.length) {
            const page = pages[pageIndex];
            const pageHeight = page.getHeight();

            pageRedactions.forEach(redaction => {
                // Convert coordinates (PDF coordinate system has origin at bottom-left)
                const pdfY = pageHeight - redaction.y - redaction.height;

                // Draw black rectangle
                page.drawRectangle({
                    x: redaction.x,
                    y: pdfY,
                    width: redaction.width,
                    height: redaction.height,
                    color: rgb(0, 0, 0),
                });
            });
        }
    });

    return await pdfDoc.save();
}

/**
 * Get number of pages in a PDF
 */
export async function getPDFPageCount(pdfBytes: Uint8Array): Promise<number> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
}
