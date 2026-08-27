/**
 * beam3d.js -- one droplet's worth of light, drawn in three dimensions.
 *
 * Shared by both 3-D scenes: the sky view traces the beam behind a point on a
 * bow, the droplet-field view traces the beam through a droplet the reader
 * clicked. It is the same picture and the same physics, and two copies of it
 * would be two chances to disagree about where order k sends its light.
 *
 * Every direction here comes from the engine: `directionAtAngle()` fed with
 * `rainbowGeometry()`'s own scattering angle. The ray that lands in the eye
 * lands there because the numbers put it there, not because it was drawn to.
 */
import * as O from './optics.js';
import { state } from './state.js';
import { t, deg } from './i18n.js';
import { strokePath, label, arrowHead } from './ui.js';
import { NEAR, SUN_FAR, clipPolyline } from './camera3d.js';
import { colorFor, DROP_ORDERS } from './rays.js';

/** How far past the observer a missing order runs, in world units. */
const OUT_LEN = 1.55;
/** Where along that ray its caption sits. */
const OUT_LABEL_AT = 0.95;
/** Where the incoming ray's arrow and caption sit, in world units. */
const SUN_LABEL_AT = 0.5;
const ARC_DROP = 0.2;
const ARC_EYE = 0.36;

const BEAM_FONT = '10px "IBM Plex Mono", ui-monospace, monospace';

/** Reflection order -> chrome colour, the convention both scenes use. */
const ORDER_COLOR = {
  1: 'rgba(111,211,164,0.75)',
  2: 'rgba(155,140,240,0.75)',
  3: 'rgba(240,136,93,0.7)',
};

/** A caption clamped onto the canvas -- projected labels land anywhere. */
function capLabel(ctx, text, x, y, w, h, color) {
  ctx.save();
  ctx.font = BEAM_FONT;
  const half = ctx.measureText(text).width / 2 + 6;
  ctx.restore();
  label(ctx, text, O.clamp(x, half + 2, Math.max(half + 2, w - half - 2)),
    O.clamp(y, 10, Math.max(10, h - 10)), { align: 'center', color, font: BEAM_FONT });
}

function line3(ctx, cam, pts, color, width, dash) {
  for (const run of clipPolyline(cam, pts)) strokePath(ctx, run, color, width, dash);
}

/**
 * An arc swept by walking the ANGLE through the generator that produced the
 * direction, so the curve drawn is literally the locus of the angle named on
 * it -- rather than a circle placed where the angle looks about right.
 */
function arc3(ctx, cam, size, at, gen, angleDeg, radius, color, text) {
  const pts = [];
  for (let i = 0; i <= 24; i++) pts.push(O.vadd(at, O.vmul(gen((angleDeg * i) / 24), radius)));
  line3(ctx, cam, pts, color, 1);
  const mid = O.vadd(at, O.vmul(gen(angleDeg / 2), radius * 1.12));
  if (text && cam.depth(mid) > NEAR) {
    const p = cam.project(mid);
    capLabel(ctx, text, p.x, p.y, size.w, size.h, color);
  }
}

/**
 * Trace the sunlight through one droplet at world position `P`.
 *
 * `lambda`/`k` name the order that actually reaches the eye, or are null when
 * none does -- a droplet that delivers nothing is still worth taking apart,
 * because seeing where its light goes instead is the whole reason the bow has
 * an angle at all.
 *
 * The other orders are drawn from the SAME droplet, running past the observer
 * rather than stopping short, so the gap between such a ray and the eye is
 * the miss angle drawn to scale.
 */
export function drawDropletBeam(ctx, cam, size, opts) {
  const { P, anti, sun, lambda, k, idx } = opts;
  const { w, h } = size;
  const dist = O.vlen(P);
  if (dist < 1e-9) return;
  const dir = O.vmul(P, 1 / dist);
  const toEye = O.vneg(dir);
  const phi = O.vangle(dir, anti) * O.DEG;
  const refLambda = lambda === null || lambda === undefined ? 650 : lambda;

  // sunlight in, the whole way back: perspective converges parallel lines on
  // a vanishing point, so a stub leaves at a bearing that fights the axis
  line3(ctx, cam, [O.vadd(P, O.vmul(sun, SUN_FAR)), P], 'rgba(255,242,196,0.9)', 1.6);
  const nearSun = O.vadd(P, O.vmul(sun, SUN_LABEL_AT));
  if (cam.depth(nearSun) > NEAR && cam.depth(P) > NEAR) {
    const a = cam.project(nearSun);
    arrowHead(ctx, a, cam.project(P), 'rgba(255,242,196,0.95)', 7);
    if (state.show.labels) capLabel(ctx, t('dropIncoming'), a.x, a.y - 14, w, h, '#ffe9a8');
  }

  for (const order of DROP_ORDERS) {
    const geo = O.rainbowGeometry(idx(refLambda), order);
    if (!geo) continue;
    const out = O.directionAtAngle(anti, toEye, geo.scatteringDeg);
    const reaches = order === k;
    const end = reaches ? O.vec(0, 0, 0) : O.vadd(P, O.vmul(out, OUT_LEN));
    line3(ctx, cam, [P, end],
      reaches ? colorFor(refLambda, 0.95) : ORDER_COLOR[order] || ORDER_COLOR[3],
      reaches ? 2.2 : 1.1, reaches ? null : [4, 4]);
    if (state.show.labels && !reaches) {
      const at = O.vadd(P, O.vmul(out, OUT_LEN * OUT_LABEL_AT));
      if (cam.depth(at) > NEAR) {
        const p = cam.project(at);
        capLabel(ctx, `k=${order} · φ ${deg(geo.antisolarDeg, 1)}`, p.x, p.y, w, h,
          ORDER_COLOR[order] || ORDER_COLOR[3]);
      }
    }
  }

  // Theta at the droplet, phi at the eye -- each at the vertex where it is
  // actually measured, the same split the many-droplets inspector uses.
  if (state.show.angles) {
    arc3(ctx, cam, size, P, (a) => O.directionAtAngle(anti, toEye, a), 180 - phi, ARC_DROP,
      'rgba(224,168,63,0.85)', `Θ ${deg(180 - phi, 1)}`);
    // phi is drawn at the eye -- but in the eye view the camera IS the eye,
    // and an arc a third of a unit from the lens projects across the whole
    // canvas as a line rather than an angle. Nobody sees an angle drawn at
    // their own pupil; from outside it is the clearest thing in the picture.
    // In the eye view phi is already on screen as the angular distance from
    // the marked antisolar point, which is what the reader is looking at.
    if (state.view !== 'eye') {
      arc3(ctx, cam, size, O.vec(0, 0, 0), (a) => O.directionAtAngle(anti, dir, a), phi, ARC_EYE,
        k ? 'rgba(224,168,63,0.95)' : 'rgba(143,164,200,0.85)', `φ ${deg(phi, 1)}`);
    }
  }

  if (cam.depth(P) > NEAR) {
    const p = cam.project(P);
    const ring = k ? colorFor(refLambda, 0.9) : 'rgba(207,169,232,0.9)';
    ctx.save();
    ctx.fillStyle = k ? colorFor(refLambda, 0.95) : 'rgba(207,169,232,0.95)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ring;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (state.show.labels) {
      const cap = k
        ? `k=${k} · ${Math.round(refLambda)} ${t('nm')}`
        : t('dropMisses', { angle: deg(phi, 1) });
      capLabel(ctx, cap, p.x, p.y - 20, w, h, k ? colorFor(refLambda) : '#cfa9e8');
    }
  }
}
