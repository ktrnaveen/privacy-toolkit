'use client';

import { useState, useRef, useEffect } from 'react';
import { usePDFRedactor } from '@/hooks/usePDFRedactor';
import { PDFViewer, RedactionOverlay, PDFToolbar } from '@/components/PDFRedactor';
import { FileDropzone } from '@/components/FileDropzone';
import styles from './page.module.css';

export default function RedactPage() {
    const {
        file,
        pdfDocument,
        pageCount,
        currentPage,
        scale,
        redactions,
        isProcessing,
        loadPDF,
        setPage,
        setScale,
        addRedaction,
        undoRedaction,
        clearRedactions,
        saveRedactedPDF
    } = usePDFRedactor();

    // We need to track the current page dimensions to pass to the overlay
    const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number; pdfHeightPoints: number } | null>(null);

    // Auto-scale on load and resize
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasAutoScaled, setHasAutoScaled] = useState(false);

    useEffect(() => {
        // Only auto-scale once when file is loaded and we have page stats
        if (pdfDocument && containerRef.current && !hasAutoScaled) {
            const fitScale = async () => {
                try {
                    const page = await pdfDocument.getPage(currentPage);
                    const viewport = page.getViewport({ scale: 1.0 });
                    const containerWidth = containerRef.current?.getBoundingClientRect().width || 0;

                    if (containerWidth > 0) {
                        // Subtract some padding to be safe (e.g., 40px for margins)
                        const availableWidth = containerWidth - 40;
                        const scaleToFit = availableWidth / viewport.width;

                        // Limit scale to be reasonable (e.g., not larger than 1.5 default, but at least visible)
                        const finalScale = Math.min(Math.max(scaleToFit, 0.5), 1.5);
                        setScale(finalScale);
                        setHasAutoScaled(true);
                    }
                } catch (e) {
                    console.error("Error auto-scaling:", e);
                }
            };
            fitScale();
        }
    }, [pdfDocument, currentPage, containerRef, hasAutoScaled, setScale]);

    // Reset auto-scale flag when file changes
    useEffect(() => {
        setHasAutoScaled(false);
    }, [file]);


    const handlePageRendered = (viewport: any) => {
        // viewport.height is in CSS pixels (which equals PDF points * scale)
        // We need the original PDF height in points for coordinate conversion
        setPageDimensions({
            width: viewport.width,
            height: viewport.height,
            pdfHeightPoints: viewport.height / scale
        });
    };



    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>PDF Redactor</h1>
                <p>Permanently redact sensitive information from PDFs.</p>
            </header>

            {!file ? (
                <div className={styles.uploadSection}>
                    <FileDropzone
                        onFilesSelect={(files) => loadPDF(files[0])}
                        accept=".pdf,application/pdf"
                        label="Drop a PDF to redact"
                        description="Click to browse or drag and drop"
                    />
                </div>
            ) : (
                <div className={styles.workspace}>
                    <PDFToolbar
                        currentPage={currentPage}
                        totalPages={pageCount}
                        scale={scale}
                        onPageChange={setPage}
                        onZoomChange={setScale}
                        onUndo={undoRedaction}
                        onClear={clearRedactions}
                        onDownload={saveRedactedPDF}
                        canUndo={redactions.length > 0}
                        canClear={redactions.length > 0}
                        isProcessing={isProcessing}
                        hasFile={!!file}
                    />

                    <div className={styles.viewport} ref={containerRef}>
                        <div className={styles.canvasWrapper} style={{ width: pageDimensions?.width, height: pageDimensions?.height }}>
                            {pdfDocument && (
                                <>
                                    <PDFViewer
                                        pdfDocument={pdfDocument}
                                        pageIndex={currentPage - 1} // 0-based
                                        scale={scale}
                                        onPageRendered={handlePageRendered}
                                    />
                                    {pageDimensions && (
                                        <RedactionOverlay
                                            width={pageDimensions.width}
                                            height={pageDimensions.height}
                                            scale={scale}
                                            pageIndex={currentPage - 1} // 0-based
                                            redactions={redactions}
                                            onAddRedaction={addRedaction}
                                            pdfHeightPoints={pageDimensions.pdfHeightPoints}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
