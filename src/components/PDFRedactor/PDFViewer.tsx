import { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

interface PDFViewerProps {
    pdfDocument: pdfjsLib.PDFDocumentProxy | null;
    pageIndex: number; // 0-based
    scale: number;
    onPageRendered?: (viewport: pdfjsLib.PageViewport) => void;
}

export function PDFViewer({ pdfDocument, pageIndex, scale, onPageRendered }: PDFViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDocument || !canvasRef.current) return;

            try {
                const page = await pdfDocument.getPage(pageIndex + 1); // pdfjs uses 1-based indexing
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                await page.render(renderContext).promise;

                if (onPageRendered) {
                    onPageRendered(viewport);
                }
            } catch (error) {
                console.error('Error rendering page:', error);
            }
        };

        renderPage();
    }, [pdfDocument, pageIndex, scale, onPageRendered]);

    return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}
