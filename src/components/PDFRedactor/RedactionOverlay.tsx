import { useRef, useEffect, useState, MouseEvent } from 'react';
import { RedactionArea } from '@/lib/pdf-redaction';

interface RedactionOverlayProps {
    width: number;
    height: number;
    scale: number;
    pageIndex: number;
    redactions: RedactionArea[];
    onAddRedaction: (redaction: RedactionArea) => void;
    pdfHeightPoints: number; // Height of the page in PDF points (72 DPI)
}

export function RedactionOverlay({
    width,
    height,
    scale,
    pageIndex,
    redactions,
    onAddRedaction,
    pdfHeightPoints
}: RedactionOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

    // Render existing redactions
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        // Filter redactions for this page
        const pageRedactions = redactions.filter(r => r.pageIndex === pageIndex);

        pageRedactions.forEach(r => {
            // Convert PDF coordinates (Bottom-Left) to Canvas coordinates (Top-Left)
            // PDF: (x, y) is bottom-left. 
            // Canvas Y = pdfHeightPoints - (PDF Y + Height)
            // BUT wait, we need to map from PDF Points to Canvas Pixels too!
            // The `scale` prop passed to PDFViewer determines the pixel size.
            // effectively: Canvas Size = PDF Point Size * scale.
            // So: Canvas X = PDF X * scale
            // Canvas Y = (Page Height (points) - PDF Y - Height) * scale

            // Wait, the `viewport` object from pdfjs handles this transformation usually.
            // But here we are manually collecting existing redactions which are stored in PDF coordinates.

            const x = r.x * scale;
            const h = r.height * scale;
            const y = (pdfHeightPoints - r.y) * scale - h;
            const w = r.width * scale;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x, y, w, h);

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
        });

        // Draw current selection
        if (isDrawing) {
            const rectX = Math.min(startPos.x, currentPos.x);
            const rectY = Math.min(startPos.y, currentPos.y);
            const rectW = Math.abs(currentPos.x - startPos.x);
            const rectH = Math.abs(currentPos.y - startPos.y);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(rectX, rectY, rectW, rectH);

            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(rectX, rectY, rectW, rectH);
            ctx.setLineDash([]);
        }

    }, [width, height, scale, pageIndex, redactions, isDrawing, startPos, currentPos, pdfHeightPoints]);

    const getCoords = (e: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseDown = (e: MouseEvent) => {
        const coords = getCoords(e);
        setStartPos(coords);
        setCurrentPos(coords);
        setIsDrawing(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDrawing) return;
        setCurrentPos(getCoords(e));
    };

    const handleMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const w = Math.abs(currentPos.x - startPos.x);
        const h = Math.abs(currentPos.y - startPos.y);

        if (w > 5 && h > 5) {
            // Convert to PDF coordinates (Bottom-Left)
            // PDF X = Canvas X / scale
            // PDF Width = Canvas Width / scale
            // PDF Height = Canvas Height / scale
            // PDF Y = (Canvas Height / scale) - (Canvas Y / scale) - PDF Height
            //      = (Height - Y - H) / scale ? No.

            // Let's deduce:
            // Canvas Y (top) = (PageHeight - PDF_Y - PDF_H) * scale
            // Canvas Y / scale = PageHeight - PDF_Y - PDF_H
            // PDF_Y = PageHeight - (Canvas Y / scale) - PDF_H

            const pdfX = x / scale;
            const pdfW = w / scale;
            const pdfH = h / scale;
            const pdfY = pdfHeightPoints - (y / scale) - pdfH;

            onAddRedaction({
                pageIndex,
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH
            });
        }
    };

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                cursor: 'crosshair',
                touchAction: 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsDrawing(false)}
        />
    );
}
