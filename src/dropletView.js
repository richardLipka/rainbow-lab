/**
 * dropletView.js -- Mode A: cross-section of a single spherical droplet.
 *
 * Nothing in here knows any optics: it renders the polylines that
 * optics.traceRay() produced. Dragging changes the impact parameter, which
 * re-runs the trace.
 */
import * as O from './optics.js';
import { state, set, indexModel } from './state.js';
import { buildRays, distanceFromExtremum, colorFor } from './rays.js';
import { t, deg, num } from './i18n.js';
import { fitCanvas, strokePath, label, arrowHead, angleArc } from './ui.js';

const SEG_LABELS = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5'];

export function createDropletView(canvas) {
  let layout = null;
  let hover = null;

  function project(p) {
    return { x: layout.cx + p.x * layout.s, y: layout.cy - p.y * layout.s };
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);

    const s = Math.min(w * 0.19, h * 0.34);
    layout = { cx: w * 0.47, cy: h * 0.5, s, w, h };

    drawBackground(ctx, w, h);
    drawDroplet(ctx);
    drawSun(ctx, w, h);

    const rays = buildRays();
    // fans first, main rays on top
    const order = { fan: 0, demo0: 1, demoNC: 1, main: 2 };
    rays.sort((a, b) => order[a.role] - order[b.role]);
    for (const ray of rays) drawRay(ctx, ray);

    const main = rays.filter((r) => r.role === 'main');
    if (main.length) {
      const ref = main[main.length - 1];
      if (state.show.angles) drawAngles(ctx, ref);
      if (state.show.labels) drawSegmentLabels(ctx, ref);
      if (state.show.angles && ref.path.dirOut) drawExitAngle(ctx, ref);
      if (state.show.normals) for (const r of main) drawNormals(ctx, r);
    }
    drawImpactHandle(ctx);
    drawLegend(ctx, w, h, rays);
  }

  function drawBackground(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#080b14');
    g.addColorStop(1, '#0d1220');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // optical axis through the droplet centre
    strokePath(
      ctx,
      [{ x: 0, y: layout.cy }, { x: w, y: layout.cy }],
      'rgba(120,140,180,0.18)',
      1,
      [4, 6]
    );
    if (state.show.labels) {
      label(ctx, t('antisolarPoint'), 14, layout.cy - 13, {
        color: '#8fa4c8', bg: false, font: '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      });
    }
  }

  function drawDroplet(ctx) {
    const { cx, cy, s } = layout;
    const g = ctx.createRadialGradient(cx - s * 0.35, cy - s * 0.35, s * 0.1, cx, cy, s);
    g.addColorStop(0, 'rgba(120,190,255,0.16)');
    g.addColorStop(1, 'rgba(60,110,190,0.06)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,190,255,0.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // centre mark
    ctx.fillStyle = 'rgba(160,200,255,0.6)';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    if (state.show.labels) {
      const idx = indexModel();
      const lam = state.wavelength === 'white' ? 589 : state.wavelength;
      label(ctx, `${t('raindrop')} · n = ${num(idx(lam), 3)}`, cx, cy + s + 16, {
        align: 'center', color: '#9fc4ee',
      });
      label(ctx, `R = ${num(state.dropletRadiusMm, 2)} mm`, cx, cy + s + 34, {
        align: 'center', color: '#6f86ab', bg: false, font: '10px "IBM Plex Mono", ui-monospace, monospace',
      });
    }
  }

  function drawSun(ctx, w, h) {
    const y = layout.cy - state.impact * layout.s;
    ctx.save();
    const g = ctx.createRadialGradient(24, y, 2, 24, y, 16);
    g.addColorStop(0, 'rgba(255,238,180,0.95)');
    g.addColorStop(1, 'rgba(255,210,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(24, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(24, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (state.show.labels) {
      label(ctx, t('sunLabel'), 24, y - 24, { align: 'center', color: '#ffe9a8' });
    }
  }

  function rayAlpha(ray) {
    if (ray.role === 'fan') return 0.24;
    if (ray.role === 'demo0' || ray.role === 'demoNC') return 0.75;
    return 1;
  }

  function drawRay(ctx, ray) {
    const p = ray.path;
    if (!p.hit && !p.miss) return;
    const a = rayAlpha(ray);
    const selected =
      state.selectedRay &&
      state.selectedRay.k === ray.k &&
      Math.abs(state.selectedRay.b - ray.b) < 1e-9 &&
      state.selectedRay.lambda === ray.lambda;

    const base = colorFor(ray.lambda, a);
    const dashed = ray.role === 'demo0' || ray.role === 'demoNC';

    for (const seg of p.segments) {
      const A = project(seg.a);
      const B = project(seg.b);
      let width = ray.role === 'fan' ? 1 : 1.9;
      if (selected) width += 1.6;
      let style = base;
      if (seg.medium === 'water') {
        style = colorFor(ray.lambda, Math.min(1, a * 0.95));
        width += 0.2;
      }
      if (seg.kind === 'incident' && ray.role !== 'fan') {
        style = state.wavelength === 'white' ? `rgba(255,246,214,${a})` : base;
      }
      strokePath(ctx, [A, B], style, width, dashed && seg.kind !== 'internal' ? [5, 4] : null);
    }

    if (p.dirOut && p.segments.length) {
      const last = p.segments[p.segments.length - 1];
      arrowHead(ctx, project(last.a), project(last.b), base, ray.role === 'fan' ? 4 : 7);
    }

    if (ray.role !== 'fan') {
      for (const v of p.vertices) {
        const q = project(v.point);
        ctx.fillStyle = v.type === 'reflection' ? '#ffd166' : '#8be0ff';
        ctx.beginPath();
        ctx.arc(q.x, q.y, selected ? 3.6 : 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (ray.noteKey && state.show.labels) {
      const last = p.segments[p.segments.length - 1];
      const q = project(last.b);
      const txt = t(ray.noteKey);
      label(ctx, txt.length > 62 ? txt.slice(0, 60) + '…' : txt,
        Math.min(q.x, layout.w - 12), q.y + (ray.k === 0 ? 16 : -16), {
        align: 'right', color: '#c3b6ff', font: '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      });
    }
  }

  function drawNormals(ctx, ray) {
    for (const v of ray.path.vertices) {
      const a = project(v.point);
      const nEnd = O.vadd(v.point, O.vmul(v.normal, 0.42));
      const b = project(nEnd);
      strokePath(ctx, [a, b], 'rgba(180,200,240,0.5)', 1, [3, 3]);
      const inner = project(O.vsub(v.point, O.vmul(v.normal, 0.42)));
      strokePath(ctx, [a, inner], 'rgba(180,200,240,0.22)', 1, [3, 3]);
    }
  }

  function drawSegmentLabels(ctx, ray) {
    const segs = ray.path.segments;
    for (let i = 0; i < segs.length && i < SEG_LABELS.length; i++) {
      const s = segs[i];
      const mid = { x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 };
      const q = project(mid);
      label(ctx, SEG_LABELS[i], q.x, q.y - 12, {
        align: 'center', color: '#93a7c9', font: '10px "IBM Plex Mono", ui-monospace, monospace',
      });
    }
  }

  function drawAngles(ctx, ray) {
    const v = ray.path.vertices[0];
    if (!v) return;
    const c = project(v.point);
    const nDir = { x: v.normal.x, y: -v.normal.y };
    const nAng = Math.atan2(nDir.y, nDir.x);
    const inAng = Math.atan2(0, -1); // incoming ray reversed = pointing back to the Sun
    const r = 30;
    angleArc(ctx, c.x, c.y, r, nAng, inAng, 'rgba(139,224,255,0.8)', `θi=${deg(v.thetaIn * O.DEG, 1)}`);
    const refr = ray.path.segments[1];
    if (refr) {
      const d = { x: refr.b.x - refr.a.x, y: -(refr.b.y - refr.a.y) };
      const rAng = Math.atan2(d.y, d.x);
      angleArc(ctx, c.x, c.y, r * 0.62, nAng + Math.PI, rAng, 'rgba(255,209,102,0.85)',
        `θr=${deg(v.thetaOut * O.DEG, 1)}`);
    }
  }

  function drawExitAngle(ctx, ray) {
    const p = ray.path;
    const exitSeg = p.segments[p.segments.length - 1];
    const origin = project(exitSeg.a);
    // reference direction = away from the Sun (the antisolar direction), i.e. +x
    const refEnd = { x: origin.x + 78, y: origin.y };
    strokePath(ctx, [origin, refEnd], 'rgba(120,140,180,0.5)', 1, [3, 4]);
    const d = { x: exitSeg.b.x - exitSeg.a.x, y: -(exitSeg.b.y - exitSeg.a.y) };
    const outAng = Math.atan2(d.y, d.x);
    const phi = p.antisolar * O.DEG;
    angleArc(ctx, origin.x, origin.y, 46, 0, outAng, 'rgba(111,211,164,0.95)', `φ=${deg(phi, 1)}`);
  }

  function drawImpactHandle(ctx) {
    const y = layout.cy - state.impact * layout.s;
    const x = layout.cx - layout.s * 1.9;
    ctx.save();
    ctx.strokeStyle = hover ? 'rgba(255,255,255,0.75)' : 'rgba(180,200,240,0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(x, layout.cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = hover ? '#ffffff' : 'rgba(200,220,255,0.85)';
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (state.show.labels) {
      label(ctx, `b/R = ${num(state.impact, 3)}`, x, y - 16, { align: 'center', color: '#cfe0ff' });
    }
  }

  function drawLegend(ctx, w, h, rays) {
    if (!state.show.wavelengthLabels) return;
    const main = rays.filter((r) => r.role === 'main');
    const seen = new Set();
    let y = 18;
    for (const r of main) {
      if (seen.has(r.lambda)) continue;
      seen.add(r.lambda);
      const txt = `${r.lambda} ${t('nm')} · n=${num(r.n, 4)} · φ=${
        r.path.antisolar === null ? '—' : deg(r.path.antisolar * O.DEG, 2)
      }`;
      label(ctx, txt, w - 12, y, { align: 'right', color: colorFor(r.lambda) });
      y += 18;
    }
  }

  /* ---------------------------------------------------------- interaction */

  function impactFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const b = (layout.cy - y) / layout.s;
    return Math.max(-0.999, Math.min(0.999, b));
  }

  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => {
    if (!layout) return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    set({ impact: impactFromEvent(e) });
    selectNearest(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!layout) return;
    if (dragging) {
      set({ impact: impactFromEvent(e) });
    } else {
      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hy = layout.cy - state.impact * layout.s;
      const nowHover = Math.abs(y - hy) < 14;
      if (nowHover !== hover) {
        hover = nowHover;
        canvas.style.cursor = hover ? 'ns-resize' : 'crosshair';
        draw();
      }
    }
  });
  const stop = () => { dragging = false; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  function selectNearest(e) {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best = null;
    let bestD = 14;
    for (const ray of buildRays()) {
      for (const seg of ray.path.segments) {
        const A = project(seg.a);
        const B = project(seg.b);
        const d = distToSegment(px, py, A, B);
        if (d < bestD) {
          bestD = d;
          best = ray;
        }
      }
    }
    if (best) {
      set({ selectedRay: { lambda: best.lambda, k: best.k, b: best.b }, panel: 'ray' });
    }
  }

  return { draw, tick: () => false, reset: () => {} };
}

function distToSegment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - a.x, py - a.y);
  let tt = ((px - a.x) * dx + (py - a.y) * dy) / l2;
  tt = Math.max(0, Math.min(1, tt));
  return Math.hypot(px - (a.x + tt * dx), py - (a.y + tt * dy));
}

export { distanceFromExtremum };
