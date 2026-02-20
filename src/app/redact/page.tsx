'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type * as pdfjsLib from 'pdfjs-dist';
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

    // Auto-fit only until the user changes zoom manually.
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasManualScale, setHasManualScale] = useState(false);

    const calculateFitScale = useCallback(async () => {
        if (!pdfDocument || !containerRef.current) return;
        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.0 });
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        if (containerWidth <= 0) return;

        const availableWidth = Math.max(containerWidth - 24, 120);
        const scaleToFit = availableWidth / viewport.width;
        const finalScale = Math.min(Math.max(scaleToFit, 0.5), 1.5);
        setScale(finalScale);
    }, [pdfDocument, currentPage, setScale]);

    useEffect(() => {
        if (!pdfDocument || hasManualScale) return;
        calculateFitScale().catch((e) => console.error('Error auto-scaling:', e));
    }, [pdfDocument, currentPage, hasManualScale, calculateFitScale]);

    useEffect(() => {
        if (!pdfDocument || !containerRef.current || hasManualScale) return;
        const observer = new ResizeObserver(() => {
            calculateFitScale().catch((e) => console.error('Error resizing PDF viewport:', e));
        });
        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [pdfDocument, hasManualScale, calculateFitScale]);

    // Reset auto-scale flag when file changes
    useEffect(() => {
        setHasManualScale(false);
        setPageDimensions(null);
    }, [file]);

    const handlePageRendered = (viewport: pdfjsLib.PageViewport) => {
        // viewport.height is in CSS pixels (which equals PDF points * scale)
        // We need the original PDF height in points for coordinate conversion
        setPageDimensions({
            width: viewport.width,
            height: viewport.height,
            pdfHeightPoints: viewport.height / scale
        });
    };

    const handleZoomChange = (nextScale: number) => {
        setHasManualScale(true);
        setScale(nextScale);
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
                        onZoomChange={handleZoomChange}
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
