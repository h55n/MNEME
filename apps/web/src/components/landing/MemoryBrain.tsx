'use client';
import { useEffect, useRef } from 'react';

// Original text-glyph artwork: a padlock ray-marched from a 3D signed-distance
// model and drawn as a density ramp of characters. Right side tints mint
// (encrypted); the keyhole is amber (the erased key).

const RAMP = ' .\'`:,;-~=+*oxX#%&@';
const CREAM = '241,238,231';
const AMBER = '255,145,0';
const MINT = '143,214,190';
const VW = 100;
const VH = 80;

type Cell = { c: number; r: number; s: number; t: number; pe: number; edge: number };

// A padlock modelled as a signed-distance scene and ray-marched once per
// character cell: bevelled body, tube shackle, carved keyhole. Shading is
// diffuse + specular + soft shadow + ambient occlusion from a real 3D light,
// seen from a three-quarter angle. Brightness picks the character.
const YAW = -0.42;
const PITCH = 0.2;
const cyaw = Math.cos(YAW);
const syaw = Math.sin(YAW);
const cp = Math.cos(PITCH);
const sp = Math.sin(PITCH);

function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function keyhole(x: number, y: number, z: number) {
  const circ = Math.hypot(x, y - 9) - 3.6;
  const slot = Math.max(Math.abs(x) - (1.9 + Math.max(0, y - 11) * 0.1), 9 - y, y - 21);
  const d2 = Math.min(circ, slot);
  return Math.max(d2, z + 4); // carve from the front face (z=-hz) down to z=-4
}

let LIFT = 0;
function scene(x: number, y: number, z: number): number {
  // body: bevelled box with a gently domed front and back
  const ux = Math.min(1, Math.abs(x) / 23);
  const uy = Math.min(1, Math.abs(y - 12) / 17);
  const hz = 7 + 3.5 * (1 - ux * ux) * (1 - uy * uy);
  const qx = Math.abs(x) - 23 + 4.5;
  const qy = Math.abs(y - 12) - 17 + 4.5;
  const qz = Math.abs(z) - hz + 3.5;
  let body =
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - 3.5;
  const zc = -z; // front face sits at z = -hz
  // engraved plate outline on the front
  const px = Math.abs(x) - 19 + 3;
  const py = Math.abs(y - 12) - 13.5 + 3;
  const plate = Math.hypot(Math.max(px, 0), Math.max(py, 0)) + Math.min(Math.max(px, py), 0) - 3;
  body = Math.max(body, -Math.max(Math.abs(plate) - 0.9, hz - 2 - zc));
  // four screws sunk into the corners of the plate
  const sxp = Math.abs(x) - 16;
  const syp = Math.abs(y - 12) - 10.5;
  body = Math.max(body, -Math.max(Math.hypot(sxp, syp) - 2, hz - 1.8 - zc));
  // shackle: tall U with straight legs, thin tube, collars where it enters the body
  const yl = y + LIFT;
  let sh: number;
  if (yl < -12) sh = Math.abs(Math.hypot(x, yl + 12) - 11.5);
  else sh = Math.abs(Math.abs(x) - 11.5);
  sh = Math.hypot(sh, z) - 3;
  sh = Math.max(sh, y - 12);
  const collar = Math.max(Math.hypot(Math.abs(x) - 11.5, z) - 4.3, Math.abs(y + 3.5) - 2);
  let d = smin(body, Math.min(sh, collar), 1.6);
  d = Math.max(d, -keyhole(x, y, z));
  return d;
}

function world(sx: number, sy: number, sz: number): [number, number, number] {
  // inverse of: yaw about Y then pitch about X
  const y1 = sy * cp + sz * sp;
  const z1 = -sy * sp + sz * cp;
  return [sx * cyaw - z1 * syaw, y1, sx * syaw + z1 * cyaw];
}

function build(cols: number, rows: number, lift: number): Cell[] {
  LIFT = lift;
  const cells: Cell[] = [];
  const Lv: [number, number, number] = [-0.55, -0.6, -0.65]; // toward the light, view space (z toward camera = -)
  const ll = Math.hypot(...Lv);
  const sc = 1.1;
  const sdf = (sx: number, sy: number, sz: number) => {
    const p = world(sx, sy, sz);
    return scene(p[0], p[1], p[2]);
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = (((c + 0.5) / cols) * VW - 50) / sc;
      const sy = (((r + 0.5) / rows) * VH - 40) / sc - 2.2;
      let z = -70;
      let hit = false;
      for (let i = 0; i < 70; i++) {
        const d = sdf(sx, sy, z);
        if (d < 0.02) {
          hit = true;
          break;
        }
        z += d;
        if (z > 70) break;
      }
      if (!hit) continue;
      const e = 0.12;
      const nx = sdf(sx + e, sy, z) - sdf(sx - e, sy, z);
      const ny = sdf(sx, sy + e, z) - sdf(sx, sy - e, z);
      const nz = sdf(sx, sy, z + e) - sdf(sx, sy, z - e);
      const nl = Math.hypot(nx, ny, nz) || 1;
      const n = [nx / nl, ny / nl, nz / nl];
      const l = [Lv[0] / ll, Lv[1] / ll, Lv[2] / ll];
      const diff = Math.max(0, n[0] * l[0] + n[1] * l[1] + n[2] * l[2]);
      // specular (view vector is toward -z)
      const hx = l[0];
      const hy = l[1];
      const hz = l[2] - 1;
      const hl = Math.hypot(hx, hy, hz);
      const spec = Math.pow(Math.max(0, (n[0] * hx + n[1] * hy + n[2] * hz) / hl), 28);
      // soft shadow
      let sha = 1;
      let tt = 0.6;
      for (let i = 0; i < 22; i++) {
        const d = sdf(sx + l[0] * tt, sy + l[1] * tt, z + l[2] * tt);
        sha = Math.min(sha, (6 * d) / tt);
        tt += Math.max(d, 0.4);
        if (sha < 0.02 || tt > 40) break;
      }
      sha = Math.max(0, sha);
      // ambient occlusion
      let occ = 0;
      for (let i = 1; i <= 4; i++) {
        const dd = i * 1.1;
        occ += (dd - sdf(sx + n[0] * dd, sy + n[1] * dd, z + n[2] * dd)) / (dd * 2 ** i * 0.5);
      }
      const ao = Math.max(0, 1 - occ * 0.6);
      let s = 0.1 + (0.85 * diff * (0.3 + 0.7 * sha) + 0.9 * spec * sha) * ao + 0.12 * ao * (0.5 + 0.5 * n[1] * -1);
      s = Math.pow(Math.min(1, Math.max(0, s * 1.15)), 0.8);
      const p = world(sx, sy, z);
      const hd = Math.min(Math.hypot(p[0], p[1] - 9) - 3.6, Math.max(Math.abs(p[0]) - (1.9 + Math.max(0, p[1] - 11) * 0.1), 9 - p[1], p[1] - 21));
      const pe = hd < 0.7 && p[2] < -3.2 ? 0.9 : 2;
      cells.push({ c, r, s, t: Math.min(1, Math.max(0, (p[0] + 5) / 40 + (p[1] - 10) / 120)), pe, edge: 1 });
    }
  }
  LIFT = 0;
  return cells;
}

const LOOP = 16000;
const ease = (x: number) => {
  const v = Math.min(1, Math.max(0, x));
  return v * v * (3 - 2 * v);
};
const rnd = (i: number, k: number) => {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
const CIPHER = '01abcdef#%&@$=+*<>/|~^';
const WORDS = [
  "mom's birthday - march 12",
  'met Priya at the cafe',
  'wifi password is on the fridge',
  'passport renews in june',
  'idea: trail map app',
  'call dentist tuesday',
  'rent is due on the 1st',
  "dad's recipe: slow dal",
  'flight to goa, window seat',
  'reading: the overstory',
  'gym at 6am',
  'ssh key lives in the vault',
  'first day at the new job',
  'she loves peonies',
  'ask Ravi about the loan',
  'backup codes in the blue notebook',
  'recovery phrase',
  'bank pin',
  'thank Dr. Shah',
  'draft the cover letter',
  'sister moving in may',
  'tax docs folder',
  'book club, thursday',
  'api token - never share',
  'buy a gift for Asha',
  'lease ends in august',
  'try the new ramen place',
  'water the plants',
];
const NW = 38;

export function MemoryBrain({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let open: Cell[] = [];
    let closed: Cell[] = [];
    let cw = 0;
    let ch = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let oy = 0;
    let W = 0;
    let H = 0;
    let raf = 0;
    let last = 0;
    const m = /[?&]frame=(\d+)/.exec(window.location.search);
    const fixed = m ? Number(m[1]) : null;

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      W = rect.width;
      H = rect.height;
      cols = rect.width < 520 ? 110 : 190;
      cw = rect.width / cols;
      ch = cw * 1.8;
      rows = Math.round((cols * VH) / VW / 1.8);
      oy = (rect.height - rows * ch) / 2;
      open = build(cols, rows, 7);
      closed = build(cols, rows, 0);
    };

    const draw = (tt: number) => {
      const t = reduce && fixed === null ? 10200 : tt % LOOP;
      const family = getComputedStyle(canvas).fontFamily;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const n = RAMP.length - 1;
      const close = ease((t - 8200) / 1100);
      const sweep = (t - 9500) / 1300;
      const gAlpha = Math.min(ease(t / 600), 1 - ease((t - 14600) / 1200));
      const cx = W / 2;
      const cy = H / 2;

      // 1. readable memories drift, then scramble into cipher as they fall into the lock
      if (t < 8000 && !(reduce && fixed === null)) {
        const wfs = Math.max(9, cw * 1.9);
        ctx.font = `500 ${wfs}px ${family}`;
        for (let w = 0; w < NW; w++) {
          const text = WORDS[w % WORDS.length];
          const sx = 0.06 * W + rnd(w, 1) * 0.88 * W;
          const sy = 0.06 * H + rnd(w, 2) * 0.88 * H;
          const delay = rnd(w, 3) * 0.4;
          const p = ease((t - 3300 - delay * 2200) / 2600);
          const tx = cx + (rnd(w, 4) - 0.5) * W * 0.3;
          const ty = cy + (rnd(w, 5) - 0.5) * H * 0.4;
          const dr = (1 - p) * 18;
          const x = sx + (tx - sx) * p + Math.sin(t / 1500 + w) * dr;
          const y = sy + (ty - sy) * p + Math.cos(t / 1900 + w * 1.7) * dr;
          const a = ease((t - rnd(w, 6) * 800) / 700) * (1 - ease((p - 0.7) / 0.3)) * gAlpha;
          if (a <= 0.01) continue;
          const scr = Math.min(1, p * 1.6);
          const tick = Math.floor(t / 90);
          let out = '';
          let mintN = 0;
          for (let j = 0; j < text.length; j++) {
            if (text[j] !== ' ' && rnd(w * 31 + j, 7) < scr) {
              out += CIPHER[Math.floor(rnd(w * 31 + j, tick) * CIPHER.length)];
              mintN++;
            } else out += text[j];
          }
          ctx.fillStyle = `rgba(${scr > 0.5 ? MINT : CREAM},${0.2 + 0.6 * a * (0.5 + 0.5 * (1 - scr * 0.5))})`;
          ctx.fillText(out, x, y);
          void mintN;
        }
      }

      // 2. the padlock appears as the cipher lands, closes, then the mint wave seals it
      ctx.font = `500 ${cw / 0.6}px ${family}`;
      const place = (arr: Cell[], alphaMul: number) => {
        for (let i = 0; i < arr.length; i++) {
          const k = arr[i];
          const delay = rnd(i, 1) * 0.5 + (k.c / cols) * 0.2;
          const a = reduce && fixed === null ? 1 : ease((t - 5600 - delay * 1800) / 1100);
          if (a <= 0.01) continue;
          const hole = k.pe < 1.5;
          if (hole && t < 8200 && !(reduce && fixed === null)) continue;
          let s = k.s + (reduce && fixed === null ? 0 : 0.04 * Math.sin(t / 900 + k.c * 0.2 + k.r * 0.3));
          let rgb = CREAM;
          let glyph = '';
          const nx = k.c / cols;
          if (a < 0.95) {
            glyph = CIPHER[Math.floor(rnd(i, Math.floor(t / 100)) * CIPHER.length)];
            rgb = MINT;
            s = Math.max(s, 0.5);
          } else if (hole && t > 8000) {
            rgb = AMBER;
            s = Math.max(s, 0.55) + 0.25 * Math.sin(t / 420);
          } else if (t > 9500) {
            const d = sweep - nx;
            const mixTo = (m2: number) => {
              const c1 = CREAM.split(',').map(Number);
              const c2 = MINT.split(',').map(Number);
              return c1.map((v, j) => Math.round(v + (c2[j] - v) * m2)).join(',');
            };
            if (d > 0 && d < 0.18) {
              rgb = MINT;
              s = Math.min(1, s + 0.45 * (1 - d / 0.18));
              glyph = CIPHER[Math.floor(rnd(i, Math.floor(t / 90)) * CIPHER.length)];
            } else if (d >= 0.18) rgb = mixTo(0.55 + 0.25 * k.t);
          }
          const idx = Math.min(n, Math.max(0, Math.round(Math.min(1, Math.max(0, s)) * n)));
          if (idx === 0) continue;
          ctx.fillStyle = `rgba(${rgb},${Math.min(1, (0.3 + s * 0.85) * alphaMul * Math.min(1, a * 1.5) * gAlpha)})`;
          ctx.fillText(glyph || RAMP[idx], (k.c + 0.5) * cw, (k.r + 0.5) * ch + oy);
        }
      };
      if (close < 1) place(open, 1 - close);
      if (close > 0) place(closed, close);
    };

    const loop = (t: number) => {
      if (t - last > 60) {
        last = t;
        draw(t);
      }
      raf = requestAnimationFrame(loop);
    };

    layout();
    draw(fixed ?? 0);
    if (!reduce && fixed === null) raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => {
      layout();
      draw(fixed ?? performance.now());
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
      aria-label="Memories written as plain words drift together, scramble into cipher, and settle into a padlock. The shackle closes, a mint wave seals it, and the keyhole glows amber for the erased key."
    />
  );
}
