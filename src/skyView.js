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
import { fitCanvas, strokePath, label, arrowHead, capture } from './ui.js';
import { colorFor, DROP_ORDERS } from './rays.js';

const NEAR = 0.02;

/** Where the traced droplet sits, in the unit-sphere world of this scene. */
const DROP_DIST = 1;
const SUN_LEN = 0.55;
// The orders that miss run PAST the observer rather than stopping short: the
// gap between such a ray and the eye is then the miss angle drawn to scale,
// the ray visibly sails by, and its caption lands clear of the observer's own
// label instead of on top of it.
const OUT_LEN = DROP_DIST * 1.55;
/** Where along a missing ray its caption sits. */
const OUT_LABEL_AT = 0.95;
const ARC_DROP = 0.2;
const ARC_EYE = 0.36;

/** Screen distance at which a click counts as landing on a bow. */
const PICK_PX = 13;
/** Rolls sampled around each bow when hit-testing a click: 1-degree steps. */
const PICK_STEPS = 360;

const MONO_FONT = '10px "IBM Plex Mono", ui-monospace, monospace';

/** Reflection order -> chrome colour, the same convention drawCone() uses. */
const ORDER_COLOR = {
  1: 'rgba(111,211,164,0.75)',
  2: 'rgba(155,140,240,0.75)',
  3: 'rgba(240,136,93,0.7)',
};

/** A caption clamped onto the canvas -- projected labels land anywhere. */
function capLabel(ctx, text, x, y, w, h, color) {
  ctx.save();
  ctx.font = MONO_FONT;
  const half = ctx.measureText(text).width / 2 + 6;
  ctx.restore();
  label(ctx, text, O.clamp(x, half + 2, Math.max(half + 2, w - half - 2)),
    O.clamp(y, 10, Math.max(10, h - 10)), { align: 'center', color, font: MONO_FONT });
}

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

    drawPickedBeam(ctx, anti, sun, w, h, dip);

    drawSunAndAntisolar(ctx, sun, anti, w, h);
    if (state.view === 'orbit') drawObserver(ctx);
    drawReadout(ctx, w, h, dip);
    if (state.show.labels) {
      const hintFont = '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
      label(ctx, t('skyHint'), 12, h - 30, { color: '#8ea3c6', font: hintFont });
      label(ctx, t(state.skyPick ? 'skyClearHint' : 'skyClickHint'), 12, h - 14, {
        color: '#cfa9e8', font: hintFont,
      });
    }
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

  /* ------------------------------------------------------- traced beam -- */

  /**
   * Every bow line currently on screen, as {k, lambda, phi}.
   *
   * Shared by the drawing and the click test, so a reader can only ever pick
   * a line that is actually there -- and picks exactly the one they aimed at,
   * wavelength included.
   */
  function bowLines() {
    const idx = indexModel();
    const orders = [];
    if (state.show.primary) orders.push(1);
    if (state.show.secondary) orders.push(2);
    if (state.show.higher) orders.push(3);
    const lambdas =
      state.wavelength === 'white' ? O.NAMED_COLORS.map((c) => c.lambda) : [state.wavelength];
    const out = [];
    for (const k of orders) {
      for (const lambda of lambdas) {
        const geo = O.rainbowGeometry(idx(lambda), k);
        if (geo) out.push({ k, lambda, phi: geo.antisolarDeg });
      }
    }
    return out;
  }

  /**
   * The picked point, resolved against the CURRENT engine numbers.
   *
   * state.skyPick stores a roll around the antisolar axis, not a direction,
   * so moving the Sun or changing the index model slides the pick along with
   * its bow instead of leaving it stranded in empty sky.
   */
  function resolvePick(anti) {
    const pick = state.skyPick;
    if (!pick) return null;
    const geo = O.rainbowGeometry(indexModel()(pick.lambda), pick.k);
    if (!geo) return null;
    const dir = O.bowDirection(anti, geo.antisolarDeg, pick.roll);
    return { ...pick, geo, phi: geo.antisolarDeg, dir };
  }

  /** A world polyline, drawn through the near-plane clipper. */
  function line3(ctx, pts, color, width, dash) {
    for (const run of clipPolyline(cam, pts)) strokePath(ctx, run, color, width, dash);
  }

  /** A great-circle arc from `axis` out to `angleDeg`, centred on `at`. */
  function arc3(ctx, at, gen, angleDeg, radius, color, text) {
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push(O.vadd(at, O.vmul(gen((angleDeg * i) / 24), radius)));
    line3(ctx, pts, color, 1);
    const mid = O.vadd(at, O.vmul(gen(angleDeg / 2), radius * 1.12));
    if (text && cam.depth(mid) > NEAR) {
      const p = cam.project(mid);
      label(ctx, text, p.x, p.y, { align: 'center', color, font: MONO_FONT });
    }
  }

  /**
   * One beam, traced from the Sun to the eye through a single droplet sitting
   * in the picked direction -- plus what that same droplet does with the
   * other reflection orders.
   *
   * The point of drawing the other orders is that they come from the SAME
   * droplet and leave in the wrong directions: order k concentrates its light
   * on a cone of half-angle Theta_k about the incoming sunlight, and only one
   * of those cones has an element that ends at the eye. That is why a given
   * droplet contributes to exactly one bow for a given observer, and why the
   * secondary bow you see is made of entirely different droplets from the
   * primary. Every direction here comes from directionAtAngle() fed with
   * rainbowGeometry()'s own scattering angle; the ray that lands in the eye
   * lands there because the numbers put it there (unit-tested to 1e-12).
   */
  function drawPickedBeam(ctx, anti, sun, w, h, dip) {
    const pick = resolvePick(anti);
    if (!pick) return;
    // The bow circle is cut by the horizon, so the trace has to be cut with
    // it: raising the Sun can carry a picked point below the ground, and a
    // beam still drawn to a droplet in a direction whose circle has just
    // vanished contradicts the very thing that vanishing is teaching. The
    // pick itself survives, so lowering the Sun brings it back.
    if (!visibleDir(pick.dir, dip)) return;
    const idx = indexModel();
    const P = O.vmul(pick.dir, DROP_DIST);
    const toEye = O.vneg(pick.dir);

    // sunlight in, along the one direction all of it travels
    const from = O.vadd(P, O.vmul(sun, SUN_LEN));
    line3(ctx, [from, P], 'rgba(255,242,196,0.9)', 1.6);
    if (cam.depth(from) > NEAR && cam.depth(P) > NEAR) {
      const a = cam.project(from);
      const b = cam.project(P);
      arrowHead(ctx, a, b, 'rgba(255,242,196,0.95)', 7);
      if (state.show.labels) {
        capLabel(ctx, t('dropIncoming'), a.x, a.y - 12, w, h, '#ffe9a8');
      }
    }

    // what this droplet does with each order
    for (const k of DROP_ORDERS) {
      const geo = O.rainbowGeometry(idx(pick.lambda), k);
      if (!geo) continue;
      const out = O.directionAtAngle(anti, toEye, geo.scatteringDeg);
      const reaches = k === pick.k;
      const end = reaches ? O.vec(0, 0, 0) : O.vadd(P, O.vmul(out, OUT_LEN));
      line3(ctx, [P, end], reaches ? colorFor(pick.lambda, 0.95) : ORDER_COLOR[k] || ORDER_COLOR[3],
        reaches ? 2.2 : 1.1, reaches ? null : [4, 4]);
      if (state.show.labels && !reaches) {
        const at = O.vadd(P, O.vmul(out, OUT_LEN * OUT_LABEL_AT));
        if (cam.depth(at) > NEAR) {
          const p = cam.project(at);
          capLabel(ctx, `k=${k} · φ ${deg(geo.antisolarDeg, 1)}`, p.x, p.y, w, h,
            ORDER_COLOR[k] || ORDER_COLOR[3]);
        }
      }
    }

    // Theta at the droplet, phi at the eye -- each at the vertex where it is
    // actually measured, the same split the many-droplets inspector uses.
    if (state.show.angles) {
      arc3(ctx, P, (a) => O.directionAtAngle(anti, toEye, a), 180 - pick.phi, ARC_DROP,
        'rgba(224,168,63,0.85)', `Θ ${deg(180 - pick.phi, 1)}`);
      arc3(ctx, O.vec(0, 0, 0), (a) => O.bowDirection(anti, a, pick.roll), pick.phi, ARC_EYE,
        'rgba(224,168,63,0.95)', `φ ${deg(pick.phi, 1)}`);
    }

    // the droplet itself
    if (cam.depth(P) > NEAR) {
      const p = cam.project(P);
      ctx.save();
      ctx.fillStyle = colorFor(pick.lambda, 0.95);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colorFor(pick.lambda, 0.8);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (state.show.labels) {
        capLabel(ctx, `k=${pick.k} · ${pick.lambda} ${t('nm')}`, p.x, p.y - 20, w, h,
          colorFor(pick.lambda));
      }
    }
  }

  /* --------------------------------------------------------- interaction */

  /**
   * The bow line nearest a click, or null.
   *
   * Brute force over 1-degree rolls of every drawn line: a few thousand
   * projections once per click, which is nothing, and it means the test uses
   * exactly the projection the reader was looking at rather than an inverse
   * that would have to be kept in step with the camera by hand.
   */
  function pickAt(px, py) {
    if (!cam) return null;
    const anti = O.antisolarDirection(state.sunElevation, state.sunAzimuth);
    const dip = O.horizonDipDeg(state.observerHeight);
    let best = null;
    for (const line of bowLines()) {
      for (let i = 0; i < PICK_STEPS; i++) {
        const roll = (i / PICK_STEPS) * 360;
        const d = O.bowDirection(anti, line.phi, roll);
        if (!visibleDir(d, dip) || cam.depth(d) <= NEAR) continue;
        const p = cam.project(d);
        const gap = Math.hypot(p.x - px, p.y - py);
        if (gap < PICK_PX && (!best || gap < best.gap)) {
          best = { gap, k: line.k, lambda: line.lambda, roll };
        }
      }
    }
    return best;
  }

  let drag = null;
  let travelled = 0;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY };
    travelled = 0;
    capture(canvas, e);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    travelled += Math.hypot(dx, dy);
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
  canvas.addEventListener('pointerup', (e) => {
    // Dragging is the primary gesture here, so a click only counts as a pick
    // when the pointer essentially did not move. Without the threshold every
    // orbit would end by re-selecting whatever the cursor happened to land on.
    const wasClick = drag !== null && travelled < 5;
    stop();
    if (!wasClick) return;
    const rect = canvas.getBoundingClientRect();
    const hit = pickAt(e.clientX - rect.left, e.clientY - rect.top);
    if (hit) set({ skyPick: { k: hit.k, lambda: hit.lambda, roll: hit.roll }, panel: 'ray' });
    else if (state.skyPick) set({ skyPick: null, panel: 'guide' });
  });
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
