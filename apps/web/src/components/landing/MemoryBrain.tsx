'use client';
import { useEffect, useRef } from 'react';

// Original text-glyph artwork, shaded like a rendered image. The silhouette and the folds are hand-written
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
const RAMP = ' .\'`:,;-~=+*oxX#%&@';
const CREAM = '241,238,231';
const AMBER = '255,145,0';
const MINT = '143,214,190';
const VW = 100;
const VH = 80;

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

type Cell = { c: number; r: number; s: number; t: number; pe: number; edge: number };

function blur(src: Float32Array, cols: number, rows: number, rx: number, ry: number, passes: number): Float32Array {
  let a = src;
  for (let p = 0; p < passes; p++) {
    const b = new Float32Array(a.length);
    for (let r = 0; r < rows; r++) {
      let sum = 0;
      for (let c = -rx; c <= rx; c++) sum += a[r * cols + Math.min(cols - 1, Math.max(0, c))];
      for (let c = 0; c < cols; c++) {
        b[r * cols + c] = sum / (2 * rx + 1);
        sum += a[r * cols + Math.min(cols - 1, c + rx + 1)] - a[r * cols + Math.max(0, c - rx)];
      }
    }
    const o = new Float32Array(a.length);
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      for (let r = -ry; r <= ry; r++) sum += b[Math.min(rows - 1, Math.max(0, r)) * cols + c];
      for (let r = 0; r < rows; r++) {
        o[r * cols + c] = sum / (2 * ry + 1);
        sum += b[Math.min(rows - 1, r + ry + 1) * cols + c] - b[Math.max(0, r - ry) * cols + c];
      }
    }
    a = o;
  }
  return a;
}

// Height field = soft dome from the silhouette, minus carved fold lines, plus
// a warped ridge pattern for the gyri. Light comes from the upper left; folds
// get ambient occlusion. The result is one brightness value per character.
function build(cols: number, rows: number): Cell[] {
  const body = coverage(cols, rows, (g) => g.fill(new Path2D(CEREBRUM)));
  const cere = coverage(cols, rows, (g) => g.fill(new Path2D(CEREBELLUM)));
  const stem = coverage(cols, rows, (g) => g.fill(new Path2D(STEM)));
  const foldRaw = coverage(cols, rows, (g) => {
    g.lineWidth = 1.8;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const f of FOLDS) g.stroke(new Path2D(f));
  });
  const all = new Float32Array(body.length);
  for (let i = 0; i < all.length; i++) all[i] = Math.max(body[i], cere[i], stem[i]);
  const s = cols / 100;
  const dome = blur(all, cols, rows, Math.round(7 * s), Math.round(3.5 * s), 3);
  const fold = blur(foldRaw, cols, rows, Math.max(1, Math.round(1 * s)), 1, 1);
  const ridge = new Float32Array(all.length);
  const gyri = new Float32Array(all.length);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) / cols) * VW;
      const y = ((r + 0.5) / rows) * VH;
      const w =
        Math.sin(x * 0.62 + Math.sin(y * 0.45) * 2.3) +
        Math.sin(y * 0.58 + Math.sin(x * 0.41 + 1.3) * 2.1) +
        0.6 * Math.sin((x + y) * 0.36 + Math.sin(x * 0.2) * 2);
      const v = Math.min(1, Math.max(0, (w + 1.2) / 2.8));
      gyri[r * cols + c] = v * v * (3 - 2 * v);
    }
  }
  const h = new Float32Array(all.length);
  for (let i = 0; i < h.length; i++) h[i] = 1.4 * dome[i] + 0.22 * gyri[i] - 0.5 * fold[i];
  ridge.set(gyri);
  const L = [-0.55, -0.6, 0.58];
  const ln = Math.hypot(L[0], L[1], L[2]);
  const cells: Cell[] = [];
  const pocket = { x: 30, y: 36, r: 4.2 };
  const at = (a: Float32Array, c: number, r: number) => a[Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c))];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const cov = all[i];
      if (cov < 0.4) continue;
      const gx = (at(h, c + 1, r) - at(h, c - 1, r)) / 2;
      const gy = (at(h, c, r + 1) - at(h, c, r - 1)) / 4;
      const k = 11;
      const nx = -gx * k;
      const ny = -gy * k;
      const nl = Math.hypot(nx, ny, 1);
      const diff = Math.max(0, (nx * L[0] + ny * L[1] + L[2]) / (nl * ln));
      const ao = 1 - 0.85 * Math.max(fold[i] * 1.8, (1 - ridge[i]) * 0.7);
      const rim = Math.min(1, dome[i] * 2.2); // darken toward the edge so it reads as round
      let s0 = (0.1 + 0.95 * diff) * (0.45 + 0.55 * ao) * (0.35 + 0.65 * rim);
      if (body[i] < 0.4 && cere[i] >= 0.4) s0 *= 0.9;
      const x = ((c + 0.5) / cols) * VW;
      const y = ((r + 0.5) / rows) * VH;
      const pe = Math.hypot(x - pocket.x, y - pocket.y) / pocket.r;
      cells.push({ c, r, s: Math.min(1, Math.max(0, s0 * 1.25)), t: Math.min(1, Math.max(0, (x - 40) / 50)), pe, edge: cov });
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
    let raf = 0;
    let last = 0;

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      cols = rect.width < 520 ? 110 : 190;
      cw = rect.width / cols;
      ch = cw * 1.8;
      rows = Math.round(((cols * VH) / VW / 1.8) * 1.2);
      oy = (rect.height - rows * ch) / 2;
      cells = build(cols, rows);
    };

    const draw = (t: number) => {
      const family = getComputedStyle(canvas).fontFamily;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `500 ${cw / 0.6}px ${family}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const n = RAMP.length - 1;
      for (let i = 0; i < cells.length; i++) {
        const k = cells[i];
        const px = (k.c + 0.5) * cw;
        const py = (k.r + 0.5) * ch + oy;
        if (k.pe < 0.7) continue;
        // slow shimmer: a soft travelling wave in brightness
        const sh = reduce ? 0 : 0.07 * Math.sin(t / 1400 + k.c * 0.13 + k.r * 0.21) + (k.t > 0.4 ? 0.05 * Math.sin(t / 380 + k.c * 0.9 + k.r * 1.7) : 0);
        let s = k.s + sh;
        let rgb: string;
        if (k.pe < 1.05) {
          rgb = AMBER;
          s = 0.55 + 0.25 * Math.sin(t / 700 + i);
        } else {
          const m = k.t * 0.6; // mint tint toward the back
          const a = CREAM.split(',').map(Number);
          const b = MINT.split(',').map(Number);
          rgb = a.map((v, j) => Math.round(v + (b[j] - v) * m)).join(',');
        }
        const idx = Math.min(n, Math.max(0, Math.round(s * n)));
        if (idx === 0) continue;
        ctx.fillStyle = `rgba(${rgb},${Math.min(1, 0.35 + s * 0.8)})`;
        ctx.fillText(RAMP[idx], px, py);
      }
    };

    const loop = (t: number) => {
      if (t - last > 110) {
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
      aria-label="A brain in side profile drawn from text characters, shaded like a lit sculpture. The back of the brain shifts toward mint to suggest encryption, and a small erased pocket glows amber."
    />
  );
}
