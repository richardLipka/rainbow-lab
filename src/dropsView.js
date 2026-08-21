/**
 * dropsView.js -- Mode B: from one droplet to thousands.
 *
 * A vertical cross-section through the observer, containing the antisolar
 * direction and the vertical. Each droplet is tested for one thing only:
 * does the observer see it at the angle phi at which that droplet sends out
 * its concentrated light? Distance never enters the test -- which is exactly
 * the point the brief asks us to make.
 */
import * as O from './optics.js';
import { state, set, activeLambdas, indexModel } from './state.js';
import { t, num } from './i18n.js';
import { fitCanvas, strokePath, label } from './ui.js';
import { colorFor } from './rays.js';

const MAX_DRAWN_RAYS = 34;

export function createDropsView(canvas) {
  let drops = [];
  let seedKey = '';
  let layout = null;

  function makeKey() {
    return `${state.dropCount}|${state.show.rainBelow}`;
  }

  function regenerate() {
    const target = state.dropCount;
    if (drops.length > target) drops.length = target;
    while (drops.length < target) {
      // spread in depth and height; log-ish depth so near and far are both seen
      const depth = 0.12 + Math.pow(Math.random(), 0.6) * 0.88;
      const spread = state.show.rainBelow ? 1 : 0.62;
      const height = (Math.random() * 2 - 1) * spread;
      drops.push({ x: depth, y: height * depth * 1.25 });
    }
    seedKey = makeKey();
  }

  /** Bow bands, derived from the engine, as [{k, lo, hi}] in degrees. */
  function bands() {
    const idx = indexModel();
    const out = [];
    for (const k of [1, 2]) {
      if (k === 1 && !state.show.primary) continue;
      if (k === 2 && !state.show.secondary) continue;
      const angles = O.NAMED_COLORS.map((c) => ({
        lambda: c.lambda,
        phi: O.rainbowGeometry(idx(c.lambda), k).antisolarDeg,
      }));
      const lo = Math.min(...angles.map((a) => a.phi));
      const hi = Math.max(...angles.map((a) => a.phi));
      out.push({ k, lo, hi, angles });
    }
    return out;
  }

  /** Which wavelength (if any) does a droplet seen at angle phi deliver? */
  function colorAt(phi, bs) {
    let best = null;
    for (const band of bs) {
      for (const a of band.angles) {
        const d = Math.abs(a.phi - phi);
        if (d < 0.45 && (!best || d < best.d)) best = { d, lambda: a.lambda, k: band.k };
      }
    }
    return best;
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    if (seedKey !== makeKey()) regenerate();

    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#070a12');
    g.addColorStop(1, '#0c1120');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const ox = w * 0.1;
    const oy = h * 0.52;
    const s = Math.min(w * 0.82, h * 1.25);
    layout = { ox, oy, s };
    const P = (p) => ({ x: ox + p.x * s, y: oy - p.y * s });

    const alpha = state.sunElevation;
    const anti = { x: Math.cos(alpha * O.RAD), y: -Math.sin(alpha * O.RAD) };
    const sun = { x: -anti.x, y: -anti.y };
    const bs = bands();

    // antisolar axis
    strokePath(ctx, [P({ x: 0, y: 0 }), P({ x: anti.x * 1.35, y: anti.y * 1.35 })],
      'rgba(150,170,210,0.35)', 1, [5, 5]);
    if (state.show.labels) {
      const e = P({ x: anti.x * 1.2, y: anti.y * 1.2 });
      label(ctx, t('antisolarPoint'), e.x, e.y - 12, { align: 'center', color: '#9fb4d8' });
    }

    // the two directions that can deliver bow light, in this cross-section
    for (const band of bs) {
      for (const sign of [1, -1]) {
        for (const edge of [band.lo, band.hi]) {
          const a = (alpha * -1 + sign * edge) * O.RAD;
          const d = { x: Math.cos(a) * (sign > 0 ? 1 : 1), y: Math.sin(a) };
          const dir = rotate(anti, sign * edge * O.RAD);
          strokePath(ctx, [P({ x: 0, y: 0 }), P({ x: dir.x * 1.35, y: dir.y * 1.35 })],
            band.k === 1 ? 'rgba(111,211,164,0.22)' : 'rgba(155,140,240,0.2)', 1,
            band.k === 1 ? [3, 4] : [2, 5]);
        }
      }
    }

    // ground
    if (state.show.ground) {
      const gy = groundY();
      const yy = P({ x: 0, y: gy }).y;
      const gg = ctx.createLinearGradient(0, yy, 0, h);
      gg.addColorStop(0, 'rgba(30,45,35,0.85)');
      gg.addColorStop(1, 'rgba(12,18,16,0.95)');
      ctx.fillStyle = gg;
      ctx.fillRect(0, yy, w, h - yy);
      strokePath(ctx, [{ x: 0, y: yy }, { x: w, y: yy }], 'rgba(120,170,140,0.45)', 1.2);
      if (state.show.labels) label(ctx, t('horizon'), w - 12, yy - 12, { align: 'right', color: '#9ec9ab' });
    }

    // droplets. The non-contributing ones are by far the most numerous, so
    // they go into a single path and a single fill() -- one fill per droplet
    // is what makes ten thousand of them slow.
    let contributing = 0;
    let drawnRays = 0;
    const dotR = state.dropCount > 3000 ? 0.7 : state.dropCount > 600 ? 1.1 : state.dropCount > 60 ? 1.8 : 3;
    const greyPath = new Path2D();
    let greyCount = 0;
    for (const d of drops) {
      const len = Math.hypot(d.x, d.y);
      if (len < 1e-6) continue;
      const dir = { x: d.x / len, y: d.y / len };
      const phi = Math.acos(O.clamp(dir.x * anti.x + dir.y * anti.y, -1, 1)) * O.DEG;
      const hitc = colorAt(phi, bs);
      const q = P(d);
      if (q.x < -20 || q.x > w + 20 || q.y < -20 || q.y > h + 20) continue;

      if (hitc) {
        contributing++;
        ctx.fillStyle = colorFor(hitc.lambda, 0.95);
        ctx.beginPath();
        ctx.arc(q.x, q.y, dotR + 1.2, 0, Math.PI * 2);
        ctx.fill();
        if (drawnRays < MAX_DRAWN_RAYS && state.show.droplets) {
          drawnRays++;
          // incoming sunlight
          const back = { x: d.x - sun.x * 0.22, y: d.y - sun.y * 0.22 };
          strokePath(ctx, [P(back), q], 'rgba(255,246,214,0.5)', 1);
          // the ray that actually reaches the eye
          strokePath(ctx, [q, P({ x: 0, y: 0 })], colorFor(hitc.lambda, 0.6), 1);
        }
      } else if (state.show.droplets) {
        greyPath.moveTo(q.x + dotR, q.y);
        greyPath.arc(q.x, q.y, dotR, 0, Math.PI * 2);
        greyCount++;
      }
    }
    if (greyCount) {
      ctx.fillStyle = 'rgba(150,175,215,0.24)';
      ctx.fill(greyPath);
    }

    // observer
    const o = P({ x: 0, y: 0 });
    ctx.save();
    ctx.fillStyle = '#e8eefc';
    ctx.beginPath();
    ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,238,252,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(o.x, o.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (state.show.labels) label(ctx, t('observerLabel'), o.x, o.y + 22, { align: 'center', color: '#e8eefc' });

    // sun, behind the observer
    const sp = P({ x: sun.x * 0.55, y: sun.y * 0.55 });
    const sg = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, 22);
    sg.addColorStop(0, 'rgba(255,238,180,0.9)');
    sg.addColorStop(1, 'rgba(255,210,90,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2);
    ctx.fill();
    if (state.show.labels) label(ctx, t('sunLabel'), sp.x, sp.y - 26, { align: 'center', color: '#ffe9a8' });

    // readout
    label(ctx, `${t('dropCount')}: ${fmt(drops.length)}`, 12, 16, { color: '#cfe0ff' });
    label(ctx, `${t('dropsContributing')}: ${fmt(contributing)}`, 12, 36, { color: '#6fd3a4' });
    if (state.show.labels) {
      const hint = t('dropsHint');
      label(ctx, hint, 12, h - 14, { color: '#8ea3c6', font: '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif' });
    }
  }

  function groundY() {
    // observer height in metres mapped onto the scene, purely for legibility
    const hm = state.observerHeight;
    return -Math.min(0.55, 0.06 + Math.log10(1 + hm) * 0.16);
  }

  function fmt(n) {
    return n >= 1000 ? `${num(n / 1000, n >= 10000 ? 0 : 1)}k` : String(n);
  }

  /** Grow the droplet field towards the target while animating. */
  function tick() {
    if (state.scene !== 'drops' || !state.dropsAnimate) return false;
    if (drops.length >= state.dropCount) return false;
    const add = Math.max(1, Math.ceil(drops.length * 0.25));
    const target = Math.min(state.dropCount, drops.length + add);
    while (drops.length < target) {
      const depth = 0.12 + Math.pow(Math.random(), 0.6) * 0.88;
      const spread = state.show.rainBelow ? 1 : 0.62;
      drops.push({ x: depth, y: (Math.random() * 2 - 1) * spread * depth * 1.25 });
    }
    seedKey = makeKey();
    return true;
  }

  function reset() {
    drops = [];
    seedKey = '';
  }

  canvas.addEventListener('pointerdown', () => set({ panel: 'guide' }));

  return { draw, tick, reset };
}

function rotate(v, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}
