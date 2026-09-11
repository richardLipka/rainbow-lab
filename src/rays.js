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

/**
 * Which side of the axis order k's concentrated light leaves on, for a ray
 * entering the upper half of the droplet.
 *
 * The exit side flips with every internal reflection -- k=1 leaves below the
 * axis, k=2 above -- and from a single entry point the primary and the
 * secondary are on opposite sides at EVERY impact parameter, never once the
 * same. That is measured, not assumed, and it is the reason the two eyes in
 * this scene end up on opposite sides of the picture.
 *
 * Entering the other half was tried as a way to bring them together, and it
 * worked, at the cost of the thing the scene is for: two rays then hit the
 * droplet, and one ray splitting into every order -- the actual cause of the
 * secondary bow -- could no longer be seen. The angles are read at each eye
 * instead, both from the antisolar axis, so 42.4 and 50.4 are compared
 * against one reference rather than against each other.
 */
export function bowExitSide(n, k) {
  const geo = O.rainbowGeometry(n, k);
  if (!geo) return 1;
  const canonical = traceOne(650, n, k, geo.impactParameter);
  if (!canonical.path.dirOut) return 1;
  return canonical.path.dirOut.y > 0 ? 1 : -1;
}

/**
 * How many leading segments order k shares with the lowest order on screen.
 *
 * `traceRay` emits one incident segment, k+1 internal ones and one exit, so
 * order k and order m (m < k) run together for the incident segment plus the
 * first m+1 internals: they are the same light until the wall where the lower
 * order refracted out and the higher one carried on. Drawing that prefix once
 * instead of once per order is what makes the split visible -- overdrawn, the
 * shared trunk just looks like several rays that happen to overlap.
 */
export function sharedPrefix(k, lowest) {
  if (lowest >= k) return 0;
  return lowest + 2;
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
/**
 * Memo for colorFor().
 *
 * The droplet scene strokes each ray segment by segment, so a 60-ray fan over
 * four orders and six wavelengths asks for a colour about seven thousand
 * times a frame -- and every call ran the piecewise spectrum fit and a
 * Math.pow for gamma before building a string. Measured: 50 ms of a 62 ms
 * frame was drawing, and this was most of it.
 *
 * Keyed on everything the function reads, state included, so a change to the
 * wavelength mode or the dispersion cannot serve a stale colour. Bounded
 * because the droplet field inverts angles to continuous wavelengths and
 * would otherwise grow one entry per droplet.
 */
const COLOR_MEMO = new Map();
const COLOR_MEMO_MAX = 8192;

export function colorFor(lambda, alpha = 1, greyMix = 0) {
  const white = state.wavelength === 'white';
  const key = `${lambda}|${alpha}|${greyMix}|${white ? state.dispersion : 'x'}`;
  const memo = COLOR_MEMO.get(key);
  if (memo !== undefined) return memo;
  const out = computeColorFor(lambda, alpha, greyMix, white);
  if (COLOR_MEMO.size >= COLOR_MEMO_MAX) COLOR_MEMO.clear();
  COLOR_MEMO.set(key, out);
  return out;
}

function computeColorFor(lambda, alpha, greyMix, white) {
  const c = O.wavelengthToRGB(lambda);
  let { r, g, b } = c;
  if (white) {
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

/**
 * The named colour a continuous wavelength is closest to.
 *
 * The droplet field inverts an angle straight back to a wavelength, so its
 * answers land anywhere in 400-680 nm and `colorIdFor()` returns null for
 * almost all of them. Naming the nearest colour lets that scene say "564 nm,
 * green" where the flat scene says "green", instead of the two readouts
 * describing the same droplet in two different vocabularies.
 */
export function nearestColorId(lambda) {
  let best = null;
  for (const c of O.NAMED_COLORS) {
    const d = Math.abs(c.lambda - lambda);
    if (best === null || d < best.d) best = { d, id: c.id };
  }
  return best ? best.id : null;
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

/**
 * The bow of order k as a continuous spectrum, invertible.
 *
 * `lambdaAt(phi)` answers "which wavelength has ITS caustic exactly here",
 * which is the question a droplet in space actually poses: it sits at some
 * antisolar angle, and either some wavelength's bow passes through that angle
 * or none does. Answering it by snapping to the six named colours puts six
 * discrete rings in the sky where there is one continuous band -- the same
 * artefact the sky view had to be fixed for.
 *
 * phi(lambda) is monotonic for a fixed k (increasing for k=1, decreasing for
 * k=2), so a table sampled uniformly in lambda inverts by a single scan.
 */
export function bowSpectrum(idx, k, samples = 96) {
  const pts = [];
  for (let i = 0; i < samples; i++) {
    const lambda = 400 + (280 * i) / (samples - 1);
    const geo = O.rainbowGeometry(idx(lambda), k);
    if (geo) pts.push({ lambda, phi: geo.antisolarDeg });
  }
  if (pts.length < 2) return null;
  const first = pts[0].phi;
  const last = pts[pts.length - 1].phi;
  const lo = Math.min(first, last);
  const hi = Math.max(first, last);
  return {
    k,
    lo,
    hi,
    /**
      * The wavelength whose order-k bow sits at this angle, or null.
      *
      * The band is widened by BOW_MATCH_DEG at each end and the angle is
      * clamped back into it before inverting, because a caustic is not
      * infinitely sharp -- it is the same finite half-width the flat scene
      * matches droplets with. Without it the band's width is exactly the
      * dispersion, so at dispersion 0 it collapses to a single angle that no
      * finite set of droplets can ever land on, and the bow vanishes
      * entirely. That shipped: the app opens on a tutorial step that sets
      * dispersion to 0, so the scene was empty on arrival.
      */
     lambdaAt(phi) {
      if (phi < lo - BOW_MATCH_DEG || phi > hi + BOW_MATCH_DEG) return null;
      if (hi - lo < 1e-9) return pts[Math.floor(pts.length / 2)].lambda;
      phi = Math.min(hi, Math.max(lo, phi));
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if (phi >= Math.min(a.phi, b.phi) && phi <= Math.max(a.phi, b.phi)) {
          const span = b.phi - a.phi;
          const t = Math.abs(span) < 1e-12 ? 0 : (phi - a.phi) / span;
          return a.lambda + t * (b.lambda - a.lambda);
        }
      }
      return null;
    },
  };
}

/* ==========================================================================
 * Which reflection count makes which bow
 * ======================================================================== */

/** Translation key naming the bow a given reflection count produces. */
export function bowNameKey(k) {
  if (k === 1) return 'bowName1';
  if (k === 2) return 'bowName2';
  if (k === 3) return 'bowName3';
  return 'bowNameK';
}

/**
 * One row per reflection order: which bow it makes, where it lands, and how
 * much of the incoming light is left by the time it gets there.
 *
 * `relative` is the Fresnel factor measured against the primary, and it is
 * the only brightness ratio quoted anywhere in the UI -- exact, and derived
 * from one formula. The spreading loss on top of it (a wider colour band on
 * a bigger ring) is stated in words rather than as a second number, because
 * a single figure for it would depend on where you cut the band.
 *
 * `sunward` matters more than it looks: k=1 and k=2 come back towards the
 * antisolar point, k=3 goes the other way and lands next to the Sun. That is
 * why nobody has seen a tertiary bow by looking at the primary's sky.
 */
export function orderLedger(idx, orders = DROP_ORDERS, lambda = 650) {
  const n = idx(lambda);
  const rows = [];
  for (const k of orders) {
    const geo = O.rainbowGeometry(n, k);
    const light = O.bowBrightness(n, k);
    if (!geo || !light) continue;
    const band = bowBand(idx, k);
    const sunward = geo.antisolarDeg > 90;
    rows.push({
      k,
      geo,
      light,
      R: light.R,
      survives: light.survives,
      phiDeg: geo.antisolarDeg,
      seenAtDeg: sunward ? 180 - geo.antisolarDeg : geo.antisolarDeg,
      sunward,
      widthDeg: band ? Math.abs(band.hi - band.lo) : 0,
    });
  }
  const base = rows.length ? rows[0].survives : 0;
  for (const r of rows) r.relative = base > 0 ? r.survives / base : null;
  return rows;
}

/* ==========================================================================
 * The droplet-field test, in one place
 * ======================================================================== */

/**
 * The orders the field is currently painting, as the show toggles set them.
 *
 * Deliberately NOT `DROP_ORDERS`: that says which orders an inspection takes
 * apart (all three, including the one nobody can see), this says which ones
 * the scene is highlighting right now. Conflating them would make a readout
 * claim a droplet is lit while the scene draws it grey.
 */
export function shownOrders() {
  const orders = [];
  if (state.show.primary) orders.push(1);
  if (state.show.secondary) orders.push(2);
  if (state.show.higher) orders.push(3);
  return orders;
}

/**
 * "At angle phi, does any shown order deliver a wavelength?" -- the single
 * question the droplet field asks, built once and then run.
 *
 * `fieldView` builds it once per physics change and runs `at()` over sixty
 * thousand droplets; the readout builds it again for the one droplet the
 * reader clicked. Same object, same answer. A panel that disagreed with the
 * dots it is describing is exactly the failure this exists to prevent, and
 * it is the reason the test is not written out twice.
 */
export function fieldTest(idx, orders = shownOrders()) {
  const single = state.wavelength === 'white' ? null : state.wavelength;
  const spectra = single === null ? orders.map((k) => bowSpectrum(idx, k)).filter(Boolean) : [];
  const mono = [];
  if (single !== null) {
    for (const k of orders) {
      const geo = O.rainbowGeometry(idx(single), k);
      if (geo) mono.push({ k, phi: geo.antisolarDeg });
    }
  }
  return {
    orders,
    single,
    spectra,
    mono,
    /** {lambda, k} for the first shown order that answers yes, else null. */
    at(phi) {
      if (single !== null) {
        for (const m of mono) {
          if (Math.abs(phi - m.phi) <= BOW_MATCH_DEG) return { lambda: single, k: m.k };
        }
        return null;
      }
      for (const sp of spectra) {
        const lam = sp.lambdaAt(phi);
        if (lam !== null) return { lambda: lam, k: sp.k };
      }
      return null;
    },
    /**
     * How far this angle is from the nearest band it could have hit, and
     * which one. The number a droplet that missed is actually missing BY --
     * "no" is a worse answer than "no, by 0.8 degrees".
     */
    missBy(phi) {
      let best = null;
      const keep = (gap, k) => {
        if (best === null || gap < best.gap) best = { gap, k };
      };
      if (single !== null) for (const m of mono) keep(Math.abs(phi - m.phi), m.k);
      else for (const sp of spectra) keep(phi < sp.lo ? sp.lo - phi : phi > sp.hi ? phi - sp.hi : 0, sp.k);
      return best;
    },
  };
}

/**
 * Everything the 3-D field knows about ONE droplet.
 *
 * The flat scene's `dropReport()` asked the same question in two dimensions
 * with the observer at `dropsObserverX/Y`; here the observer sits at the
 * origin, so a droplet's world position IS the line of sight to it, and the
 * antisolar direction is a real 3-D vector rather than a screen axis.
 *
 * `rows` covers all of `DROP_ORDERS` rather than only the shown ones, marked
 * with `shown`, because "this angle is on the secondary bow and you have the
 * secondary switched off" is a different answer from "nothing comes out
 * here", and a reader staring at a grey droplet deserves to be told which.
 */
export function fieldReport(drop, orders = shownOrders()) {
  const idx = indexModel();
  const anti = O.antisolarDirection(state.sunElevation, state.sunAzimuth);
  const distance = O.vlen(drop);
  if (distance < 1e-9) {
    return { anti, distance, dir: null, phiSeen: null, orders, rows: [], hit: null, miss: null };
  }
  const dir = O.vmul(drop, 1 / distance);
  const phiSeen = O.vangle(dir, anti) * O.DEG;
  const test = fieldTest(idx, orders);
  const rows = DROP_ORDERS.map((k) => {
    const band = bowBand(idx, k);
    if (!band) return null;
    const ref = band.angles.find((a) => a.lambda === 650) || band.angles[0];
    // Signed distance to the band, zero inside it: a droplet sitting in the
    // band is on the bow whether or not that bow is being drawn.
    const gap = phiSeen < band.lo ? phiSeen - band.lo : phiSeen > band.hi ? phiSeen - band.hi : 0;
    return { k, band, ref, gap, shown: orders.includes(k), inBand: gap === 0 };
  }).filter(Boolean);
  const hit = test.at(phiSeen);
  const hidden = hit ? null : rows.find((r) => r.inBand && !r.shown) || null;
  return { anti, distance, dir, phiSeen, orders, rows, hit, hidden, miss: test.missBy(phiSeen) };
}
