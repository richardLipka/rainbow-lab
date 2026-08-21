/**
 * skyView.js -- Mode C: the 3-D geometry.
 *
 * The observer sits at the origin. Every direction is a unit vector, so the
 * "sky" is the unit sphere and the bow is literally the set of directions at
 * angle phi from the antisolar direction. The ground is a plane below the
 * observer, which is what produces the horizon -- the arc is never drawn as
 * an arc, it is a circle with part of it cut away.
 *
 * A small hand-written perspective camera keeps the whole app dependency-free.
 */
import * as O from './optics.js';
import { state, set, indexModel } from './state.js';
import { t, deg, num } from './i18n.js';
import { fitCanvas, strokePath, label } from './ui.js';
import { colorFor } from './rays.js';

const NEAR = 0.02;

/* ------------------------------------------------------------- camera ---- */

function makeCamera(eye, forward, fovDeg, w, h) {
  const zA = O.vnorm(O.vneg(forward));
  let upHint = O.vec(0, 1, 0);
  if (Math.abs(O.vdot(zA, upHint)) > 0.999) upHint = O.vec(0, 0, 1);
  const xA = O.vnorm(O.vcross(upHint, zA));
  const yA = O.vcross(zA, xA);
  const f = 1 / Math.tan((fovDeg * O.RAD) / 2);
  const scale = (h / 2) * f;
  return {
    eye,
    project(p) {
      const d = O.vsub(p, eye);
      const cx = O.vdot(d, xA);
      const cy = O.vdot(d, yA);
      const cz = -O.vdot(d, zA);
      return { x: w / 2 + (cx / cz) * scale, y: h / 2 - (cy / cz) * scale, z: cz };
    },
    /** Camera-space depth only, used for near-plane clipping. */
    depth(p) {
      return -O.vdot(O.vsub(p, eye), zA);
    },
  };
}

/** Project a world polyline, splitting it wherever it crosses the near plane. */
function clipPolyline(cam, pts) {
  const out = [];
  let run = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const z = cam.depth(p);
    if (z > NEAR) {
      run.push(cam.project(p));
    } else {
      if (run.length > 1) out.push(run);
      run = [];
      // enter/exit points keep the line touching the edge instead of jumping
      const prev = pts[i - 1];
      if (prev && cam.depth(prev) > NEAR) {
        run.push(cam.project(lerpToNear(cam, prev, p)));
        out.push(run);
        run = [];
      }
      const next = pts[i + 1];
      if (next && cam.depth(next) > NEAR) run.push(cam.project(lerpToNear(cam, next, p)));
    }
  }
  if (run.length > 1) out.push(run);
  return out;
}

function lerpToNear(cam, inside, outside) {
  const zi = cam.depth(inside);
  const zo = cam.depth(outside);
  const tt = (zi - NEAR) / (zi - zo);
  return O.vadd(inside, O.vmul(O.vsub(outside, inside), Math.max(0, Math.min(1, tt))));
}

/* --------------------------------------------------- cached bow profile -- */

let profileCache = { key: '', profile: null };

function bowProfile() {
  const key = `${state.dispersion}|${state.indexMode}|${state.indexScale}|${state.show.primary}|${state.show.secondary}|${state.show.higher}`;
  if (profileCache.key === key) return profileCache.profile;
  const orders = [];
  if (state.show.primary) orders.push(1);
  if (state.show.secondary) orders.push(2);
  const profile = orders.length
    ? O.spectralProfile({
        indexModel: indexModel(),
        orders,
        minDeg: 34,
        maxDeg: 60,
        bins: 260,
        rays: 5000,
      })
    : null;
  profileCache = { key, profile };
  return profile;
}

/* ------------------------------------------------------------- the view -- */

export function createSkyView(canvas) {
  let cam = null;
  let size = { w: 0, h: 0 };

  function groundDepth() {
    // observer height, compressed logarithmically so 1.7 m and 1000 m both fit
    return Math.min(0.62, 0.05 + Math.log10(1 + state.observerHeight) * 0.16);
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    size = { w, h };
    ctx.clearRect(0, 0, w, h);

    const anti = O.antisolarDirection(state.sunElevation, state.sunAzimuth);
    const sun = O.sunDirection(state.sunElevation, state.sunAzimuth);
    const gh = groundDepth();
    const dip = O.horizonDipDeg(state.observerHeight);

    if (state.view === 'eye') {
      const az = state.sunAzimuth + 180 + state.eyeAzimuth;
      const fwd = O.sunDirection(state.eyeElevation, az);
      cam = makeCamera(O.vec(0, 0, 0), fwd, state.fov, w, h);
      drawSkyBackdrop(ctx, w, h, sun);
    } else {
      const eye = O.vmul(O.sunDirection(state.camPitch, state.camYaw), state.camDist);
      const target = O.vmul(anti, 0.33);
      cam = makeCamera(eye, O.vnorm(O.vsub(target, eye)), 42, w, h);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#070a12');
      g.addColorStop(1, '#0c1020');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    if (state.show.ground) drawGround(ctx, gh, w, h);
    if (state.show.horizon) drawHorizon(ctx, dip);
    if (state.show.sky && state.view === 'orbit') drawSphereGuides(ctx);

    if (state.show.renderedBow) drawRenderedBow(ctx, anti, dip);
    drawBowCircles(ctx, anti, dip);
    if (state.show.alexander) drawAlexander(ctx, anti, dip);
    if (state.show.cone) drawCone(ctx, anti);

    drawSunAndAntisolar(ctx, sun, anti, w, h);
    if (state.view === 'orbit') drawObserver(ctx);
    drawReadout(ctx, w, h, dip);
  }

  /* ------------------------------------------------------------ elements */

  function visibleDir(d, dip) {
    if (state.show.rainBelow) return true;
    if (!state.show.horizon && !state.show.ground) return true;
    return Math.asin(O.clamp(d.y, -1, 1)) * O.DEG > -dip;
  }

  function drawSkyBackdrop(ctx, w, h, sun) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0a1730');
    g.addColorStop(0.55, '#12294d');
    g.addColorStop(1, '#1d3a63');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawGround(ctx, gh, w, h) {
    const y0 = -gh;
    const isEye = state.view === 'eye';
    if (isEye) {
      // fill everything below the projected horizon line
      const horizonY = horizonScreenY();
      if (horizonY !== null && horizonY < h) {
        const g = ctx.createLinearGradient(0, horizonY, 0, h);
        g.addColorStop(0, 'rgba(26,42,32,0.98)');
        g.addColorStop(1, 'rgba(8,14,11,1)');
        ctx.fillStyle = g;
        ctx.fillRect(0, Math.max(0, horizonY), w, h - Math.max(0, horizonY));
      }
    }
    const col = state.show.rainBelow ? 'rgba(120,170,140,0.16)' : 'rgba(120,170,140,0.3)';
    for (let r = 0.5; r <= 6.001; r += 0.5) {
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pts.push(O.vec(Math.cos(a) * r, y0, Math.sin(a) * r));
      }
      for (const run of clipPolyline(cam, pts)) strokePath(ctx, run, col, r % 2 === 0 ? 0.9 : 0.5);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const pts = [
        O.vec(0, y0, 0),
        O.vec(Math.cos(a) * 6, y0, Math.sin(a) * 6),
      ];
      for (const run of clipPolyline(cam, pts)) strokePath(ctx, run, col, 0.5);
    }
  }

  function horizonScreenY() {
    // the horizon in eye view: direction with elevation -dip, straight ahead
    const az = state.sunAzimuth + 180 + state.eyeAzimuth;
    const d = O.sunDirection(-O.horizonDipDeg(state.observerHeight), az);
    const p = cam.project(O.vmul(d, 50));
    return cam.depth(O.vmul(d, 50)) > NEAR ? p.y : null;
  }

  function drawHorizon(ctx, dip) {
    const pts = [];
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      const el = -dip * O.RAD;
      pts.push(O.vec(Math.cos(el) * Math.cos(a), Math.sin(el), Math.cos(el) * Math.sin(a)));
    }
    for (const run of clipPolyline(cam, pts)) {
      strokePath(ctx, run, 'rgba(150,200,170,0.55)', 1.3, [7, 4]);
    }
  }

  function drawSphereGuides(ctx) {
    for (const el of [30, 60]) {
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const e = el * O.RAD;
        pts.push(O.vec(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)));
      }
      for (const run of clipPolyline(cam, pts)) {
        strokePath(ctx, run, 'rgba(120,150,200,0.13)', 0.8);
      }
    }
  }

  function drawCone(ctx, anti) {
    const idx = indexModel();
    const orders = [];
    if (state.show.primary) orders.push(1);
    if (state.show.secondary) orders.push(2);
    if (state.show.higher) orders.push(3);
    for (const k of orders) {
      const geo = O.rainbowGeometry(idx(state.wavelength === 'white' ? 650 : state.wavelength), k);
      if (!geo) continue;
      const col = k === 1 ? 'rgba(111,211,164,0.5)' : k === 2 ? 'rgba(155,140,240,0.45)' : 'rgba(240,136,93,0.35)';
      const dash = k === 1 ? null : k === 2 ? [6, 4] : [2, 4];
      const circle = O.rainbowCircle(anti, geo.antisolarDeg, 128);
      for (let i = 0; i < circle.length - 1; i += 8) {
        const seg = [O.vec(0, 0, 0), circle[i]];
        for (const run of clipPolyline(cam, seg)) strokePath(ctx, run, col, 0.7, dash);
      }
      for (const run of clipPolyline(cam, circle)) strokePath(ctx, run, col, 1.1, dash);
      // the cone axis
      for (const run of clipPolyline(cam, [O.vec(0, 0, 0), O.vmul(anti, 1.15)])) {
        strokePath(ctx, run, 'rgba(160,180,220,0.5)', 1, [4, 4]);
      }
    }
  }

  function drawBowCircles(ctx, anti, dip) {
    const idx = indexModel();
    const orders = [];
    if (state.show.primary) orders.push(1);
    if (state.show.secondary) orders.push(2);
    if (state.show.higher) orders.push(3);
    const lambdas =
      state.wavelength === 'white' ? O.NAMED_COLORS.map((c) => c.lambda) : [state.wavelength];

    for (const k of orders) {
      for (const lam of lambdas) {
        const geo = O.rainbowGeometry(idx(lam), k);
        if (!geo) continue;
        const circle = O.rainbowCircle(anti, geo.antisolarDeg, 220);
        // split into runs of visible directions, so the horizon does the cutting
        let run = [];
        const runs = [];
        for (const d of circle) {
          if (visibleDir(d, dip)) run.push(d);
          else {
            if (run.length > 1) runs.push(run);
            run = [];
          }
        }
        if (run.length > 1) runs.push(run);
        for (const r of runs) {
          for (const seg of clipPolyline(cam, r)) {
            strokePath(ctx, seg, colorFor(lam, k === 1 ? 0.95 : 0.7), k === 1 ? 2 : 1.4);
          }
        }
      }
    }

    if (state.show.wavelengthLabels && orders.length) {
      for (const k of orders) {
        const lam = lambdas[0];
        const geo = O.rainbowGeometry(idx(lam), k);
        if (!geo) continue;
        const top = topOfBow(anti, geo.antisolarDeg);
        if (top && cam.depth(top) > NEAR) {
          const p = cam.project(top);
          label(ctx, `k=${k} · φ=${deg(geo.antisolarDeg, 2)}`, p.x, p.y - 14, {
            align: 'center', color: colorFor(lam),
          });
        }
      }
    }
  }

  function topOfBow(anti, phiDeg) {
    let best = null;
    for (const d of O.rainbowCircle(anti, phiDeg, 128)) {
      if (!best || d.y > best.y) best = d;
    }
    return best;
  }

  function drawAlexander(ctx, anti, dip) {
    if (!state.show.primary || !state.show.secondary) return;
    const band = O.alexandersBand(indexModel());
    if (!(band.outerDeg > band.innerDeg)) return;
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const phi = band.innerDeg + ((band.outerDeg - band.innerDeg) * i) / steps;
      const circle = O.rainbowCircle(anti, phi, 160).filter((d) => visibleDir(d, dip));
      if (circle.length < 2) continue;
      for (const seg of clipPolyline(cam, circle)) {
        strokePath(ctx, seg, 'rgba(0,0,0,0.22)', 6);
      }
    }
  }

  function drawRenderedBow(ctx, anti, dip) {
    const prof = bowProfile();
    if (!prof) return;
    const maxR = prof.maxRadiance || 1;
    for (let i = 0; i < prof.bins; i++) {
      const c = prof.rgb[i];
      const m = Math.max(c.r, c.g, c.b) / maxR;
      if (m < 0.012) continue;
      const gain = Math.pow(m, 0.55);
      const col = `rgba(${Math.round((255 * c.r) / Math.max(c.r, c.g, c.b, 1e-9))},${Math.round(
        (255 * c.g) / Math.max(c.r, c.g, c.b, 1e-9)
      )},${Math.round((255 * c.b) / Math.max(c.r, c.g, c.b, 1e-9))},${(gain * 0.85).toFixed(3)})`;
      const circle = O.rainbowCircle(anti, prof.phi[i], 150);
      let run = [];
      const runs = [];
      for (const d of circle) {
        if (visibleDir(d, dip)) run.push(d);
        else {
          if (run.length > 1) runs.push(run);
          run = [];
        }
      }
      if (run.length > 1) runs.push(run);
      for (const r of runs) {
        for (const seg of clipPolyline(cam, r)) strokePath(ctx, seg, col, 3.2);
      }
    }
  }

  function drawSunAndAntisolar(ctx, sun, anti, w, h) {
    const sp = O.vmul(sun, 1.25);
    if (cam.depth(sp) > NEAR) {
      const p = cam.project(sp);
      const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 26);
      g.addColorStop(0, 'rgba(255,240,190,0.95)');
      g.addColorStop(1, 'rgba(255,215,110,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff2c4';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      if (state.show.labels) {
        label(ctx, `${t('sunLabel')} · ${deg(state.sunElevation, 0)}`, p.x, p.y - 30, {
          align: 'center', color: '#ffe9a8',
        });
      }
    }
    if (state.show.antisolar) {
      const ap = O.vmul(anti, 1.0);
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
          label(ctx, t('antisolarLabelLong'), p.x, p.y + 24, { align: 'center', color: '#8fd7ff' });
        }
      }
    }
  }

  function drawObserver(ctx) {
    const p = cam.project(O.vec(0, 0, 0));
    if (cam.depth(O.vec(0, 0, 0)) <= NEAR) return;
    ctx.fillStyle = '#e8eefc';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    if (state.show.labels) {
      label(ctx, `${t('observerLabel')} · ${num(state.observerHeight, state.observerHeight < 10 ? 1 : 0)} ${t('metres')}`,
        p.x, p.y + 18, { align: 'center', color: '#e8eefc' });
    }
  }

  function drawReadout(ctx, w, h, dip) {
    const idx = indexModel();
    const geo = O.rainbowGeometry(idx(650), 1);
    const vis = O.visibleFraction(state.sunElevation, geo.antisolarDeg, dip);
    let y = 16;
    const put = (s, color) => {
      label(ctx, s, 12, y, { color });
      y += 19;
    };
    put(`${t('coneAngle')} (k=1): ${deg(geo.antisolarDeg, 2)} — ${t('derivedFromSim')}`, '#6fd3a4');
    if (state.show.secondary) {
      put(`${t('coneAngle')} (k=2): ${deg(O.rainbowGeometry(idx(650), 2).antisolarDeg, 2)}`, '#9b8cf0');
    }
    put(`${t('bowTopElevation')}: ${deg(vis.topElevationDeg, 1)}`, '#cfe0ff');
    put(`${t('visibleAbove')}: ${num(vis.fraction * 100, 0)} %`, '#cfe0ff');
    put(`${t('horizonDip')}: ${deg(dip, 3)}`, '#8ea3c6');
    if (vis.fraction <= 0) {
      label(ctx, t('bowBelowHorizon'), 12, y + 4, { color: '#ff9a8a' });
    }
  }

  /* --------------------------------------------------------- interaction */

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY };
    if (state.view === 'orbit') {
      set({
        camYaw: state.camYaw + dx * 0.4,
        camPitch: O.clamp(state.camPitch + dy * 0.3, -85, 85),
      });
    } else {
      set({
        eyeAzimuth: state.eyeAzimuth - dx * 0.15,
        eyeElevation: O.clamp(state.eyeElevation + dy * 0.12, -60, 85),
      });
    }
  });
  const stop = () => {
    drag = null;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (state.view === 'orbit') {
        set({ camDist: O.clamp(state.camDist * (1 + Math.sign(e.deltaY) * 0.08), 1.2, 9) });
      } else {
        set({ fov: O.clamp(state.fov + Math.sign(e.deltaY) * 3, 25, 120) });
      }
    },
    { passive: false }
  );
  canvas.style.cursor = 'grab';

  return { draw, tick: () => false, reset: () => { profileCache = { key: '', profile: null }; } };
}
