import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import styles from './DrawingCanvas.module.css';

const LINE_WEIGHTS = { thin: 2, medium: 4, thick: 8 };

const DrawingCanvas = forwardRef(function DrawingCanvas(
  { drawing, onSave, lineWeight, color, drawMode },
  ref
) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]); // array of { color, weight, points: [{x,y}] }
  const currentStrokeRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Render all strokes onto the canvas
  const redraw = useCallback((strokes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.weight;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, []);

  // Load saved drawing on mount or when `drawing` prop changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    strokesRef.current = [];

    if (drawing) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        // We can't restore strokes from dataURL, so undo won't work for persisted drawings
        // Treat the loaded image as a single "stroke" for undo purposes
        strokesRef.current = [{ _isImage: true, dataURL: drawing }];
      };
      img.src = drawing;
    } else {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [drawing]);

  // Resize canvas to match its display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        // Save current content
        const dataURL = canvas.toDataURL();
        canvas.width = width;
        canvas.height = height;
        // Restore content after resize
        if (dataURL && dataURL !== 'data:,') {
          const img = new Image();
          img.onload = () => {
            canvas.getContext('2d').drawImage(img, 0, 0);
          };
          img.src = dataURL;
        }
      }
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function onPointerDown(e) {
    if (!drawMode) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pos = getPos(e);
    const weight = LINE_WEIGHTS[lineWeight] ?? 4;
    currentStrokeRef.current = { color, weight, points: [pos] };
  }

  function onPointerMove(e) {
    if (!isDrawingRef.current || !drawMode) return;
    e.preventDefault();
    const pos = getPos(e);
    const stroke = currentStrokeRef.current;
    stroke.points.push(pos);

    // Draw incremental line segment
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pts = stroke.points;
    if (pts.length >= 2) {
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.weight;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
      ctx.restore();
    }
  }

  function onPointerUp(e) {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const stroke = currentStrokeRef.current;
    if (stroke && stroke.points.length > 0) {
      strokesRef.current = [...strokesRef.current, stroke];
      currentStrokeRef.current = null;
      // Save to parent
      const canvas = canvasRef.current;
      onSave(canvas.toDataURL());
    }
  }

  // Expose undo and clear to parent via ref
  useImperativeHandle(ref, () => ({
    undo() {
      const strokes = strokesRef.current;
      if (strokes.length === 0) return;
      strokesRef.current = strokes.slice(0, -1);
      redraw(strokesRef.current);
      const canvas = canvasRef.current;
      const dataURL = strokesRef.current.length === 0 ? null : canvas.toDataURL();
      onSave(dataURL);
    },
    clear() {
      strokesRef.current = [];
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onSave(null);
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      style={{ pointerEvents: drawMode ? 'auto' : 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  );
});

export default DrawingCanvas;
