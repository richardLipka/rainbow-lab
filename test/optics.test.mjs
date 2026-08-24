/**
 * Unit tests for the optical engine.  Run with:  node --test test/
 *
 * These tests are the guarantee that the visualisation is not "drawing what a
 * rainbow looks like": every angle the UI shows is derived here and checked
 * against independent derivations (analytic vs numeric vs full vector trace).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as O from '../src/optics.js';

const close = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) < tol, `${msg || ''} expected ${a} ~= ${b} (tol ${tol})`);

/* ---------------------------------------------------------------- vectors */

test('vector algebra basics', () => {
  const a = O.vec(1, 2, 3);
  const b = O.vec(-4, 5, 6);
  close(O.vdot(a, b), -4 + 10 + 18, 1e-12);
  const c = O.vcross(a, b);
  close(O.vdot(c, a), 0, 1e-12, 'cross is perpendicular to a');
  close(O.vdot(c, b), 0, 1e-12, 'cross is perpendicular to b');
  close(O.vlen(O.vnorm(a)), 1, 1e-12);
  close(O.vangle(O.vec(1, 0, 0), O.vec(0, 1, 0)) * O.DEG, 90, 1e-9);
  // degenerate input must not produce NaN
  assert.ok(Number.isFinite(O.vlen(O.vnorm(O.vec(0, 0, 0)))));
});

/* ------------------------------------------------- ray/sphere intersection */

test('ray-sphere intersection: central hit', () => {
  const r = O.intersectRaySphere(O.vec(-5, 0, 0), O.vec(1, 0, 0), O.vec(0, 0, 0), 1);
  assert.ok(r.hit);
  close(r.t0, 4, 1e-12);
  close(r.t1, 6, 1e-12);
  assert.equal(r.tangent, false);
});

test('ray-sphere intersection: miss', () => {
  const r = O.intersectRaySphere(O.vec(-5, 2, 0), O.vec(1, 0, 0), O.vec(0, 0, 0), 1);
  assert.equal(r.hit, false);
});

test('ray-sphere intersection: tangent ray is detected', () => {
  const r = O.intersectRaySphere(O.vec(-5, 1, 0), O.vec(1, 0, 0), O.vec(0, 0, 0), 1);
  assert.ok(r.hit);
  assert.ok(r.tangent || Math.abs(r.t1 - r.t0) < 1e-6, 'roots must coincide');
});

test('ray-sphere intersection stays accurate for a very distant origin', () => {
  const far = 1e7;
  const r = O.intersectRaySphere(O.vec(-far, 0.5, 0), O.vec(1, 0, 0), O.vec(0, 0, 0), 1);
  assert.ok(r.hit);
  // entry x-coordinate must be -sqrt(1 - 0.25)
  const x = -far + r.t0;
  close(x, -Math.sqrt(0.75), 1e-6, 'no catastrophic cancellation');
});

/* --------------------------------------------------------------- Snell law */

test("Snell's law, scalar and vector forms agree", () => {
  const n1 = 1;
  const n2 = 1.333;
  for (let deg = 1; deg <= 89; deg += 1) {
    const t1 = deg * O.RAD;
    const t2 = O.snellAngle(t1, n1, n2);
    close(n1 * Math.sin(t1), n2 * Math.sin(t2), 1e-12, 'scalar Snell');

    // vector form: interface at the origin, normal = -x, ray travelling +x
    const N = O.vec(-1, 0, 0);
    const d = O.vnorm(O.vec(Math.cos(t1), Math.sin(t1), 0));
    const rr = O.refract(d, N, n1 / n2);
    assert.ok(rr, 'no TIR going into the denser medium');
    const t2v = Math.acos(O.clamp(O.vdot(rr, O.vec(1, 0, 0)), -1, 1));
    close(t2v, t2, 1e-12, 'vector Snell matches scalar');
    close(O.vlen(rr), 1, 1e-12, 'refracted direction stays a unit vector');
  }
});

test('refraction at normal incidence does not bend the ray', () => {
  const d = O.vec(1, 0, 0);
  const rr = O.refract(d, O.vec(-1, 0, 0), 1 / 1.333);
  close(O.vangle(d, rr), 0, 1e-12);
});

test('total internal reflection is reported, and only past the critical angle', () => {
  const n = 1.333;
  const tc = O.criticalAngle(n, 1);
  close(Math.sin(tc), 1 / n, 1e-12);
  const N = O.vec(-1, 0, 0);
  const below = tc - 0.01;
  const above = tc + 0.01;
  const dBelow = O.vnorm(O.vec(Math.cos(below), Math.sin(below), 0));
  const dAbove = O.vnorm(O.vec(Math.cos(above), Math.sin(above), 0));
  assert.ok(O.refract(dBelow, N, n / 1) !== null, 'below critical angle: transmits');
  assert.equal(O.refract(dAbove, N, n / 1), null, 'above critical angle: TIR');
  assert.equal(O.criticalAngle(1, 1.333), null, 'no critical angle going into denser medium');
});

/* -------------------------------------------------------------- reflection */

test('reflection preserves the angle and flips the normal component', () => {
  const N = O.vec(0, 1, 0);
  const d = O.vnorm(O.vec(1, -1, 0));
  const r = O.reflect(d, N);
  close(r.x, d.x / O.vlen(d), 1e-12);
  close(r.y, -d.y / O.vlen(d), 1e-12);
  close(O.vangle(d, N), Math.PI - O.vangle(r, N), 1e-12);
});

/* ------------------------------------------------------------------ Fresnel */

test('Fresnel reflectance: normal incidence and grazing limits', () => {
  const n = 1.333;
  const r0 = O.fresnelReflectance(0, 1, n);
  close(r0, Math.pow((1 - n) / (1 + n), 2), 1e-12, 'normal incidence formula');
  close(r0, 0.0204, 2e-4, 'about 2% at normal incidence');
  const grazing = O.fresnelReflectance(89.9 * O.RAD, 1, n);
  assert.ok(grazing > 0.9, 'grazing incidence reflects almost everything');
  for (let d = 0; d <= 89; d++) {
    const R = O.fresnelReflectance(d * O.RAD, 1, n);
    assert.ok(R >= 0 && R <= 1, 'reflectance stays in [0,1]');
  }
});

/* ------------------------------------------- wavelength-dependent index */

test('refractive index model: table values, ordering, dispersion slider', () => {
  const idx = O.makeIndexModel();
  for (const c of O.NAMED_COLORS) close(idx(c.lambda), c.n, 1e-12, `n(${c.lambda})`);
  // shorter wavelength must refract more strongly
  for (let i = 1; i < O.NAMED_COLORS.length; i++) {
    assert.ok(
      idx(O.NAMED_COLORS[i].lambda) > idx(O.NAMED_COLORS[i - 1].lambda),
      'n increases towards the violet end'
    );
  }
  // dispersion = 0 collapses every wavelength onto one index
  const flat = O.makeIndexModel({ dispersion: 0 });
  const a = flat(420);
  const b = flat(650);
  close(a, b, 1e-12, 'no dispersion means no colour separation');
  // half dispersion sits halfway
  const half = O.makeIndexModel({ dispersion: 0.5 });
  close(half(650), (flat(650) + idx(650)) / 2, 1e-12);
});

test('Cauchy fit reproduces the table to better than 0.002', () => {
  for (const c of O.NAMED_COLORS) {
    close(O.cauchyIndex(c.lambda), c.n, 2e-3, `cauchy n(${c.lambda})`);
  }
});

/* --------------------------------------------------- deviation & extremum */

test('deviation formula: undeviated and known values', () => {
  const n = 1.333;
  close(O.deviation(0, n, 0), 0, 1e-12, 'central ray with no reflection is undeviated');
  close(O.deviation(0, n, 1) * O.DEG, 180, 1e-12, 'central ray with one reflection comes straight back');
  close(O.deviation(0, n, 2) * O.DEG, 360, 1e-12, 'central ray with two reflections goes straight on');
});

test('fold + antisolar conventions are self-consistent', () => {
  for (const D of [0, 45, 90, 137.7, 180, 230.4, 317.7, 400]) {
    const Theta = O.foldToScattering(D * O.RAD) * O.DEG;
    assert.ok(Theta >= -1e-9 && Theta <= 180 + 1e-9, 'Theta in [0,180]');
    close(O.antisolarAngle(D * O.RAD) * O.DEG, 180 - Theta, 1e-9, 'phi = 180 - Theta');
  }
});

test('analytic extremum matches an independent numeric search', () => {
  for (const n of [1.3, 1.331, 1.333, 1.343, 1.4, 1.5]) {
    for (const k of [1, 2, 3, 4]) {
      const a = O.rainbowIncidenceAnalytic(n, k);
      const b = O.rainbowIncidenceNumeric(n, k);
      close(a * O.DEG, b * O.DEG, 1e-4, `extremum n=${n} k=${k}`);
    }
  }
});

test('the extremum really is a stationary point of D(theta_i)', () => {
  const n = 1.333;
  for (const k of [1, 2, 3]) {
    const t = O.rainbowIncidenceAnalytic(n, k);
    const h = 1e-6;
    const dD = (O.deviation(t + h, n, k) - O.deviation(t - h, n, k)) / (2 * h);
    close(dD, 0, 1e-6, `dD/dtheta = 0 at the extremum, k=${k}`);
    // and it is a minimum of D for k = 1
    if (k === 1) {
      assert.ok(O.deviation(t + 0.05, n, k) > O.deviation(t, n, k));
      assert.ok(O.deviation(t - 0.05, n, k) > O.deviation(t, n, k));
    }
  }
});

/* --------------------------------------------- the headline rainbow angles */

test('primary rainbow angle is ~42 deg and red sits outside violet', () => {
  const idx = O.makeIndexModel();
  const red = O.rainbowGeometry(idx(650), 1);
  const violet = O.rainbowGeometry(idx(420), 1);
  close(red.antisolarDeg, 42.3, 0.2, 'red primary');
  close(violet.antisolarDeg, 40.6, 0.2, 'violet primary');
  assert.ok(red.antisolarDeg > violet.antisolarDeg, 'red is the OUTER edge of the primary');
  close(red.thetaIDeg, 59.5, 0.2, 'rainbow ray enters at ~59.5 deg incidence');
  close(red.deviationDeg, 137.7, 0.3, 'total deviation of the primary ray');
  // the whole visible span of the primary bow is a couple of degrees
  const span = red.antisolarDeg - violet.antisolarDeg;
  assert.ok(span > 1 && span < 3, `primary bow width ${span} deg`);
});

test('secondary rainbow is ~51 deg, fainter, with reversed colour order', () => {
  const idx = O.makeIndexModel();
  const red = O.rainbowGeometry(idx(650), 2);
  const violet = O.rainbowGeometry(idx(420), 2);
  close(red.antisolarDeg, 50.4, 0.3, 'red secondary');
  close(violet.antisolarDeg, 53.5, 0.4, 'violet secondary');
  assert.ok(violet.antisolarDeg > red.antisolarDeg, 'colour order is reversed in the secondary');
  assert.ok(
    red.antisolarDeg > O.rainbowGeometry(idx(650), 1).antisolarDeg,
    'the secondary lies outside the primary'
  );
  // fainter: one more internal reflection means one more factor of R
  const p = O.rainbowGeometry(idx(650), 1);
  const R1 = O.fresnelReflectance(p.thetaI, 1, p.n);
  const R2 = O.fresnelReflectance(red.thetaI, 1, red.n);
  const w1 = (1 - R1) * (1 - R1) * R1;
  const w2 = (1 - R2) * (1 - R2) * R2 * R2;
  assert.ok(w2 < w1, 'secondary carries less energy per ray than the primary');
});

test('tertiary and quaternary bows sit around the Sun, not the antisolar point', () => {
  const idx = O.makeIndexModel();
  for (const k of [3, 4]) {
    const g = O.rainbowGeometry(idx(650), k);
    assert.ok(g.antisolarDeg > 120, `order ${k} appears near the Sun (phi=${g.antisolarDeg})`);
    assert.ok(180 - g.antisolarDeg < 50, `order ${k} is within ~50 deg of the Sun`);
  }
});

test("Alexander's band lies between the two bows and is a few degrees wide", () => {
  const band = O.alexandersBand(O.makeIndexModel());
  assert.ok(band.outerDeg > band.innerDeg, 'the band has positive width');
  const w = band.outerDeg - band.innerDeg;
  assert.ok(w > 6 && w < 10, `Alexander's band width ${w} deg`);
  close(band.innerDeg, 42.3, 0.3);
  close(band.outerDeg, 50.4, 0.4);
});

/* ------------------------------------------------- full vector ray tracing */

function traceWithImpact(b, n, k, R = 1) {
  return O.traceRay({
    origin: O.vec(-10 * R, b * R, 0),
    dir: O.vec(1, 0, 0),
    center: O.vec(0, 0, 0),
    radius: R,
    n,
    reflections: k,
  });
}

test('vector trace: impact parameter, incidence angle and Snell at entry', () => {
  const n = 1.333;
  for (const b of [0.1, 0.3, 0.5, 0.7, 0.9, 0.99]) {
    const p = traceWithImpact(b, n, 1);
    assert.ok(p.hit && !p.tangent);
    close(p.impactParameter, b, 1e-9, 'impact parameter recovered from vectors');
    close(Math.sin(p.thetaI), b, 1e-9, 'sin(theta_i) = b/R');
    close(Math.sin(p.thetaI), n * Math.sin(p.thetaR), 1e-9, 'Snell at the entry surface');
  }
});

test('vector trace reproduces the analytic deviation for every order', () => {
  const n = 1.333;
  for (const k of [0, 1, 2, 3]) {
    for (const b of [0.05, 0.2, 0.4, 0.6, 0.8, 0.95]) {
      const p = traceWithImpact(b, n, k);
      assert.ok(p.dirOut, `ray exits for b=${b}, k=${k}`);
      assert.equal(p.actualReflections, k, 'the requested number of bounces happened');
      const expected = O.foldToScattering(O.deviation(p.thetaI, n, k)) * O.DEG;
      close(p.scattering * O.DEG, expected, 1e-6, `traced vs analytic, b=${b}, k=${k}`);
      close(p.antisolar * O.DEG, 180 - expected, 1e-6, 'phi = 180 - Theta from the trace');
    }
  }
});

test('vector trace: the rainbow ray really does leave at ~42 deg', () => {
  const idx = O.makeIndexModel();
  const n = idx(650);
  const geo = O.rainbowGeometry(n, 1);
  const p = traceWithImpact(geo.impactParameter, n, 1);
  close(p.antisolar * O.DEG, geo.antisolarDeg, 1e-6);
  close(p.antisolar * O.DEG, 42.3, 0.2, 'the traced ray lands on 42 deg on its own');
  assert.equal(p.classification, O.RayClass.PRIMARY);
});

test('one internal reflection is NOT sufficient to be a rainbow ray', () => {
  const idx = O.makeIndexModel();
  const n = idx(650);
  const p = traceWithImpact(0.2, n, 1); // far from the extremum
  assert.equal(p.reflections, 1);
  assert.equal(p.classification, O.RayClass.NON_CAUSTIC, 'ordinary scattered ray');
  assert.ok(Math.abs(p.antisolar * O.DEG - 42.3) > 5, 'it exits nowhere near the bow');
});

test('classification covers every family', () => {
  const n = O.makeIndexModel()(650);
  assert.equal(traceWithImpact(0.5, n, 0).classification, O.RayClass.NO_REFLECTION);
  const g1 = O.rainbowGeometry(n, 1);
  const g2 = O.rainbowGeometry(n, 2);
  const g3 = O.rainbowGeometry(n, 3);
  assert.equal(traceWithImpact(g1.impactParameter, n, 1).classification, O.RayClass.PRIMARY);
  assert.equal(traceWithImpact(g2.impactParameter, n, 2).classification, O.RayClass.SECONDARY);
  assert.equal(traceWithImpact(g3.impactParameter, n, 3).classification, O.RayClass.HIGHER_ORDER);
  const miss = O.traceRay({
    origin: O.vec(-10, 3, 0), dir: O.vec(1, 0, 0), radius: 1, n, reflections: 1,
  });
  assert.equal(miss.classification, O.RayClass.MISS);
  assert.ok(miss.miss);
});

test('grazing and tangent rays are handled without NaN', () => {
  const n = 1.333;
  const tangent = traceWithImpact(1, n, 1);
  assert.equal(tangent.classification, O.RayClass.TANGENT);
  for (const p of [traceWithImpact(0.999999, n, 1), traceWithImpact(1 - 1e-12, n, 1)]) {
    for (const pt of p.points) {
      assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y), 'no NaN in the polyline');
    }
  }
  const central = traceWithImpact(0, n, 1);
  close(central.antisolar * O.DEG, 0, 1e-9, 'the central ray returns straight to the Sun');
});

test('no total internal reflection ever occurs inside a sphere lit from outside', () => {
  // sin(theta_r) = sin(theta_i)/n <= 1/n = sin(theta_critical)
  const n = 1.333;
  for (let b = 0; b < 1; b += 0.01) {
    const p = traceWithImpact(b, n, 3);
    assert.equal(p.totalInternalReflection, false);
    assert.ok(p.dirOut, 'the ray always finds its way out');
  }
});

test('the geometry is independent of droplet radius', () => {
  const n = 1.333;
  const small = traceWithImpact(0.6, n, 1, 0.0005); // 0.5 mm drop
  const large = traceWithImpact(0.6, n, 1, 50);
  close(small.antisolar * O.DEG, large.antisolar * O.DEG, 1e-9, 'angles do not scale with size');
});

test('the trace is independent of the direction of the incoming beam', () => {
  const n = 1.333;
  const dir = O.vnorm(O.vec(0.3, -0.5, 0.8));
  const { u } = O.orthonormalBasis(dir);
  const b = 0.6;
  const origin = O.vadd(O.vmul(dir, -10), O.vmul(u, b));
  const tilted = O.traceRay({ origin, dir, radius: 1, n, reflections: 1 });
  const axis = traceWithImpact(b, n, 1);
  close(tilted.antisolar * O.DEG, axis.antisolar * O.DEG, 1e-9, 'rotational invariance');
});

/* --------------------------------------------------- caustic / distribution */

test('the angular distribution peaks at the rainbow angle, on its own', () => {
  const n = O.makeIndexModel()(650);
  const d = O.angularDistribution({ n, orders: [1], rays: 200000, minDeg: 0, maxDeg: 90, bins: 900 });
  const expected = O.rainbowGeometry(n, 1).antisolarDeg;
  close(d.peakDeg, expected, 0.3, 'the Monte-Carlo peak finds 42 deg without being told');
});

test('the secondary distribution peaks at ~50 deg', () => {
  const n = O.makeIndexModel()(650);
  const d = O.angularDistribution({ n, orders: [2], rays: 200000, minDeg: 0, maxDeg: 90, bins: 900 });
  close(d.peakDeg, O.rainbowGeometry(n, 2).antisolarDeg, 0.4);
});

test("Alexander's band receives no first- or second-order light", () => {
  const idx = O.makeIndexModel();
  const band = O.alexandersBand(idx);
  const mid = 0.5 * (band.innerDeg + band.outerDeg);
  for (const lam of [420, 540, 650]) {
    const d = O.angularDistribution({
      n: idx(lam), orders: [1, 2], rays: 100000,
      minDeg: mid - 0.5, maxDeg: mid + 0.5, bins: 1,
    });
    close(d.bins[0], 0, 1e-12, `no k=1,2 light at ${mid.toFixed(1)} deg for ${lam} nm`);
  }
});

test('rays really do concentrate: a narrow angular window collects a large share', () => {
  const n = O.makeIndexModel()(650);
  const phi = O.rainbowGeometry(n, 1).antisolarDeg;
  const all = O.angularDistribution({
    n, orders: [1], rays: 200000, minDeg: 0, maxDeg: 180, bins: 1800, perSolidAngle: false,
  });
  let near = 0;
  let total = 0;
  for (let i = 0; i < all.count; i++) {
    const c = (i + 0.5) * all.binWidth;
    total += all.bins[i];
    if (Math.abs(c - phi) < 1) near += all.bins[i];
  }
  const share = near / total;
  assert.ok(share > 0.1, `2 deg window holds ${(share * 100).toFixed(1)}% of the once-reflected light`);
});

/* -------------------------------------------------------- sky / horizon geometry */

test('the antisolar point is exactly opposite the Sun', () => {
  for (const el of [0, 5, 20, 42, 60, 89]) {
    for (const az of [0, 37, 180, 300]) {
      const s = O.sunDirection(el, az);
      const a = O.antisolarDirection(el, az);
      close(O.vangle(s, a) * O.DEG, 180, 1e-9, 'exactly opposite');
      close(Math.asin(a.y) * O.DEG, -el, 1e-9, 'antisolar elevation = -sun elevation');
      close(O.vlen(s), 1, 1e-12);
    }
  }
});

test('every point of the rainbow circle is at the right angle from the antisolar point', () => {
  const a = O.antisolarDirection(15, 40);
  for (const phi of [42.3, 50.4]) {
    for (const p of O.rainbowCircle(a, phi, 64)) {
      close(O.vangle(a, p) * O.DEG, phi, 1e-9);
      close(O.vlen(p), 1, 1e-9, 'unit directions');
    }
  }
});

test('the top of the bow is at elevation phi - sun elevation', () => {
  for (const el of [0, 10, 30]) {
    const v = O.visibleFraction(el, 42.3, 0);
    close(v.topElevationDeg, 42.3 - el, 1e-3);
    close(v.antisolarElevationDeg, -el, 1e-12);
  }
});

test('a high Sun pushes the primary bow entirely below the horizon', () => {
  assert.ok(O.visibleFraction(10, 42.3, 0).fraction > 0.3, 'low Sun: a large arc');
  assert.ok(O.visibleFraction(41, 42.3, 0).fraction > 0, 'just below the limit: a sliver remains');
  assert.equal(O.visibleFraction(43, 42.3, 0).fraction, 0, 'Sun above 42 deg: nothing visible');
  assert.equal(O.visibleFraction(55, 50.4, 0).fraction, 0, 'same rule for the secondary');
});

test('at sunrise exactly half the circle is above the horizon', () => {
  close(O.visibleFraction(0, 42.3, 0).fraction, 0.5, 0.01);
});

test('observer height barely moves the horizon, and never changes the bow angle', () => {
  close(O.horizonDipDeg(0), 0, 1e-12);
  close(O.horizonDipDeg(1.7), 0.042, 0.005, 'eye level');
  close(O.horizonDipDeg(1000), 1.02, 0.05, 'a kilometre up');
  assert.ok(O.horizonDipDeg(10000) < 3.3, 'even 10 km buys only a few degrees');
  // height changes only how much is hidden, never the angular radius
  const low = O.visibleFraction(20, 42.3, O.horizonDipDeg(1.7)).fraction;
  const high = O.visibleFraction(20, 42.3, O.horizonDipDeg(1000)).fraction;
  assert.ok(high > low, 'a higher horizon dip reveals slightly more of the circle');
  assert.ok(high - low < 0.05, 'but only slightly: height is not what makes a full circle');
});

/* ------------------------------------------------------------ curve sanity */

test('exit-angle curve is smooth, bounded, and turns exactly once for k=1', () => {
  const n = 1.333;
  const c = O.exitAngleCurve(n, 1, 2000);
  assert.equal(c.b.length, 2001);
  let turns = 0;
  for (let i = 2; i < c.phi.length; i++) {
    const d1 = c.phi[i - 1] - c.phi[i - 2];
    const d2 = c.phi[i] - c.phi[i - 1];
    if (d1 * d2 < 0) turns++;
    assert.ok(Number.isFinite(c.phi[i]) && c.phi[i] >= 0 && c.phi[i] <= 180);
  }
  assert.equal(turns, 1, 'exactly one extremum -- that is the rainbow');
  const maxPhi = Math.max(...c.phi);
  close(maxPhi, O.rainbowGeometry(n, 1).antisolarDeg, 0.1, 'the turning point is the bow angle');
});

test('the spectral profile puts red outside violet in the primary bow', () => {
  const prof = O.spectralProfile({ orders: [1], minDeg: 38, maxDeg: 45, bins: 140, rays: 4000 });
  let redPeak = 0;
  let bluePeak = 0;
  let redAt = 0;
  let blueAt = 0;
  for (let i = 0; i < prof.bins; i++) {
    if (prof.rgb[i].r > redPeak) { redPeak = prof.rgb[i].r; redAt = prof.phi[i]; }
    if (prof.rgb[i].b > bluePeak) { bluePeak = prof.rgb[i].b; blueAt = prof.phi[i]; }
  }
  assert.ok(redAt > blueAt, `red peak (${redAt.toFixed(2)}) outside blue peak (${blueAt.toFixed(2)})`);
});

test('with dispersion off, all colours land at the same angle', () => {
  const flat = O.makeIndexModel({ dispersion: 0 });
  const a = O.rainbowGeometry(flat(650), 1).antisolarDeg;
  const b = O.rainbowGeometry(flat(420), 1).antisolarDeg;
  close(a, b, 1e-12, 'no dispersion, no colours');
});

test('bowDirection agrees with rainbowCircle and sits exactly on the cone', () => {
  const anti = O.antisolarDirection(15, 180);
  const phi = O.rainbowGeometry(O.makeIndexModel()(650), 1).antisolarDeg;

  // every sample of the circle is reproduced by the single-direction form
  const circle = O.rainbowCircle(anti, phi, 36);
  for (let i = 0; i <= 36; i++) {
    const d = O.bowDirection(anti, phi, (i / 36) * 360);
    close(d.x, circle[i].x, 1e-12, 'x');
    close(d.y, circle[i].y, 1e-12, 'y');
    close(d.z, circle[i].z, 1e-12, 'z');
  }
  // and every one of them really is phi away from the antisolar point
  for (const roll of [0, 37, 90, 211.5, 359]) {
    const d = O.bowDirection(anti, phi, roll);
    close(O.vlen(d), 1, 1e-12, 'unit');
    close(O.vangle(d, anti) * O.DEG, phi, 1e-10, `roll ${roll}`);
  }
});

test('directionAtAngle turns a scattering angle back into the line of sight', () => {
  const anti = O.antisolarDirection(22, 180);
  const idx = O.makeIndexModel();

  for (const k of [1, 2, 3]) {
    const geo = O.rainbowGeometry(idx(650), k);
    // a droplet seen on the bow of order k, anywhere around the circle
    for (const roll of [0, 73, 180, 298]) {
      const d = O.bowDirection(anti, geo.antisolarDeg, roll);
      const toEye = O.vneg(d); // droplet -> observer

      // The ray that order k actually sends into that plane must BE the ray
      // to the eye: Theta = 180 - phi, measured from the incoming sunlight.
      const exit = O.directionAtAngle(anti, toEye, geo.scatteringDeg);
      close(exit.x, toEye.x, 1e-12, `k=${k} roll=${roll} x`);
      close(exit.y, toEye.y, 1e-12, `k=${k} roll=${roll} y`);
      close(exit.z, toEye.z, 1e-12, `k=${k} roll=${roll} z`);

      // and any other order leaves at exactly the angular gap between the bows
      for (const other of [1, 2, 3].filter((o) => o !== k)) {
        const g2 = O.rainbowGeometry(idx(650), other);
        const miss = O.directionAtAngle(anti, toEye, g2.scatteringDeg);
        close(
          O.vangle(miss, toEye) * O.DEG,
          Math.abs(g2.antisolarDeg - geo.antisolarDeg),
          1e-10,
          `k=${k} vs k=${other}`
        );
      }
    }
  }
});

test('directionAtAngle survives a line of sight along the axis', () => {
  const anti = O.vec(0, 0, 1);
  const d = O.directionAtAngle(anti, anti, 42);
  close(O.vlen(d), 1, 1e-12, 'unit');
  close(O.vangle(d, anti) * O.DEG, 42, 1e-10, 'still 42 deg off the axis');
});
