/**
 * rays.js -- turns the current control state into a set of traced rays.
 *
 * Every ray in the application comes from here, so the 2-D scene, the graph
 * and the readout panel can never disagree about what is being shown.
 */
import * as O from './optics.js';
import { state, activeLambdas, activeOrders, indexModel } from './state.js';

/** A demonstrably off-caustic impact parameter for the "ordinary ray" case. */
export const NON_CAUSTIC_B = 0.35;

/**
 * Trace one ray with the canonical geometry: beam along +x, droplet at
 * origin. `rayLength` (droplet radii) sets how far the incident and exit
 * segments are drawn on each side -- 6 by default, matching the original
 * close-up framing; buildRays() scales it up with state.dropletZoom so a
 * zoomed-out view has correspondingly longer rays to draw a visible fan.
 */
export function traceOne(lambda, n, k, b, radius = 1, rayLength = 6 * radius) {
  const path = O.traceRay({
    origin: O.vec(-rayLength, b * radius, 0),
    dir: O.vec(1, 0, 0),
    center: O.vec(0, 0, 0),
    radius,
    n,
    reflections: k,
    exitLength: rayLength,
  });
  return {
    lambda,
    n,
    k,
    b,
    path,
    classification: path.classification,
    color: O.rgbCss(lambda),
  };
}

/**
 * The full set of rays implied by the current state.
 * role:
 *   'main'   the ray the user is steering
 *   'fan'    the surrounding fan that shows the caustic piling up
 *   'demo0'  Case 1 from the brief: zero internal reflections
 *   'demoNC' Case 2: one internal reflection at a non-rainbow impact parameter
 */
export function buildRays() {
  const idx = indexModel();
  const lambdas = activeLambdas();
  const orders = activeOrders();
  const rayLength = 6 * Math.max(1, state.dropletZoom);
  const out = [];

  for (const k of orders) {
    for (const lambda of lambdas) {
      const n = idx(lambda);
      const r = traceOne(lambda, n, k, state.impact, 1, rayLength);
      r.role = 'main';
      out.push(r);

      if (state.fanCount > 0) {
        for (let i = 0; i < state.fanCount; i++) {
          const b = (i + 0.5) / state.fanCount;
          if (Math.abs(b - state.impact) < 1e-6) continue;
          const f = traceOne(lambda, n, k, b, 1, rayLength);
          f.role = 'fan';
          out.push(f);
        }
      }
    }
  }

  if (state.showNonRainbow) {
    const lambda = lambdas.includes(650) ? 650 : lambdas[0];
    const n = idx(lambda);
    if (!orders.includes(0)) {
      const r0 = traceOne(lambda, n, 0, state.impact, 1, rayLength);
      r0.role = 'demo0';
      r0.noteKey = 'explNoReflection';
      out.push(r0);
    }
    const rn = traceOne(lambda, n, 1, NON_CAUSTIC_B, 1, rayLength);
    rn.role = 'demoNC';
    rn.noteKey = 'explNonCaustic';
    out.push(rn);
  }

  return out;
}

/** How far (in degrees) this ray sits from the extremum of its own family. */
export function distanceFromExtremum(ray) {
  if (ray.k < 1 || ray.path.antisolar === null) return null;
  const geo = O.rainbowGeometry(ray.n, ray.k);
  if (!geo) return null;
  return ray.path.antisolar * O.DEG - geo.antisolarDeg;
}

/**
 * Display colour for a wavelength.
 *
 * With white light selected and dispersion turned down, the six sampled
 * wavelengths all take the same path, so they are drawn white and overlap into
 * a single beam. As dispersion rises they separate AND gain their colour --
 * which is the honest visual statement that the colours of a rainbow exist
 * only because n depends on wavelength.
 */
export function colorFor(lambda, alpha = 1) {
  const c = O.wavelengthToRGB(lambda);
  let { r, g, b } = c;
  if (state.wavelength === 'white') {
    const m = Math.min(1, state.dispersion * 2.5);
    r = Math.round(r * m + 255 * (1 - m));
    g = Math.round(g * m + 255 * (1 - m));
    b = Math.round(b * m + 255 * (1 - m));
  }
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** Named colour id for a wavelength, if it is one of the six. */
export function colorIdFor(lambda) {
  const c = O.NAMED_COLORS.find((x) => x.lambda === lambda);
  return c ? c.id : null;
}
