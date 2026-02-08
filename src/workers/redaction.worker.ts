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
                // Determine Y coordinate based on whether it's already inverted or not.
                // Our hook will store coordinates in PDF space (bottom-left origin),
                // BUT the UI usually works in top-left origin. 
                // Let's assume the hook/UI passes standard "PDF coordinates" (bottom-left origin) 
                // OR "UI coordinates" (top-left).

                // Existing logic assumed:
                // const pdfY = pageHeight - redaction.y - redaction.height;
                // This implies input `redaction.y` was from top-left.

                // If we standardise on passing valid PDF coordinates (bottom-left origin, 72 DPI),
                // we shouldn't flip them again here unless we decide the redundant contract is "normalized top-left".

                // Let's make a decision: The WORKER expects PDF COORDINATES (bottom-left origin).
                // The HOOK/UI handles the conversion from Screen -> PDF.

                // So, no conversion needed here if passed correct PDF coordinates.
                // However, let's keep the conversion logic IN THE WORKER for now to match the "top-left" expectation of the UI types usually.
                // Actually, `pdf-lib` uses bottom-left (0,0).
                // Browsers use top-left (0,0).

                // Let's assume the passed `redaction` object contains `x, y, width, height` in PDF-LIB coordinate space (Bottom-Left), 
                // UNLESS we want to keep it simple for the UI.

                // Let's stick to the previous implementation for now: UI sends Top-Left based coordinates valid for the PDF page size?
                // NO, providing PDF coordinates is cleaner.

                // Let's assume for this refactor:
                // Input: `x, y` are PDF coordinates (Bottom-Left origin).

                page.drawRectangle({
                    x: redaction.x,
                    y: redaction.y, // Assumes PDF coordinates
                    width: redaction.width,
                    height: redaction.height,
                    color: rgb(0, 0, 0),
                });
            });
        }
    });

    return await pdfDoc.save();
}
