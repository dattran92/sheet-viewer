import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import styles from './DrawingCanvas.module.css';

const LINE_WEIGHTS = { thin: 2, medium: 4, thick: 8 };

// Draw all strokes onto ctx at the given canvas dimensions.
// Points are normalized (0–1); image strokes are scaled to fill.
function renderStrokes(ctx, strokes, w, h) {
  ctx.clearRect(0, 0, w, h);
  strokes.forEach((stroke) => {
    if (stroke._isImage) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = stroke.dataURL;
      return;
    }
    if (!stroke.points || stroke.points.length < 1) return;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.weight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
    }
    ctx.stroke();
    ctx.restore();
  });
}

const DrawingCanvas = forwardRef(function DrawingCanvas(
  { drawing, onSave, lineWeight, color, drawMode },
  ref
) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const isDrawingRef = useRef(false);

  const redraw = useCallback((strokes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderStrokes(canvas.getContext('2d'), strokes, canvas.width, canvas.height);
  }, []);

  // Load saved drawing when prop changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    strokesRef.current = [];
    if (drawing) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        strokesRef.current = [{ _isImage: true, dataURL: drawing }];
      };
      img.src = drawing;
    } else {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [drawing]);

  // Sync canvas resolution to its CSS size; redraw from strokes on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncSize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const w = Math.round(width);
      const h = Math.round(height);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      redraw(strokesRef.current);
    };

    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  // Normalized position relative to canvas
  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function onPointerDown(e) {
    if (!drawMode) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pos = getPos(e);
    currentStrokeRef.current = {
      color,
      weight: LINE_WEIGHTS[lineWeight] ?? 4,
      points: [pos],
    };
  }

  function onPointerMove(e) {
    if (!isDrawingRef.current || !drawMode) return;
    e.preventDefault();
    const pos = getPos(e);
    const stroke = currentStrokeRef.current;
    stroke.points.push(pos);

    // Incremental draw — scale normalized coords to canvas pixels
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pts = stroke.points;
    if (pts.length >= 2) {
      const p1 = pts[pts.length - 2];
      const p2 = pts[pts.length - 1];
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.weight;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
      ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
      ctx.stroke();
      ctx.restore();
    }
  }

  function onPointerUp() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const stroke = currentStrokeRef.current;
    if (stroke && stroke.points.length > 0) {
      strokesRef.current = [...strokesRef.current, stroke];
      currentStrokeRef.current = null;
      onSave(canvasRef.current.toDataURL());
    }
  }

  useImperativeHandle(ref, () => ({
    undo() {
      const strokes = strokesRef.current;
      if (strokes.length === 0) return;
      strokesRef.current = strokes.slice(0, -1);
      redraw(strokesRef.current);
      const dataURL = strokesRef.current.length === 0 ? null : canvasRef.current.toDataURL();
      onSave(dataURL);
    },
    clear() {
      strokesRef.current = [];
      const canvas = canvasRef.current;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
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
