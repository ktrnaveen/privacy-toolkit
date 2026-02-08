import { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { RedactionArea } from '@/lib/pdf-redaction';

// Initialize PDF.js worker
if (typeof window !== 'undefined' && 'Worker' in window) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface PDFRedactorState {
    file: File | null;
    pdfDocument: pdfjsLib.PDFDocumentProxy | null;
    pageCount: number;
    currentPage: number;
    scale: number;
    redactions: RedactionArea[];
    isProcessing: boolean;
    error: string | null;
}

export interface UsePDFRedactorReturn extends PDFRedactorState {
    loadPDF: (file: File) => Promise<void>;
    setPage: (page: number) => void;
    setScale: (scale: number) => void;
    addRedaction: (redaction: RedactionArea) => void;
    undoRedaction: () => void;
    clearRedactions: () => void;
    clearPageRedactions: (pageIndex: number) => void;
    saveRedactedPDF: () => Promise<void>;
}

export function usePDFRedactor(): UsePDFRedactorReturn {
    const [state, setState] = useState<PDFRedactorState>({
        file: null,
        pdfDocument: null,
        pageCount: 0,
        currentPage: 1,
        scale: 1.0,
        redactions: [],
        isProcessing: false,
        error: null,
    });

    const workerRef = useRef<Worker | null>(null);
    const pdfBytesRef = useRef<Uint8Array | null>(null);

    // Initialize worker
    useEffect(() => {
        workerRef.current = new Worker(new URL('../workers/redaction.worker.ts', import.meta.url));

        const handleWorkerMessage = (e: MessageEvent) => {
            const { type, pdfBytes, error } = e.data;
            if (type === 'SUCCESS') {
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);

                // Trigger download
                const a = document.createElement('a');
                a.href = url;
                a.download = state.file?.name.replace('.pdf', '_redacted.pdf') || 'redacted.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                setState(prev => ({ ...prev, isProcessing: false }));
            } else if (type === 'ERROR') {
                console.error('Worker error:', error);
                setState(prev => ({ ...prev, isProcessing: false, error: error }));
            }
        };

        workerRef.current.addEventListener('message', handleWorkerMessage);

        return () => {
            workerRef.current?.terminate();
            workerRef.current?.removeEventListener('message', handleWorkerMessage);
        };
    }, [state.file]);

    const loadPDF = useCallback(async (file: File) => {
        setState(prev => ({ ...prev, isProcessing: true, error: null }));
        try {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            // Clone the bytes for our own worker, as PDF.js might transfer the buffer
            pdfBytesRef.current = new Uint8Array(bytes);

            const loadingTask = pdfjsLib.getDocument({ data: bytes });
            const pdf = await loadingTask.promise;

            setState(prev => ({
                ...prev,
                file,
                pdfDocument: pdf,
                pageCount: pdf.numPages,
                currentPage: 1,
                redactions: [],
                isProcessing: false,
            }));
        } catch (err) {
            console.error('Error loading PDF:', err);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                error: 'Failed to load PDF. Please try again.'
            }));
        }
    }, []);

    const setPage = useCallback((page: number) => {
        setState(prev => {
            if (page < 1 || page > prev.pageCount) return prev;
            return { ...prev, currentPage: page };
        });
    }, []);

    const setScale = useCallback((scale: number) => {
        setState(prev => ({ ...prev, scale }));
    }, []);

    const addRedaction = useCallback((redaction: RedactionArea) => {
        setState(prev => ({
            ...prev,
            redactions: [...prev.redactions, redaction],
        }));
    }, []);

    const undoRedaction = useCallback(() => {
        setState(prev => ({
            ...prev,
            redactions: prev.redactions.slice(0, -1),
        }));
    }, []);

    const clearRedactions = useCallback(() => {
        setState(prev => ({ ...prev, redactions: [] }));
    }, []);

    const clearPageRedactions = useCallback((pageIndex: number) => {
        setState(prev => ({
            ...prev,
            redactions: prev.redactions.filter(r => r.pageIndex !== pageIndex),
        }));
    }, []);

    const saveRedactedPDF = useCallback(async () => {
        if (!pdfBytesRef.current || !workerRef.current) return;

        setState(prev => ({ ...prev, isProcessing: true, error: null }));

        workerRef.current.postMessage({
            pdfBytes: pdfBytesRef.current,
            redactions: state.redactions,
        });
    }, [state.redactions]);

    return {
        ...state,
        loadPDF,
        setPage,
        setScale,
        addRedaction,
        undoRedaction,
        clearRedactions,
        clearPageRedactions,
        saveRedactedPDF,
    };
}
