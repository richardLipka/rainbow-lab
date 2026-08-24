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
export function colorFor(lambda, alpha = 1, greyMix = 0) {
  const c = O.wavelengthToRGB(lambda);
  let { r, g, b } = c;
  if (state.wavelength === 'white') {
    const m = Math.min(1, state.dispersion * 2.5);
    r = Math.round(r * m + 255 * (1 - m));
    g = Math.round(g * m + 255 * (1 - m));
    b = Math.round(b * m + 255 * (1 - m));
  }
  // Blend towards the neutral chrome grey. Used for rays that do not reach
  // the observer, so "this one misses" reads from hue -- the same grey the
  // many-droplets view uses for droplets that miss -- rather than from a
  // difference in opacity alone, which disappears at thin line widths.
  if (greyMix > 0) {
    const k = Math.min(1, greyMix);
    r = Math.round(r * (1 - k) + 0x93 * k);
    g = Math.round(g * (1 - k) + 0xa3 * k);
    b = Math.round(b * (1 - k) + 0xbd * k);
  }
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** Named colour id for a wavelength, if it is one of the six. */
export function colorIdFor(lambda) {
  const c = O.NAMED_COLORS.find((x) => x.lambda === lambda);
  return c ? c.id : null;
}

/* ----------------------------------------------------- bow geometry -- */

/**
 * How close (in degrees) a droplet's seen angle has to be to a bow angle for
 * that droplet to count as delivering that colour.
 *
 * Deliberately tighter than CAUSTIC_TOLERANCE_DEG: that one asks "is this ray
 * part of the bright family", which is a property of the ray. This one asks
 * "does this droplet land on the bow *this observer* sees", which is a
 * property of a direction, and at 1.5 deg the two bows would smear into one
 * another instead of resolving into coloured bands.
 */
export const BOW_MATCH_DEG = 0.45;

/**
 * The bow of order k, as one antisolar angle per named colour.
 *
 * Shared by the many-droplets field and the per-droplet readout so the
 * picture and the numbers cannot disagree about which droplet is lit.
 */
export function bowBand(idx, k) {
  const angles = [];
  for (const c of O.NAMED_COLORS) {
    const geo = O.rainbowGeometry(idx(c.lambda), k);
    if (geo) angles.push({ lambda: c.lambda, phi: geo.antisolarDeg, geo });
  }
  if (!angles.length) return null;
  const phis = angles.map((a) => a.phi);
  return { k, angles, lo: Math.min(...phis), hi: Math.max(...phis) };
}

/** bowBand() for several orders at once, dropping any that has no extremum. */
export function bowBands(idx, orders) {
  return orders.map((k) => bowBand(idx, k)).filter(Boolean);
}

/** Which wavelength (if any) does a droplet seen at antisolar angle phi deliver? */
export function colorAtPhi(phi, bands, tolDeg = BOW_MATCH_DEG) {
  let best = null;
  for (const band of bands) {
    for (const a of band.angles) {
      const d = Math.abs(a.phi - phi);
      if (d < tolDeg && (!best || d < best.d)) best = { d, lambda: a.lambda, k: band.k };
    }
  }
  return best;
}

/**
 * The antisolar direction in the many-droplets cross-section: +x away from
 * the Sun, +y up. This is also the direction the incoming sunlight travels
 * in, which is why the same vector serves as the reference for every angle
 * in that scene.
 */
export function antisolarAxis() {
  const a = state.sunElevation * O.RAD;
  return { x: Math.cos(a), y: -Math.sin(a) };
}

/**
 * The reflection orders a clicked droplet is inspected at.
 *
 * Fixed, and deliberately not tied to the show.primary/show.secondary
 * toggles: those say which bows the FIELD should highlight, while an
 * inspection answers "what does this one droplet do with the sunlight",
 * whose honest answer includes the orders nobody ever sees. k=3 is the
 * interesting one -- its light leaves at phi ~ 137 deg, i.e. about 42 deg
 * from the SUN, forward into the rain and away from the observer, which is
 * why looking at the sky opposite the Sun never finds a third bow. The
 * engine already knows that; drawing it costs less than asserting it.
 */
export const DROP_ORDERS = [1, 2, 3];

/**
 * Everything the many-droplets scene knows about ONE droplet: the angle the
 * observer sees it at, and, per reflection order, where that droplet
 * actually sends its concentrated light and by how much that misses the eye.
 *
 * Lives here rather than in either consumer because both the drawing and the
 * readout need it, and two copies of "the angle from the antisolar
 * direction" is exactly how a diagram ends up disagreeing with its own
 * caption.
 */
export function dropReport(drop, orders = DROP_ORDERS) {
  const idx = indexModel();
  const anti = antisolarAxis();
  const rel = { x: drop.x - state.dropsObserverX, y: drop.y - state.dropsObserverY };
  const distance = Math.hypot(rel.x, rel.y);
  if (distance < 1e-9) return { anti, distance, dir: null, phiSeen: null, bands: [], hit: null };

  const dir = { x: rel.x / distance, y: rel.y / distance };
  const phiSeen = Math.acos(O.clamp(dir.x * anti.x + dir.y * anti.y, -1, 1)) * O.DEG;

  const bands = bowBands(idx, orders).map((band) => {
    let nearest = band.angles[0];
    for (const a of band.angles) {
      if (Math.abs(a.phi - phiSeen) < Math.abs(nearest.phi - phiSeen)) nearest = a;
    }
    const delta = phiSeen - nearest.phi;
    return { ...band, nearest, delta, reaches: Math.abs(delta) <= BOW_MATCH_DEG };
  });

  const reaching = bands.filter((b) => b.reaches);
  reaching.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
  return { anti, distance, dir, phiSeen, bands, hit: reaching[0] || null };
}
