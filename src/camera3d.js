/**
 * camera3d.js -- the small hand-written perspective camera the two 3-D scenes
 * share.
 *
 * Extracted from skyView when the droplet-field scene arrived: two views that
 * project the same world with two copies of the same projection is exactly how
 * they end up disagreeing about where a direction is on screen, and both of
 * them draw the same bow.
 *
 * The observer sits at the origin and every direction is a unit vector, so the
 * "sky" is the unit sphere. No dependencies beyond optics.
 */
import * as O from './optics.js';

/** Camera-space depth below which a point is behind the lens. */
export const NEAR = 0.02;

/**
 * How far away the Sun is staged, in world units.
 *
 * Far enough that the parallax between the observer and a droplet on the bow
 * is under a degree, which is what makes a ray drawn parallel to the sunlight
 * actually point at the Sun on screen. Shared, because both 3-D scenes draw
 * the same sunlight axis and they must not disagree about where it goes.
 */
export const SUN_FAR = 40;

/**
 * How far the pointer may travel between press and release and still be a
 * click rather than a drag, in screen pixels.
 *
 * Measured as displacement from the press point, never as the length of the
 * path taken: a physical mouse emits several one-pixel moves during any
 * ordinary click, and summing them made picking essentially impossible on
 * real hardware while passing a synthetic test that emitted no moves at all.
 */
export const CLICK_SLOP = 6;

export function makeCamera(eye, forward, fovDeg, w, h) {
  const zA = O.vnorm(O.vneg(forward));
  let upHint = O.vec(0, 1, 0);
  if (Math.abs(O.vdot(zA, upHint)) > 0.999) upHint = O.vec(0, 0, 1);
  const xA = O.vnorm(O.vcross(upHint, zA));
  const yA = O.vcross(zA, xA);
  const f = 1 / Math.tan((fovDeg * O.RAD) / 2);
  const scale = (h / 2) * f;
  return {
    eye,
    scale,
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
export function clipPolyline(cam, pts) {
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

/** Pull a screen point back onto the canvas, along the line from its centre. */
export function clampToCanvas(p, w, h, margin) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = p.x - cx;
  const dy = p.y - cy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: cx, y: cy };
  let t = len;
  if (Math.abs(dx) > 1e-9) t = Math.min(t, ((w / 2 - margin) * len) / Math.abs(dx));
  if (Math.abs(dy) > 1e-9) t = Math.min(t, ((h / 2 - margin) * len) / Math.abs(dy));
  return { x: cx + (dx / len) * t, y: cy + (dy / len) * t };
}
