import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Stroke } from '../types';

interface Props {
  initialStrokes?: Stroke[];
  initialSize?: { w: number; h: number };
  initialScale?: number;
  onSave: (value: { strokes: Stroke[]; w: number; h: number; scale: number }) => void;
  onCancel: () => void;
}

const COLORS = ['#111827', '#ef4444', '#38bdf8', '#22c55e', '#eab308'];
const WIDTHS = [3, 6, 10];
const DEFAULT_SCALE = 0.6;

export default function DrawingCanvas({
  initialStrokes = [],
  initialSize,
  initialScale = DEFAULT_SCALE,
  onSave,
  onCancel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [color, setColor] = useState('#111827');
  const [width, setWidth] = useState(6);
  const [scale, setScale] = useState(initialScale);
  const drawingRef = useRef(false);
  const sizeRef = useRef<{ w: number; h: number }>(
    initialSize ?? { w: 0, h: 0 },
  );

  // Determine the drawing surface size once (fixed container dimensions).
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (sizeRef.current.w === 0) {
      const rect = canvas.getBoundingClientRect();
      sizeRef.current = { w: Math.round(rect.width), h: Math.round(rect.height) };
    }
    canvas.width = sizeRef.current.w;
    canvas.height = sizeRef.current.h;
    redraw(strokes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function redraw(list: Stroke[]) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of list) {
      if (stroke.points.length === 0) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      stroke.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
      ctx.stroke();
    }
  }

  useEffect(() => {
    redraw(strokes);
  }, [strokes]);

  function pointFromEvent(e: React.PointerEvent): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [Math.round(e.clientX - rect.left), Math.round(e.clientY - rect.top)];
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = pointFromEvent(e);
    setStrokes((prev) => [...prev, { color, width, points: [pt] }]);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const pt = pointFromEvent(e);
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const updated = { ...last, points: [...last.points, pt] };
      return [...prev.slice(0, -1), updated];
    });
  }

  function onPointerUp(e: React.PointerEvent) {
    drawingRef.current = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  }

  function undo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  function save() {
    onSave({ strokes, w: sizeRef.current.w, h: sizeRef.current.h, scale });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Drawing</h2>
        <button onClick={onCancel} className="rounded-full p-2 text-gray-400 hover:bg-gray-800" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="aspect-square w-full max-w-[360px] touch-none rounded-xl border border-gray-600 bg-white"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <label className="rounded-xl bg-gray-900/70 px-3 py-2">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-300">
            <span>Map scale</span>
            <span>{Math.round(scale * 100)}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="120"
            step="5"
            value={Math.round(scale * 100)}
            onChange={(e) => setScale(Number(e.target.value) / 100)}
            className="w-full accent-sky-500"
          />
        </label>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={`h-9 w-9 rounded-full border-2 ${color === c ? 'border-sky-400' : 'border-gray-600'}`}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                  width === w ? 'border-sky-400' : 'border-gray-600'
                }`}
                aria-label={`width ${w}`}
              >
                <span style={{ width: w, height: w }} className="rounded-full bg-white" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={undo} className="rounded-lg bg-gray-800 px-4 py-3 font-semibold text-gray-300">
            Undo
          </button>
          <button onClick={() => setStrokes([])} className="rounded-lg bg-gray-800 px-4 py-3 font-semibold text-gray-300">
            Clear
          </button>
          <button
            onClick={save}
            disabled={strokes.length === 0}
            className="flex-1 rounded-lg bg-sky-600 py-3 font-semibold text-white disabled:bg-gray-700 disabled:text-gray-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
