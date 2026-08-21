/**
 * graphView.js -- the two diagnostic plots.
 *
 *   'exit'  exit angle versus impact parameter, one curve per wavelength and
 *           per reflection order. The extremum is found by the optics engine,
 *           never drawn as a decorative horizontal line.
 *   'dist'  the angular distribution of outgoing rays, accumulated ray by ray
 *           so that the caustic peak visibly emerges.
 *
 * Both directions of the interaction are wired: dragging the ray moves the
 * marker, clicking the graph moves the ray.
 */
import * as O from './optics.js';
import { state, set, activeLambdas, activeOrders, indexModel } from './state.js';
import { t, deg, num } from './i18n.js';
import { fitCanvas, strokePath, label } from './ui.js';
import { colorFor } from './rays.js';

const PAD = { l: 58, r: 16, t: 26, b: 34 };

export function createGraphView(canvas) {
  let box = null;
  const accum = { key: '', data: new Map(), count: 0, target: 0 };
  let raf = null;

  /* --------------------------------------------------------- accumulator */

  function accumKey() {
    return [
      activeOrders().join(','),
      activeLambdas().join(','),
      state.dispersion,
      state.indexMode,
      state.indexScale,
      distRange().join(','),
    ].join('|');
  }

  function distRange() {
    const orders = activeOrders();
    const maxK = Math.max(...orders);
    const minK = Math.min(...orders);
    if (maxK <= 2 && minK >= 1) return [0, 90];
    return [0, 180];
  }

  const BINS = 540;

  function resetAccum() {
    accum.key = accumKey();
    accum.data = new Map();
    accum.count = 0;
    for (const lam of activeLambdas()) accum.data.set(lam, new Float64Array(BINS));
  }

  /** Add `m` randomly sampled rays per wavelength (area-weighted in b). */
  function addRays(m) {
    const idx = indexModel();
    const orders = activeOrders();
    const [lo, hi] = distRange();
    const bw = (hi - lo) / BINS;
    for (const lam of activeLambdas()) {
      const arr = accum.data.get(lam);
      if (!arr) continue;
      const n = idx(lam);
      for (let i = 0; i < m; i++) {
        const b = Math.sqrt(Math.random());
        const thetaI = Math.asin(O.clamp(b, 0, 1));
        for (const k of orders) {
          const D = O.deviation(thetaI, n, k);
          if (D === null) continue;
          const phi = O.antisolarAngle(D) * O.DEG;
          const R = O.fresnelReflectance(thetaI, 1, n);
          const w = (1 - R) * (1 - R) * Math.pow(R, k);
          const bin = Math.floor((phi - lo) / bw);
          if (bin >= 0 && bin < BINS) arr[bin] += w;
        }
      }
    }
    accum.count += m;
  }

  function stepAccum() {
    if (accum.key !== accumKey()) resetAccum();
    const target = state.distAccumulate ? Infinity : state.distRays;
    if (accum.count > state.distRays && !state.distAccumulate) resetAccum();
    if (accum.count < target) {
      const remaining = target - accum.count;
      const batch = Math.min(
        Math.max(1, Math.ceil(accum.count * 0.35) || 1),
        remaining,
        state.distAccumulate ? 3000 : 8000
      );
      addRays(batch);
      return true; // more to come
    }
    return false;
  }

  /* -------------------------------------------------------------- drawing */

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#080b14';
    ctx.fillRect(0, 0, w, h);
    box = { x: PAD.l, y: PAD.t, w: w - PAD.l - PAD.r, h: h - PAD.t - PAD.b };
    if (box.w < 40 || box.h < 30) return;
    if (state.graph === 'exit') drawExit(ctx, w, h);
    else drawDist(ctx, w, h);
  }

  function frame(ctx, xLabel, yLabel, xTicks, yTicks, fx, fy) {
    ctx.save();
    ctx.strokeStyle = 'rgba(120,140,180,0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.fillStyle = '#7c8fb3';
    for (const v of xTicks) {
      const x = fx(v);
      ctx.strokeStyle = 'rgba(120,140,180,0.13)';
      ctx.beginPath();
      ctx.moveTo(x, box.y);
      ctx.lineTo(x, box.y + box.h);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(num(v, v % 1 === 0 ? 0 : 1), x, box.y + box.h + 13);
    }
    for (const v of yTicks) {
      const y = fy(v);
      ctx.strokeStyle = 'rgba(120,140,180,0.13)';
      ctx.beginPath();
      ctx.moveTo(box.x, y);
      ctx.lineTo(box.x + box.w, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(num(v, v % 1 === 0 ? 0 : 1), box.x - 7, y + 3);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8ea3c6';
    ctx.font = '11px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(xLabel, box.x + box.w / 2, box.y + box.h + 28);
    ctx.save();
    ctx.translate(13, box.y + box.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
    ctx.restore();
  }

  function niceTicks(lo, hi, count = 6) {
    const span = hi - lo;
    if (!(span > 0)) return [lo];
    const raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const stepN = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    const step = stepN * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
      out.push(Math.abs(v) < 1e-9 ? 0 : v);
    }
    return out;
  }

  /* ------------------------------------------------ exit-angle vs impact */

  let exitMap = null;

  function drawExit(ctx, w, h) {
    const idx = indexModel();
    const orders = activeOrders();
    const lambdas = activeLambdas();
    const curves = [];
    let lo = Infinity;
    let hi = -Infinity;
    for (const k of orders) {
      for (const lam of lambdas) {
        const n = idx(lam);
        const c = O.exitAngleCurve(n, k, 320);
        const vals =
          state.angleMode === 'deviation' ? c.D : state.angleMode === 'scattering' ? c.theta : c.phi;
        for (const v of vals) {
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        curves.push({ k, lam, n, b: c.b, vals });
      }
    }
    if (!curves.length) return;
    const padY = Math.max(2, (hi - lo) * 0.12);
    lo = Math.max(0, lo - padY);
    hi = hi + padY;

    const fx = (b) => box.x + b * box.w;
    const fy = (v) => box.y + box.h - ((v - lo) / (hi - lo)) * box.h;
    exitMap = { fx, fy, lo, hi };

    const yKey =
      state.angleMode === 'deviation'
        ? 'axisAngleDeviation'
        : state.angleMode === 'scattering'
        ? 'axisAngleScattering'
        : 'axisAngleAntisolar';
    frame(ctx, t('axisImpact'), t(yKey), niceTicks(0, 1, 5), niceTicks(lo, hi, 6), fx, fy);

    // extremum guide lines, computed by the engine
    for (const k of orders) {
      if (k < 1) continue;
      for (const lam of lambdas) {
        const geo = O.rainbowGeometry(idx(lam), k);
        if (!geo) continue;
        const v =
          state.angleMode === 'deviation'
            ? geo.deviationDeg
            : state.angleMode === 'scattering'
            ? geo.scatteringDeg
            : geo.antisolarDeg;
        if (v < lo || v > hi) continue;
        const y = fy(v);
        strokePath(
          ctx,
          [{ x: box.x, y }, { x: box.x + box.w, y }],
          colorFor(lam, 0.28), 1, [3, 5]
        );
        const x = fx(geo.impactParameter);
        strokePath(ctx, [{ x, y: box.y + box.h }, { x, y }], colorFor(lam, 0.22), 1, [3, 5]);
        ctx.fillStyle = colorFor(lam, 0.95);
        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const c of curves) {
      const pts = [];
      for (let i = 0; i < c.b.length; i++) pts.push({ x: fx(c.b[i]), y: fy(c.vals[i]) });
      strokePath(ctx, pts, colorFor(c.lam, c.k === 1 ? 0.95 : 0.7),
        c.k === 1 ? 2 : 1.5, c.k === 2 ? [6, 3] : c.k >= 3 ? [2, 3] : null);
    }

    // label each extremum once (using the longest wavelength present)
    const lamLabel = lambdas.includes(650) ? 650 : lambdas[0];
    for (const k of orders) {
      if (k < 1) continue;
      const geo = O.rainbowGeometry(idx(lamLabel), k);
      if (!geo) continue;
      const v =
        state.angleMode === 'deviation'
          ? geo.deviationDeg
          : state.angleMode === 'scattering'
          ? geo.scatteringDeg
          : geo.antisolarDeg;
      if (v < lo || v > hi) continue;
      label(ctx, `k=${k} · ${t('extremumLabel')} ${deg(v, 2)}`, fx(geo.impactParameter) + 8, fy(v) - 14, {
        color: colorFor(lamLabel), font: '10px "IBM Plex Mono", ui-monospace, monospace',
      });
    }

    // the moving marker for the ray currently in the droplet
    const bNow = Math.abs(state.impact);
    const x = fx(bNow);
    strokePath(ctx, [{ x, y: box.y }, { x, y: box.y + box.h }], 'rgba(255,255,255,0.4)', 1);
    for (const c of curves) {
      const v = O.angleFor(c.n, c.k, bNow, state.angleMode);
      if (v === null || v < lo || v > hi) continue;
      ctx.fillStyle = colorFor(c.lam);
      ctx.beginPath();
      ctx.arc(x, fy(v), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    label(ctx, `b/R = ${num(bNow, 3)}`, x, box.y + 10, { align: 'center', color: '#e8eefc' });
  }

  /* ------------------------------------------------- angular distribution */

  function drawDist(ctx, w, h) {
    if (accum.key !== accumKey()) resetAccum();
    const [lo, hi] = distRange();
    const bw = (hi - lo) / BINS;

    // radiance = energy per bin divided by the solid angle of the annulus
    let peak = 0;
    const shown = [];
    for (const [lam, arr] of accum.data) {
      const rad = new Float64Array(BINS);
      for (let i = 0; i < BINS; i++) {
        const phiMid = (lo + (i + 0.5) * bw) * O.RAD;
        rad[i] = arr[i] / Math.max(Math.sin(phiMid), 0.02);
        if (rad[i] > peak) peak = rad[i];
      }
      shown.push({ lam, rad });
    }
    if (peak <= 0) peak = 1;

    const fx = (a) => box.x + ((a - lo) / (hi - lo)) * box.w;
    const fy = (v) => box.y + box.h - (v / peak) * box.h * 0.92;
    frame(ctx, t('axisAngleAntisolar'), t('axisRayCount'),
      niceTicks(lo, hi, 7), [], fx, fy);

    for (const { lam, rad } of shown) {
      const pts = [];
      for (let i = 0; i < BINS; i++) pts.push({ x: fx(lo + (i + 0.5) * bw), y: fy(rad[i]) });
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(box.x, box.y + box.h);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.lineTo(box.x + box.w, box.y + box.h);
      ctx.closePath();
      ctx.fillStyle = colorFor(lam, shown.length > 1 ? 0.3 : 0.35);
      ctx.fill();
      ctx.restore();
      strokePath(ctx, pts, colorFor(lam, 0.9), 1.2);
    }

    // where the engine says the extremum is
    const idx = indexModel();
    for (const k of activeOrders()) {
      if (k < 1) continue;
      for (const lam of activeLambdas()) {
        const geo = O.rainbowGeometry(idx(lam), k);
        if (!geo || geo.antisolarDeg < lo || geo.antisolarDeg > hi) continue;
        const x = fx(geo.antisolarDeg);
        strokePath(ctx, [{ x, y: box.y }, { x, y: box.y + box.h }], colorFor(lam, 0.35), 1, [4, 4]);
      }
    }

    label(ctx, `${t('rayCount')}: ${formatCount(accum.count)}`, box.x + box.w - 8, box.y + 12, {
      align: 'right', color: '#e8eefc',
    });
    const peakDeg = peakAngle(shown, lo, bw);
    if (peakDeg !== null) {
      label(ctx, `${t('extremumLabel')} ${deg(peakDeg, 2)}`, fx(peakDeg), box.y + 30, {
        align: 'center', color: '#6fd3a4',
      });
    }
  }

  function peakAngle(shown, lo, bw) {
    let best = -1;
    let bi = -1;
    for (const { rad } of shown) {
      for (let i = 0; i < rad.length; i++) {
        if (rad[i] > best) {
          best = rad[i];
          bi = i;
        }
      }
    }
    return bi < 0 || best <= 0 ? null : lo + (bi + 0.5) * bw;
  }

  function formatCount(c) {
    if (c >= 1000000) return `${num(c / 1000000, 1)}M`;
    if (c >= 1000) return `${num(c / 1000, c >= 10000 ? 0 : 1)}k`;
    return String(c);
  }

  /* --------------------------------------------------------- interaction */

  canvas.addEventListener('pointerdown', (e) => {
    if (state.graph !== 'exit' || !box || !exitMap) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const b = O.clamp((x - box.x) / box.w, 0, 0.999);
    set({ impact: b });
  });
  canvas.addEventListener('pointermove', (e) => {
    if (state.graph !== 'exit' || !box) return;
    canvas.style.cursor = e.offsetX > box.x && e.offsetX < box.x + box.w ? 'ew-resize' : 'default';
  });

  /** Called every animation frame by the app while the dist plot is visible. */
  function tick() {
    if (state.graph !== 'dist') return false;
    return stepAccum();
  }

  return { draw, tick, reset: resetAccum };
}
