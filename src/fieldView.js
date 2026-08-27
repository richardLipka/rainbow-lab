/**
 * fieldView.js -- Mode D: the many-droplets argument, in three dimensions.
 *
 * This is the two-dimensional scene with the cross-section taken away. The
 * observer stands at the origin inside a volume of rain, and every droplet is
 * asked the same single question the flat scene asks: at what angle from the
 * antisolar direction does the observer see it, and does some wavelength's
 * caustic come out at exactly that angle?
 *
 * Nothing here draws a circle. The bow is whichever droplets answered yes, and
 * it comes out round because the set of directions at a fixed angle from an
 * axis IS a circle -- which is the one claim the sky view could previously
 * only make by drawing the circle it was trying to explain.
 */
import * as O from './optics.js';
import { state, set, indexModel } from './state.js';
import { t, deg, num } from './i18n.js';
import { fitCanvas, strokePath, label, capture, arrowHead } from './ui.js';
import { NEAR, SUN_FAR, makeCamera, clipPolyline, clampToCanvas } from './camera3d.js';
import { colorFor, bowSpectrum } from './rays.js';

/** Near and far edge of the rain volume, in world units. */
const R_MIN = 0.3;
const R_MAX = 6;

/**
 * How many metres one world unit is worth.
 *
 * The flat scene could leave its units abstract; this one cannot, because the
 * observer's height has to decide how much rain is below them and that is a
 * ratio of real lengths. Tying it to the same 2 km of shower the sky view
 * measures its down-limit with keeps the two scenes telling one story: at
 * 1.7 m the ground sits 0.00085 units down and there is essentially no rain
 * beneath the eye, while at 15 km it is 7.5 units down -- below the whole
 * volume, so nothing is cut and the ring closes.
 */
const WORLD_SCALE_M = 2000;

/** Wavelength bucket for batching droplet fills, in nm. */
const LAMBDA_BUCKET = 5;

export function createFieldView(canvas) {
  let drops = [];
  let seedKey = '';
  let cls = { key: '', lambda: null, order: null, lit: 0, shown: 0 };
  let cam = null;
  let size = { w: 0, h: 0 };

  /* ------------------------------------------------------------ the rain */

  function seed() {
    return String(state.fieldCount);
  }

  function regenerate() {
    const target = state.fieldCount;
    if (drops.length > target) drops.length = target;
    while (drops.length < target) drops.push(newDrop());
    seedKey = seed();
    cls.key = ''; // the field changed; every answer is stale
  }

  /**
   * One droplet, uniform in direction and volume-weighted in distance, so the
   * far shell is not starved the way an evenly-spaced radius would starve it.
   */
  function newDrop() {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = R_MIN + (R_MAX - R_MIN) * Math.cbrt(Math.random());
    return { x: Math.cos(a) * s * r, y: u * r, z: Math.sin(a) * s * r };
  }

  /** Ground level relative to the eye, in world units. */
  function groundY() {
    return -state.observerHeight / WORLD_SCALE_M;
  }

  /** The lowest height that has rain in it. Same rule as the flat scene. */
  function rainFloor() {
    return state.show.rainBelow ? groundY() : Math.max(groundY(), 0);
  }

  /* -------------------------------------------------------- the question */

  function classKey() {
    return [
      state.fieldCount, state.sunElevation, state.sunAzimuth, state.wavelength,
      state.dispersion, state.indexMode, state.indexScale, state.observerHeight,
      state.show.primary, state.show.secondary, state.show.higher, state.show.rainBelow,
    ].join('|');
  }

  /**
   * Ask every droplet the one question, once.
   *
   * Cached against the physics, not the camera: orbiting re-projects the same
   * answers instead of re-deriving them, which is what makes twenty thousand
   * droplets affordable. Each answer is a wavelength (or none) and the order
   * that delivered it -- no tolerance and no snapping to named colours, since
   * bowSpectrum() inverts the angle straight back to the wavelength whose
   * caustic is there. A band of angles gets a band of colour, continuously.
   */
  function classify() {
    const key = classKey();
    if (cls.key === key) return cls;

    const idx = indexModel();
    const orders = [];
    if (state.show.primary) orders.push(1);
    if (state.show.secondary) orders.push(2);
    if (state.show.higher) orders.push(3);
    const spectra = orders.map((k) => bowSpectrum(idx, k)).filter(Boolean);
    const single = state.wavelength === 'white' ? null : state.wavelength;

    const anti = O.antisolarDirection(state.sunElevation, state.sunAzimuth);
    const floor = rainFloor();
    const lambda = new Float32Array(drops.length);
    const order = new Uint8Array(drops.length);
    let lit = 0;
    let shown = 0;

    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      if (d.y < floor) continue; // no rain underground, or below the eye
      shown++;
      const len = Math.hypot(d.x, d.y, d.z);
      if (len < 1e-9) continue;
      // The angle the observer sees this droplet at. This is the whole test:
      // distance appears nowhere, exactly as in the flat scene.
      const phi = Math.acos(O.clamp((d.x * anti.x + d.y * anti.y + d.z * anti.z) / len, -1, 1)) * O.DEG;
      for (const sp of spectra) {
        const lam = sp.lambdaAt(phi);
        if (lam === null) continue;
        // With one wavelength selected only that colour is in the rain, so a
        // droplet lights up only where THAT wavelength's caustic lands.
        if (single !== null && Math.abs(lam - single) > 8) continue;
        lambda[i] = lam;
        order[i] = sp.k;
        lit++;
        break;
      }
    }
    cls = { key, lambda, order, lit, shown };
    return cls;
  }

  /* ------------------------------------------------------------ drawing */

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    size = { w, h };
    if (seedKey !== seed()) regenerate();

    const anti = O.antisolarDirection(state.sunElevation, state.sunAzimuth);
    const sun = O.sunDirection(state.sunElevation, state.sunAzimuth);

    ctx.clearRect(0, 0, w, h);
    if (state.view === 'eye') {
      const az = state.sunAzimuth + 180 + state.eyeAzimuth;
      cam = makeCamera(O.vec(0, 0, 0), O.sunDirection(state.eyeElevation, az), state.fov, w, h);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0a1730');
      g.addColorStop(0.55, '#12294d');
      g.addColorStop(1, '#1d3a63');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else {
      // Outside the rain, not inside it. At the sky view's camera distance
      // the eye sits within R_MAX and the volume fills the frame, so the
      // lit droplets read as scattered dots instead of as the cone they
      // actually lie on. Pulled back until the whole volume fits.
      const eye = O.vmul(O.sunDirection(state.camPitch, state.camYaw), state.camDist * 3.8);
      cam = makeCamera(eye, O.vnorm(O.vsub(O.vmul(anti, 1.4), eye)), 42, w, h);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#070a12');
      g.addColorStop(1, '#0c1020');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    if (state.show.ground) drawGround(ctx);
    if (state.show.horizon) drawHorizon(ctx);

    const answers = classify();
    drawDroplets(ctx, answers, w, h);

    drawAxis(ctx, sun, anti, w, h);
    if (state.view === 'orbit') drawObserver(ctx);
    drawReadout(ctx, answers, w, h);
  }

  function drawGround(ctx) {
    const y0 = groundY();
    const col = 'rgba(120,170,140,0.26)';
    for (let r = 1; r <= R_MAX + 0.01; r += 1) {
      const pts = [];
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        pts.push(O.vec(Math.cos(a) * r, y0, Math.sin(a) * r));
      }
      for (const run of clipPolyline(cam, pts)) strokePath(ctx, run, col, 0.7);
    }
    if (state.view === 'orbit') {
      for (const run of clipPolyline(cam, [O.vec(0, 0, 0), O.vec(0, y0, 0)])) {
        strokePath(ctx, run, 'rgba(150,200,170,0.5)', 1, [4, 4]);
      }
    }
  }

  function drawHorizon(ctx) {
    const dip = O.horizonDipDeg(state.observerHeight);
    const pts = [];
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      const el = -dip * O.RAD;
      pts.push(O.vec(Math.cos(el) * Math.cos(a) * R_MAX, Math.sin(el) * R_MAX, Math.cos(el) * Math.sin(a) * R_MAX));
    }
    for (const run of clipPolyline(cam, pts)) {
      strokePath(ctx, run, 'rgba(150,200,170,0.55)', 1.2, [7, 4]);
    }
  }

  /**
   * The droplets, batched by colour.
   *
   * One path per wavelength bucket and one per grey pass: twenty thousand
   * individual fill() calls is what makes a field this size unaffordable, and
   * the bucket width is far finer than the eye resolves across a 2 deg band.
   */
  function drawDroplets(ctx, answers, w, h) {
    const floor = rainFloor();
    const grey = new Path2D();
    const buckets = new Map();
    const showGrey = state.show.droplets;

    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      if (d.y < floor) continue;
      const z = cam.depth(d);
      if (z <= NEAR) continue;
      const p = cam.project(d);
      if (p.x < -8 || p.x > w + 8 || p.y < -8 || p.y > h + 8) continue;
      const r = O.clamp((0.0055 * cam.scale) / z, 0.45, 3.2);
      const lam = answers.lambda[i];
      if (lam > 0) {
        const key = Math.round(lam / LAMBDA_BUCKET) * LAMBDA_BUCKET;
        let path = buckets.get(key);
        if (!path) {
          path = new Path2D();
          buckets.set(key, path);
        }
        // Drawn larger than a grey one. The lit droplets are a few hundred
        // out of tens of thousands, and at the grey radius the band they
        // form is too thin to read as a bow at any honest droplet count.
        path.moveTo(p.x + r + 1.2, p.y);
        path.arc(p.x, p.y, r + 1.2, 0, Math.PI * 2);
      } else if (showGrey) {
        grey.moveTo(p.x + r, p.y);
        grey.arc(p.x, p.y, r, 0, Math.PI * 2);
      }
    }

    if (showGrey) {
      ctx.fillStyle = 'rgba(150,175,215,0.22)';
      ctx.fill(grey);
    }
    for (const [lam, path] of buckets) {
      ctx.fillStyle = colorFor(lam, 0.95);
      ctx.fill(path);
    }
  }

  function drawAxis(ctx, sun, anti, w, h) {
    for (const run of clipPolyline(cam, [O.vmul(sun, SUN_FAR), O.vmul(anti, SUN_FAR)])) {
      strokePath(ctx, run, 'rgba(255,225,160,0.2)', 1, [6, 6]);
    }
    const far = O.vmul(sun, SUN_FAR);
    if (cam.depth(far) > NEAR) {
      const p = clampToCanvas(cam.project(far), w, h, 30);
      const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 28);
      g.addColorStop(0, 'rgba(255,240,190,0.85)');
      g.addColorStop(1, 'rgba(255,215,110,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
      ctx.fill();
      const dx = w / 2 - p.x;
      const dy = h / 2 - p.y;
      const len = Math.hypot(dx, dy) || 1;
      arrowHead(ctx, p, { x: p.x + (dx / len) * 16, y: p.y + (dy / len) * 16 }, 'rgba(255,233,168,0.9)', 8);
      if (state.show.labels) {
        label(ctx, `${t('sunLabel')} · ${deg(state.sunElevation, 0)}`,
          O.clamp(p.x - (dx / len) * 34, 52, w - 52),
          O.clamp(Math.max(p.y - (dy / len) * 34, 120), 14, h - 14),
          { align: 'center', color: '#ffe9a8' });
      }
    }
    if (state.show.antisolar) {
      const ap = O.vmul(anti, R_MAX * 0.92);
      if (cam.depth(ap) > NEAR) {
        const p = cam.project(ap);
        ctx.strokeStyle = '#8fd7ff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x - 11, p.y);
        ctx.lineTo(p.x + 11, p.y);
        ctx.moveTo(p.x, p.y - 11);
        ctx.lineTo(p.x, p.y + 11);
        ctx.stroke();
        if (state.show.labels) {
          label(ctx, t('antisolarPoint'), p.x, p.y + 22, { align: 'center', color: '#8fd7ff' });
        }
      }
    }
  }

  function drawObserver(ctx) {
    const o = O.vec(0, 0, 0);
    if (cam.depth(o) <= NEAR) return;
    const p = cam.project(o);
    ctx.fillStyle = '#e8eefc';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    if (state.show.labels) {
      label(ctx, `${t('observerLabel')} · ${num(state.observerHeight, state.observerHeight < 10 ? 1 : 0)} ${t('metres')}`,
        p.x, p.y + 18, { align: 'center', color: '#e8eefc' });
    }
  }

  function drawReadout(ctx, answers, w, h) {
    let y = 16;
    const put = (s, color) => {
      label(ctx, s, 12, y, { color });
      y += 19;
    };
    put(`${t('dropCount')}: ${fmt(answers.shown)}`, '#cfe0ff');
    put(`${t('dropsContributing')}: ${fmt(answers.lit)}`, '#6fd3a4');
    put(`${t('fieldNoCircle')}`, '#8ea3c6');
    if (state.show.labels) {
      label(ctx, t('fieldHint'), 12, h - 14, {
        color: '#9fd8bd', font: '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      });
    }
  }

  function fmt(n) {
    return n >= 1000 ? `${num(n / 1000, n >= 10000 ? 0 : 1)}k` : String(n);
  }

  /* -------------------------------------------------------- interaction */

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY };
    capture(canvas, e);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY };
    if (state.view === 'orbit') {
      set({ camYaw: state.camYaw + dx * 0.4, camPitch: O.clamp(state.camPitch + dy * 0.3, -85, 85) });
    } else {
      set({
        eyeAzimuth: state.eyeAzimuth - dx * 0.15,
        eyeElevation: O.clamp(state.eyeElevation + dy * 0.12, -85, 85),
      });
    }
  });
  const stop = () => {
    drag = null;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (state.view === 'orbit') {
      set({ camDist: O.clamp(state.camDist * (1 + Math.sign(e.deltaY) * 0.08), 1.2, 9) });
    } else {
      set({ fov: O.clamp(state.fov + Math.sign(e.deltaY) * 3, 25, 140) });
    }
  }, { passive: false });
  canvas.style.cursor = 'grab';

  return {
    draw,
    tick: () => false,
    reset: () => {
      drops = [];
      seedKey = '';
      cls = { key: '', lambda: null, order: null, lit: 0, shown: 0 };
    },
  };
}
