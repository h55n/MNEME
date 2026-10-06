'use client';
import { useEffect, useRef } from 'react';

// Original text-glyph artwork. The silhouette and the folds are hand-written
// paths (viewBox 100 x 80, side profile facing left). They are rasterised into
// a coverage mask and sampled into characters, so the shape stays recognisable
// at any grid density. Inside the shape: readable memory words at the front,
// shifting encrypted glyphs toward the back, and one erased pocket in amber.

const CEREBRUM =
  'M10 42C7 25 22 9 42 9C56 4 76 7 86 20C96 30 94 46 83 50L70 52C66 54 60 52 56 50C52 57 44 63 34 61C28 59 26 53 22 53C14 53 11 48 10 42Z';
const CEREBELLUM = 'M65 54C72 50 87 52 89 59C89 67 77 71 68 67C61 63 61 57 65 54Z';
const STEM = 'M50 54L61 55C62 64 64 72 66 79L54 79C54 70 51 62 50 54Z';
const FOLDS = [
  'M52 9C50 18 56 24 50 34C48 38 50 42 47 47',
  'M23 49C34 45 44 45 56 37C62 33 68 34 75 30',
  'M77 12C72 22 78 28 74 41',
  'M18 37C24 31 30 33 34 27C38 22 44 25 46 18',
  'M13 29C20 25 22 19 30 17C34 15 38 17 42 12',
  'M21 45C28 41 34 39 41 41',
  'M58 14C62 18 60 24 66 26C70 28 70 22 78 22',
  'M60 41C66 39 70 43 78 41C82 39 86 41 88 36',
  'M64 21C68 16 72 14 80 16',
  'M29 56C35 52 41 55 47 52',
  'M70 46C75 44 79 46 84 44',
  'M33 34C38 31 42 35 46 31',
];
const MEMORY = 'remember recall write inspect export import vault agent ';
const CIPHER = '0123456789abcdef#%&@$=+*<>/\\|~^';
const CREAM = '241,238,231';
const AMBER = '255,145,0';
const MINT = '143,214,190';
const VW = 100;
const VH = 80;

type Cell = { c: number; r: number; edge: boolean; fold: boolean; cb: boolean; stem: boolean; rnd: number; t: number; pe: number; d: number };

function coverage(cols: number, rows: number, paint: (ctx: CanvasRenderingContext2D) => void): Float32Array {
  const cv = document.createElement('canvas');
  cv.width = cols;
  cv.height = rows;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(cols / VW, rows / VH);
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  paint(ctx);
  const data = ctx.getImageData(0, 0, cols, rows).data;
  const out = new Float32Array(cols * rows);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] / 255;
  return out;
}

function build(cols: number, rows: number): Cell[] {
  const body = coverage(cols, rows, (g) => {
    g.fill(new Path2D(CEREBRUM));
  });
  const cere = coverage(cols, rows, (g) => g.fill(new Path2D(CEREBELLUM)));
  const stem = coverage(cols, rows, (g) => g.fill(new Path2D(STEM)));
  const fold = coverage(cols, rows, (g) => {
    g.lineWidth = 2.4;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const f of FOLDS) g.stroke(new Path2D(f));
  });
  const cells: Cell[] = [];
  const at = (a: Float32Array, c: number, r: number) => (c < 0 || r < 0 || c >= cols || r >= rows ? 0 : a[r * cols + c]);
  const pocket = { x: 26, y: 31, r: 6.2 };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const inBody = body[i] > 0.45;
      const inCb = cere[i] > 0.45;
      const inStem = stem[i] > 0.45;
      if (!inBody && !inCb && !inStem) continue;
      const x = ((c + 0.5) / cols) * VW;
      const y = ((r + 0.5) / rows) * VH;
      const edge = [at(body, c - 1, r), at(body, c + 1, r), at(body, c, r - 1), at(body, c, r + 1)].some((v) => v < 0.45) && inBody;
      const dx = x - pocket.x;
      const dy = y - pocket.y;
      const pe = Math.hypot(dx, dy) / pocket.r;
      const t = Math.min(1, Math.max(0, (x - 28) / 52));
      cells.push({ c, r, edge, fold: inBody && fold[i] > 0.4, cb: inCb && !inBody, stem: inStem && !inBody && !inCb, rnd: Math.random(), t, pe, d: 0.5 + 0.5 * Math.sin(x * 0.9 + y * 0.6) });
    }
  }
  return cells;
}

export function MemoryBrain({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cells: Cell[] = [];
    let cw = 0;
    let ch = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let oy = 0;
    const cipher: string[] = [];
    let raf = 0;
    let last = 0;

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      cols = rect.width < 520 ? 72 : 150;
      cw = rect.width / cols;
      ch = cw * 2;
      // keep the 100 x 80 drawing proportional
      rows = Math.round((cols * VH) / VW / 2);
      oy = (rect.height - rows * ch) / 2;
      cells = build(cols, rows);
      cipher.length = cells.length;
      for (let i = 0; i < cells.length; i++) cipher[i] = CIPHER[(Math.random() * CIPHER.length) | 0];
    };

    const draw = (t: number) => {
      const family = getComputedStyle(canvas).fontFamily;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `500 ${cw / 0.6}px ${family}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const sweep = ((t / 1000) * 0.1) % 1.3;
      for (let i = 0; i < cells.length; i++) {
        const k = cells[i];
        const px = (k.c + 0.5) * cw;
        const py = (k.r + 0.5) * ch + oy;
        if (k.pe < 0.62) continue;
        if (k.pe < 1) {
          ctx.fillStyle = `rgba(${AMBER},${0.55 + 0.4 * Math.sin(t / 650 + i)})`;
          ctx.fillText('·', px, py);
          continue;
        }
        if (k.fold) {
          continue;
        }
        if (k.cb) {
          ctx.fillStyle = `rgba(${MINT},0.75)`;
          ctx.fillText(k.r % 2 ? '=' : '-', px, py);
          continue;
        }
        if (k.stem) {
          ctx.fillStyle = `rgba(${MINT},0.6)`;
          ctx.fillText(k.r % 2 ? '|' : ':', px, py);
          continue;
        }
        const near = Math.abs((k.c + 0.5) / cols - (sweep - 0.15)) < 0.012;
        const enc = k.rnd < k.t * k.t * (3 - 2 * k.t) * 1.2;
        let g: string;
        let color: string;
        if (!enc) {
          g = MEMORY[(k.c + k.r * 7) % MEMORY.length];
          color = `rgba(${CREAM},${k.edge ? 1 : 0.55 + 0.4 * k.d})`;
        } else {
          if (!reduce && Math.random() < 0.03 + (near ? 0.5 : 0)) cipher[i] = CIPHER[(Math.random() * CIPHER.length) | 0];
          g = cipher[i];
          color = `rgba(${MINT},${k.edge ? 1 : 0.5 + 0.45 * k.d})`;
        }
        if (near) color = `rgba(${AMBER},0.95)`;
        ctx.fillStyle = color;
        ctx.fillText(g, px, py);
      }
      // tombstone mark in the erased pocket
      const mid = cells.find((k) => k.pe < 0.62 && Math.abs(k.pe) < 0.12) ?? cells.find((k) => k.pe < 0.62);
      if (mid) {
        ctx.fillStyle = `rgb(${AMBER})`;
        ctx.font = `600 ${(cw / 0.6) * 1.6}px ${family}`;
        ctx.fillText('x', (mid.c + 0.5) * cw, (mid.r + 0.5) * ch + oy);
      }
    };

    const loop = (t: number) => {
      if (t - last > 90) {
        last = t;
        draw(t);
      }
      raf = requestAnimationFrame(loop);
    };

    layout();
    draw(0);
    if (!reduce) raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => {
      layout();
      draw(performance.now());
    });
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={'mono ' + (className ?? '')}
      role="img"
      aria-label="A brain in side profile drawn from text. The front holds readable memories, the back the same memories as shifting encrypted glyphs, and a small erased pocket is marked in amber."
    />
  );
}
