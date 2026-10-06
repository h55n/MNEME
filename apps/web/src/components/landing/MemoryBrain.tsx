'use client';
import { useEffect, useRef } from 'react';

// An original piece of text-glyph art: a brain drawn from characters.
// Left hemisphere holds readable memory words. Right hemisphere is the same
// memory after encryption, glyphs that keep changing. A small pocket in the
// left side has been erased: blank, ringed in amber, with a tombstone mark.
// The shape is computed from ellipses and sine folds, not traced from anything.

const MEMORY = 'remember recall write inspect export import vault agent ';
const CIPHER = '0123456789abcdef#%&@$=+*<>/\\|~^';
const CREAM = '241,238,231';
const AMBER = '255,145,0';
const MINT = '143,214,190';

type Cell = { cb: boolean; c: number; r: number; d: number; rnd: number; t: number; erased: boolean; ring: boolean; sulcus: boolean };

// World units: x runs -1..1 across the width, y uses the same unit length, so
// shapes keep their proportions whatever the grid size is.
function build(cols: number, rows: number, cw: number, ch: number, W: number, H: number): Cell[] {
  const cells: Cell[] = [];
  const ox = (W - cols * cw) / 2;
  const oy = (H - rows * ch) / 2;
  const el = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) * cw + ox - W / 2) / (W / 2);
      const y = ((r + 0.5) * ch + oy - H / 2) / (W / 2);
      // side view: cerebrum, frontal bulge, temporal lobe, cerebellum, stem
      const wob = 1 + 0.035 * Math.sin(x * 17 + y * 5) + 0.03 * Math.sin(y * 23 - x * 9);
      const cerebrum = el(x, y, 0.02, -0.1, 0.8, 0.52) < wob;
      const frontal = el(x, y, -0.5, -0.02, 0.36, 0.4) < wob;
      const temporal = el(x, y, -0.1, 0.3, 0.46, 0.17) < wob && y > 0.12;
      const cerebellum = el(x, y, 0.52, 0.36, 0.24, 0.13) < 1;
      // brain stem: a slanted bar
      const sx = 0.2 + (y - 0.35) * 0.35;
      const stem = y > 0.3 && y < 0.8 && Math.abs(x - sx) < 0.07;
      if (!(cerebrum || frontal || temporal || cerebellum || stem)) continue;
      // folds: sulci are the troughs of two crossed waves
      const f = Math.sin(x * 15 + Math.sin(y * 8) * 2.2) * Math.sin(y * 13 + Math.sin(x * 6) * 2.0);
      const sulcus = !cerebellum && !stem && f < -0.22;
      const d = 0.5 + 0.5 * f;
      const px = (x + 0.35) / 0.8; // readable on the front, encrypted at the back
      const t = Math.min(1, Math.max(0, px));
      const pk = el(x, y, -0.4, -0.25, 0.14, 0.14);
      cells.push({ cb: cerebellum, c, r, d, rnd: Math.random(), t, erased: pk < 0.55, ring: pk >= 0.55 && pk < 1, sulcus });
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
    const cipher: string[] = [];
    let raf = 0;
    let last = 0;

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      cols = rect.width < 520 ? 48 : 68;
      cw = rect.width / cols;
      ch = cw * 2;
      rows = Math.floor(rect.height / ch);
      cells = build(cols, rows, cw, ch, rect.width, rect.height);
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
      const sweep = ((t / 1000) * 0.12) % 1.4; // a scan line crossing the brain
      for (let i = 0; i < cells.length; i++) {
        const k = cells[i];
        const px = (k.c + 0.5) * cw;
        const py = (k.r + 0.5) * ch + (canvas.height / dpr - rows * ch) / 2;
        const xn = (k.c + 0.5) / cols;
        const near = Math.abs(xn - (sweep - 0.2)) < 0.02;
        if (k.erased) continue;
        if (k.ring) {
          ctx.fillStyle = `rgba(${AMBER},${0.6 + 0.35 * Math.sin(t / 700 + i)})`;
          ctx.fillText('·', px, py);
          continue;
        }
        if (k.sulcus) {
          ctx.fillStyle = `rgba(${CREAM},0.16)`;
          ctx.fillText('·', px, py);
          continue;
        }
        if (k.cb) {
          ctx.fillStyle = `rgba(${MINT},${0.35 + 0.4 * k.d})`;
          ctx.fillText(k.r % 2 ? '=' : '-', px, py);
          continue;
        }
        const enc = k.rnd < k.t * k.t * (3 - 2 * k.t) * 1.15;
        let g: string;
        let color: string;
        if (!enc) {
          g = MEMORY[(k.c + k.r * 7) % MEMORY.length];
          color = `rgba(${CREAM},${0.35 + 0.6 * k.d})`;
        } else {
          if (!reduce && Math.random() < 0.035 + (near ? 0.5 : 0)) cipher[i] = CIPHER[(Math.random() * CIPHER.length) | 0];
          g = cipher[i];
          color = `rgba(${MINT},${0.3 + 0.65 * k.d})`;
        }
        if (near) color = `rgba(${AMBER},0.95)`;
        ctx.fillStyle = color;
        ctx.fillText(g, px, py);
      }
      // tombstone label inside the erased pocket
      const e = cells.filter((k) => k.erased);
      if (e.length) {
        const mid = e[(e.length / 2) | 0];
        const py = (mid.r + 0.5) * ch + (canvas.height / dpr - rows * ch) / 2;
        ctx.fillStyle = `rgb(${AMBER})`;
        ctx.font = `500 ${Math.max(10, cw / 0.6)}px ${family}`;
        ctx.fillText('x', (mid.c + 0.5) * cw, py);
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
      aria-label="A brain drawn in text. The left half holds readable memories, the right half the same memories as shifting encrypted glyphs, and a small erased pocket is marked in amber."
    />
  );
}
