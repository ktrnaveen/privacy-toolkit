import { PDFDocument, rgb } from 'pdf-lib';
import { RedactionArea } from '@/lib/pdf-redaction';

self.onmessage = async (e: MessageEvent) => {
    const { pdfBytes, redactions } = e.data;

    try {
        const redactedPdfBytes = await applyRedactionsToPDF(pdfBytes, redactions);
        self.postMessage({ type: 'SUCCESS', pdfBytes: redactedPdfBytes });
    } catch (error) {
        self.postMessage({ type: 'ERROR', error: (error as Error).message });
    }
};

async function applyRedactionsToPDF(
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
                // Convert from UI coordinates (top-left origin) to PDF coordinates (bottom-left origin)
                // The UI/canvas sends y from top, but pdf-lib expects y from bottom
                const pdfY = pageHeight - redaction.y - redaction.height;

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
