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
const MAX_DRAWN_GREY_RAYS = 16;

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

    // The sun-antisolar axis: sunlight is parallel at this distance, so this
    // ONE line, running the full width of the scene through the observer, is
    // literally the direction every ray of incoming light travels along. It
    // also makes the Sun's position explicit rather than leaving it floating
    // near the observer with no visible connection to anything.
    strokePath(ctx, [P({ x: sun.x * 1.4, y: sun.y * 1.4 }), P({ x: anti.x * 1.4, y: anti.y * 1.4 })],
      'rgba(255,225,160,0.28)', 1, [5, 5]);
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
    let drawnGreyRays = 0;
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
          // the ray that actually reaches the eye -- dashed for the
          // secondary bow (k=2), solid for the primary (k=1), the same
          // convention used everywhere else in the app for the two orders
          strokePath(ctx, [q, P({ x: 0, y: 0 })], colorFor(hitc.lambda, 0.6), 1,
            hitc.k === 2 ? [4, 3] : null);
        }
      } else if (state.show.droplets) {
        greyPath.moveTo(q.x + dotR, q.y);
        greyPath.arc(q.x, q.y, dotR, 0, Math.PI * 2);
        greyCount++;
        // A sample of the grey droplets get the same treatment as the
        // coloured ones: sunlight really does reach every droplet, and every
        // droplet really does scatter it onward -- it is only the DIRECTION
        // that fails to line up with this particular observer's eye. Drawn
        // faint and undeviated (most scattered light is not concentrated
        // into any caustic at all -- the k=0 lesson from the single-droplet
        // view), so it reads as "goes on, unremarkably" rather than
        // implying a second hidden rainbow direction that isn't modelled
        // here.
        if (drawnGreyRays < MAX_DRAWN_GREY_RAYS && len > 0.12) {
          drawnGreyRays++;
          const back = { x: d.x - sun.x * 0.22, y: d.y - sun.y * 0.22 };
          strokePath(ctx, [P(back), q], 'rgba(255,246,214,0.16)', 1);
          // continues onward, undeviated -- same direction light was already
          // travelling in (away from the Sun, i.e. -sun)
          const onward = { x: d.x - sun.x * 0.16, y: d.y - sun.y * 0.16 };
          strokePath(ctx, [q, P(onward)], 'rgba(150,175,215,0.3)', 1);
        }
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

    // Sun icon, at a small FIXED pixel distance from the observer in the
    // correct direction -- not scaled by world units. The observer sits
    // close to the left edge (ox is only ~10% of the width, to leave room
    // for droplet depth on the antisolar side), so at low sun elevations the
    // true sun direction points almost straight off the left edge: there is
    // close to zero margin on that side by construction of the layout, so
    // no world-space radius reliably keeps the icon on-canvas. The dashed
    // axis line above is drawn unclamped (harmless off-canvas) and carries
    // the true far-away direction; the icon only needs to sit clearly,
    // legibly, and in the right direction close to the observer, the same
    // way the single-droplet view's own Sun icon is a fixed screen element
    // rather than a geometrically "correct" distance.
    const sunScreenDir = { x: sun.x, y: -sun.y };
    const sunMargin = 14;
    let sunDist = 70;
    if (sunScreenDir.x < -1e-6) sunDist = Math.min(sunDist, (ox - sunMargin) / -sunScreenDir.x);
    if (sunScreenDir.x > 1e-6) sunDist = Math.min(sunDist, (w - ox - sunMargin) / sunScreenDir.x);
    if (sunScreenDir.y < -1e-6) sunDist = Math.min(sunDist, (oy - sunMargin) / -sunScreenDir.y);
    if (sunScreenDir.y > 1e-6) sunDist = Math.min(sunDist, (h - oy - sunMargin) / sunScreenDir.y);
    sunDist = Math.max(24, sunDist);
    const sp = { x: ox + sunScreenDir.x * sunDist, y: oy + sunScreenDir.y * sunDist };
    const sg = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, 26);
    sg.addColorStop(0, 'rgba(255,238,180,0.9)');
    sg.addColorStop(1, 'rgba(255,210,90,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
    ctx.fill();
    if (state.show.labels) {
      // Left-aligned, not centred: the icon sits close to the left edge at
      // most sun elevations (see the clamp above), and a centred label would
      // clip against that edge.
      label(ctx, `${t('sunLabel')} · ${num(state.sunElevation, 0)}°`, Math.max(sp.x - 4, 4), sp.y - 28, {
        align: 'left', color: '#ffe9a8',
      });
    }

    // readout
    label(ctx, `${t('dropCount')}: ${fmt(drops.length)}`, 12, 16, { color: '#cfe0ff' });
    label(ctx, `${t('dropsContributing')}: ${fmt(contributing)}`, 12, 36, { color: '#6fd3a4' });

    // legend: what green vs grey actually means, spelled out next to a
    // sample swatch rather than left for the hint text alone to carry
    if (state.show.labels) {
      const swatch = (x, y, color) => {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      };
      swatch(16, 58, '#6fd3a4');
      label(ctx, t('dropsLegendReaches'), 26, 58, {
        align: 'left', color: '#9fd8bd', bg: false, font: '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      });
      swatch(16, 74, 'rgba(150,175,215,0.7)');
      label(ctx, t('dropsLegendMisses'), 26, 74, {
        align: 'left', color: '#8ea3c6', bg: false, font: '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      });

      const smallFont = '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
      label(ctx, t('dropsHint'), 12, h - 30, { color: '#8ea3c6', font: smallFont });
      label(ctx, t('dropsSunHint'), 12, h - 14, { color: '#e0a83f', font: smallFont });
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
