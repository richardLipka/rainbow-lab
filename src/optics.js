/**
 * optics.js -- pure optical / geometric engine for the rainbow simulation.
 *
 * NO DOM, no globals, no rendering. Everything here is testable in Node.
 *
 * ---------------------------------------------------------------------------
 * ANGLE CONVENTIONS  (mirrored in the "Mathematics" panel of the UI)
 * ---------------------------------------------------------------------------
 * The single most common source of confusion in rainbow geometry is mixing up
 * four different angles. They are defined once here and never mixed:
 *
 *   theta_i  angle of incidence at the first (air -> water) surface, measured
 *            from the surface normal. 0 deg = central ray, 90 deg = grazing.
 *            sin(theta_i) = b / R, where b is the impact parameter.
 *
 *   theta_r  angle of refraction inside the droplet, from the same normal.
 *            n_air * sin(theta_i) = n_water * sin(theta_r).
 *
 *   D        TOTAL DEVIATION: the total angle through which the ray direction
 *            has been turned, accumulated along the whole path and NOT folded
 *            back into [0,180]. For k internal reflections:
 *                D_k(theta_i) = 2*(theta_i - theta_r) + k*(PI - 2*theta_r)
 *            D = 0 for an undeviated ray, ~138 deg for the primary rainbow
 *            ray, ~230 deg for the secondary rainbow ray.
 *
 *   Theta    SCATTERING ANGLE: angle between the outgoing direction and the
 *            original direction of propagation of the sunlight, folded into
 *            [0,180]. Theta = fold(D). Theta = 0 is straight ahead (away from
 *            the Sun); Theta = 180 is straight back towards the Sun.
 *
 *   phi      ANGLE FROM THE ANTISOLAR DIRECTION as seen by the observer:
 *                phi = 180 deg - Theta
 *            This is the angular radius of the bow in the sky.
 *            Primary ~42 deg, secondary ~51 deg.
 *
 * The UI must always state which of these it is plotting.
 * ---------------------------------------------------------------------------
 */

export const DEG = 180 / Math.PI;
export const RAD = Math.PI / 180;
export const EPS = 1e-9;

/* =========================================================================
 * 1. Minimal 3-D vector algebra
 * =======================================================================*/

export const vec = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const vadd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const vsub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const vmul = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const vdot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const vcross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const vlen = (a) => Math.sqrt(vdot(a, a));
export const vneg = (a) => ({ x: -a.x, y: -a.y, z: -a.z });
export const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);

export function vnorm(a) {
  const l = vlen(a);
  if (l < EPS) return vec(0, 0, 0);
  return vmul(a, 1 / l);
}

/** Angle between two vectors, radians, numerically safe. */
export function vangle(a, b) {
  return Math.acos(clamp(vdot(vnorm(a), vnorm(b)), -1, 1));
}

/* =========================================================================
 * 2. Refractive index of water
 * =======================================================================*/

/**
 * Reference table of refractive indices. These are approximate values that
 * are entirely adequate for a geometric-optics teaching simulation. They are
 * NOT exact values for all temperatures, pressures and wavelengths.
 * Everything downstream reads through makeIndexModel(), so the table stays
 * configurable.
 */
export const NAMED_COLORS = [
  { id: 'red', lambda: 650, n: 1.331 },
  { id: 'orange', lambda: 610, n: 1.333 },
  { id: 'yellow', lambda: 580, n: 1.335 },
  { id: 'green', lambda: 540, n: 1.337 },
  { id: 'blue', lambda: 480, n: 1.340 },
  { id: 'violet', lambda: 420, n: 1.343 },
];

/** Reference wavelength used as the "dispersion switched off" index. */
export const LAMBDA_REF = 589;

/** Least-squares fit of  n = A + B / lambda^2  (lambda in micrometres). */
export function fitCauchy(table) {
  const xs = table.map((c) => 1 / Math.pow(c.lambda / 1000, 2));
  const ys = table.map((c) => c.n);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) * (xs[i] - mx);
  }
  const B = sxy / sxx;
  return { A: my - B * mx, B };
}

export const CAUCHY = fitCauchy(NAMED_COLORS);

/** Continuous Cauchy model; lambda in nanometres. */
export function cauchyIndex(lambda, cauchy = CAUCHY) {
  const um = lambda / 1000;
  return cauchy.A + cauchy.B / (um * um);
}

/**
 * Build a refractive-index model.
 *   mode        'table'  -> the six named colours use their tabulated value,
 *                           anything else uses the Cauchy fit
 *               'cauchy' -> everything uses the Cauchy fit
 *   dispersion  0..1     -> blends n(lambda) towards n(LAMBDA_REF). At 0 every
 *                           wavelength shares one index, so no colour
 *                           separation is possible at all.
 *   scale       multiplies the index (advanced "what if" experiment).
 */
export function makeIndexModel(opts = {}) {
  const {
    mode = 'table',
    dispersion = 1,
    table = NAMED_COLORS,
    cauchy = CAUCHY,
    scale = 1,
  } = opts;
  const byLambda = new Map(table.map((c) => [c.lambda, c.n]));
  const nRefRaw = cauchyIndex(LAMBDA_REF, cauchy);
  const model = (lambda) => {
    const raw =
      mode === 'table' && byLambda.has(lambda)
        ? byLambda.get(lambda)
        : cauchyIndex(lambda, cauchy);
    return (nRefRaw + dispersion * (raw - nRefRaw)) * scale;
  };
  model.meta = { mode, dispersion, cauchy, scale, nRef: nRefRaw * scale };
  return model;
}

/** Default model: tabulated values, full dispersion. */
export const defaultIndex = makeIndexModel();

/* =========================================================================
 * 3. Interface physics: Snell, reflection, Fresnel
 * =======================================================================*/

/**
 * Vector form of Snell's law.
 *   d    unit incident direction
 *   N    unit surface normal oriented so that dot(d, N) < 0
 *   eta  n1 / n2
 * Returns the unit refracted direction, or null on total internal reflection.
 */
export function refract(d, N, eta) {
  const cosi = -vdot(d, N);
  const k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return null;
  return vnorm(vadd(vmul(d, eta), vmul(N, eta * cosi - Math.sqrt(k))));
}

/** Mirror reflection about a surface with unit normal N (either orientation). */
export function reflect(d, N) {
  return vnorm(vsub(d, vmul(N, 2 * vdot(d, N))));
}

/** Scalar Snell's law: theta_2 in radians, or null for total reflection. */
export function snellAngle(theta1, n1, n2) {
  const s = (n1 / n2) * Math.sin(theta1);
  if (Math.abs(s) > 1) return null;
  return Math.asin(s);
}

/** Critical angle for n1 -> n2, radians, or null when n1 <= n2. */
export function criticalAngle(n1, n2) {
  if (n1 <= n2) return null;
  return Math.asin(n2 / n1);
}

/**
 * Unpolarised Fresnel reflectance at an interface. theta1 is the angle of
 * incidence in medium 1. Returns R in [0,1]; returns 1 for total internal
 * reflection.
 */
export function fresnelReflectance(theta1, n1, n2) {
  const t2 = snellAngle(theta1, n1, n2);
  if (t2 === null) return 1;
  const c1 = Math.cos(theta1);
  const c2 = Math.cos(t2);
  const rs = (n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2);
  const rp = (n1 * c2 - n2 * c1) / (n1 * c2 + n2 * c1);
  return clamp(0.5 * (rs * rs + rp * rp), 0, 1);
}

/* =========================================================================
 * 4. Ray / sphere intersection
 * =======================================================================*/

/**
 * Standard quadratic ray-sphere intersection, solved in the numerically
 * stable way (avoids catastrophic cancellation for distant origins).
 * Returns { hit, t0, t1, tangent } with t0 <= t1.
 */
export function intersectRaySphere(origin, dir, center, radius, eps = 1e-7) {
  const oc = vsub(origin, center);
  const a = vdot(dir, dir);
  const b = 2 * vdot(oc, dir);
  const c = vdot(oc, oc) - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return { hit: false, tangent: false };
  const sq = Math.sqrt(disc);
  // Tangency must be judged as a LENGTH, not as a value of the discriminant:
  // sq/(2a) is half the chord the ray cuts through the sphere, so comparing it
  // with the radius stays meaningful however far away the ray started.
  if (sq / (2 * a) <= eps * radius) {
    const t = -b / (2 * a);
    return { hit: true, t0: t, t1: t, tangent: true };
  }
  const q = b < 0 ? -0.5 * (b - sq) : -0.5 * (b + sq);
  let t0 = q / a;
  let t1 = c / q;
  if (t0 > t1) {
    const tmp = t0;
    t0 = t1;
    t1 = tmp;
  }
  return { hit: true, t0, t1, tangent: false };
}

/* =========================================================================
 * 5. Ray classification vocabulary
 * =======================================================================*/

export const RayClass = {
  MISS: 'miss',
  TANGENT: 'tangent',
  NO_REFLECTION: 'noReflection',
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  HIGHER_ORDER: 'higherOrder',
  NON_CAUSTIC: 'nonCaustic',
};

/**
 * Angular half-width (degrees) within which a ray counts as belonging to the
 * bright rainbow family, i.e. close enough to the extremum that neighbouring
 * rays pile up in nearly the same direction.
 * A pedagogical threshold, not a physical constant.
 */
export const CAUSTIC_TOLERANCE_DEG = 1.5;

/* =========================================================================
 * 6. Analytic deviation model
 * =======================================================================*/

/** D_k(theta_i) in radians; k = number of internal reflections. */
export function deviation(thetaI, n, k) {
  const thetaR = snellAngle(thetaI, 1, n);
  if (thetaR === null) return null;
  return 2 * (thetaI - thetaR) + k * (Math.PI - 2 * thetaR);
}

/** Fold a total deviation D into a scattering angle Theta in [0, PI]. */
export function foldToScattering(D) {
  let a = D % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  if (a > Math.PI) a = 2 * Math.PI - a;
  return a;
}

/** Angle from the antisolar direction, radians, from a total deviation D. */
export function antisolarAngle(D) {
  return Math.PI - foldToScattering(D);
}

/**
 * Analytic extremum ("rainbow") angle of incidence for k internal reflections.
 * Setting dD/dtheta_i = 0 gives
 *      cos^2(theta_i) = (n^2 - 1) / ((k+1)^2 - 1)
 * Returns theta_i in radians, or null when out of range.
 */
export function rainbowIncidenceAnalytic(n, k) {
  const denom = (k + 1) * (k + 1) - 1;
  if (denom <= 0) return null;
  const c2 = (n * n - 1) / denom;
  if (c2 < 0 || c2 > 1) return null;
  return Math.acos(Math.sqrt(c2));
}

/**
 * Locate the extremum of D_k numerically (golden-section search) WITHOUT
 * using the analytic formula. The unit tests compare the two, which is the
 * evidence that ~42 deg really emerges from the geometry.
 */
export function rainbowIncidenceNumeric(n, k, samples = 4000) {
  const f = (t) => deviation(t, n, k);
  const lo0 = 1e-7;
  const hi0 = Math.PI / 2 - 1e-7;
  const step = (hi0 - lo0) / samples;
  let bestT = lo0;
  let bestV = f(lo0);
  for (let i = 1; i <= samples; i++) {
    const t = lo0 + step * i;
    const v = f(t);
    if (v < bestV) {
      bestV = v;
      bestT = t;
    }
  }
  let a = Math.max(lo0, bestT - step);
  let b = Math.min(hi0, bestT + step);
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = b - gr * (b - a);
  let d = a + gr * (b - a);
  for (let i = 0; i < 300 && Math.abs(b - a) > 1e-14; i++) {
    if (f(c) < f(d)) {
      b = d;
      d = c;
      c = b - gr * (b - a);
    } else {
      a = c;
      c = d;
      d = a + gr * (b - a);
    }
  }
  return 0.5 * (a + b);
}

/** Full description of the bow of order k for index n. */
export function rainbowGeometry(n, k) {
  const thetaI = rainbowIncidenceAnalytic(n, k);
  if (thetaI === null) return null;
  const thetaR = snellAngle(thetaI, 1, n);
  const D = deviation(thetaI, n, k);
  return {
    k,
    n,
    thetaI,
    thetaR,
    D,
    phi: antisolarAngle(D),
    thetaIDeg: thetaI * DEG,
    thetaRDeg: thetaR * DEG,
    deviationDeg: D * DEG,
    scatteringDeg: foldToScattering(D) * DEG,
    antisolarDeg: antisolarAngle(D) * DEG,
    impactParameter: Math.sin(thetaI),
  };
}

/* =========================================================================
 * 7. Full vector ray trace through a spherical droplet
 * =======================================================================*/

/**
 * Trace one ray through a spherical droplet using vector geometry only.
 *
 * options: { origin, dir, center, radius, n, reflections, exitLength }
 *
 * Returns a path object carrying the polyline, every interaction vertex, the
 * measured angles, a relative intensity weight and a classification.
 * `segments` carry a `medium` field so the renderer needs no physics.
 */
export function traceRay(options) {
  const {
    origin,
    dir,
    center = vec(0, 0, 0),
    radius = 1,
    n = 1.333,
    reflections = 1,
  } = options;
  const exitLength = options.exitLength ?? 4 * radius;

  const d0 = vnorm(dir);
  const path = {
    hit: false,
    tangent: false,
    miss: false,
    points: [],
    segments: [],
    vertices: [],
    thetaI: null,
    thetaR: null,
    reflections,
    actualReflections: 0,
    dirIn: d0,
    dirOut: null,
    deviation: null,
    scattering: null,
    antisolar: null,
    impactParameter: null,
    intensity: 0,
    fresnelR: null,
    totalInternalReflection: false,
    classification: RayClass.MISS,
    n,
  };

  // Geometric impact parameter: distance from the centre to the incoming line.
  const oc = vsub(center, origin);
  const along = vdot(oc, d0);
  path.impactParameter = vlen(vsub(oc, vmul(d0, along)));

  const hit = intersectRaySphere(origin, d0, center, radius);
  if (!hit.hit || hit.t1 < 0) {
    path.miss = true;
    path.points = [origin, vadd(origin, vmul(d0, exitLength + 4 * radius))];
    path.segments = [{ a: path.points[0], b: path.points[1], medium: 'air', kind: 'miss' }];
    path.dirOut = d0;
    path.scattering = 0;
    path.antisolar = Math.PI;
    return path;
  }

  // Tangent / grazing: refuse to fabricate a refracted path, report honestly.
  if (hit.tangent || Math.abs(path.impactParameter - radius) < 1e-7) {
    path.hit = true;
    path.tangent = true;
    path.classification = RayClass.TANGENT;
    const p = vadd(origin, vmul(d0, hit.t0));
    const far = vadd(p, vmul(d0, exitLength));
    path.points = [origin, p, far];
    path.segments = [
      { a: origin, b: p, medium: 'air', kind: 'incident' },
      { a: p, b: far, medium: 'air', kind: 'exit' },
    ];
    path.dirOut = d0;
    path.deviation = 0;
    path.scattering = 0;
    path.antisolar = Math.PI;
    return path;
  }

  path.hit = true;

  /* ---- entry: air -> water --------------------------------------------- */
  const pEntry = vadd(origin, vmul(d0, hit.t0));
  const nEntry = vnorm(vsub(pEntry, center)); // outward normal
  const thetaI = Math.acos(clamp(-vdot(d0, nEntry), -1, 1));
  const dIn = refract(d0, nEntry, 1 / n);
  if (!dIn) return path; // impossible for air -> water, but stay safe
  const thetaR = Math.acos(clamp(-vdot(dIn, nEntry), -1, 1));
  path.thetaI = thetaI;
  path.thetaR = thetaR;

  path.points.push(origin, pEntry);
  path.segments.push({ a: origin, b: pEntry, medium: 'air', kind: 'incident' });
  path.vertices.push({
    point: pEntry,
    type: 'refraction',
    normal: nEntry,
    thetaIn: thetaI,
    thetaOut: thetaR,
  });

  // Fresnel bookkeeping. By reversibility the reflectance is identical at
  // every interface of this path, so weight = (1-R)^2 * R^k.
  const R = fresnelReflectance(thetaI, 1, n);
  path.fresnelR = R;
  path.intensity = (1 - R) * (1 - R) * Math.pow(R, reflections);

  /* ---- internal bounces, then exit -------------------------------------- */
  let p = pEntry;
  let d = dIn;

  for (let i = 0; i <= reflections; i++) {
    const h = intersectRaySphere(p, d, center, radius);
    if (!h.hit) return path;
    const t = h.t1 > 1e-9 ? h.t1 : h.t0;
    if (!(t > 1e-9)) return path;
    const pNext = vadd(p, vmul(d, t));
    path.points.push(pNext);
    path.segments.push({ a: p, b: pNext, medium: 'water', kind: 'internal' });

    const nOut = vnorm(vsub(pNext, center)); // outward normal
    const incidenceInside = Math.acos(clamp(vdot(d, nOut), -1, 1));

    if (i < reflections) {
      d = reflect(d, nOut);
      path.actualReflections++;
      path.vertices.push({
        point: pNext,
        type: 'reflection',
        normal: nOut,
        thetaIn: incidenceInside,
        thetaOut: incidenceInside,
      });
      p = pNext;
    } else {
      const dOut = refract(d, vneg(nOut), n);
      if (!dOut) {
        path.totalInternalReflection = true;
        path.classification = RayClass.NON_CAUSTIC;
        return path;
      }
      const thetaExit = Math.acos(clamp(vdot(dOut, nOut), -1, 1));
      path.vertices.push({
        point: pNext,
        type: 'refraction',
        normal: nOut,
        thetaIn: incidenceInside,
        thetaOut: thetaExit,
      });
      const far = vadd(pNext, vmul(dOut, exitLength));
      path.points.push(far);
      path.segments.push({ a: pNext, b: far, medium: 'air', kind: 'exit' });
      path.dirOut = dOut;
      path.exitPoint = pNext;
    }
  }

  if (path.dirOut) {
    // Measured straight from the vectors; the tests check that this agrees
    // with the analytic D_k formula.
    path.scattering = vangle(d0, path.dirOut);
    path.antisolar = Math.PI - path.scattering;
    path.deviation = deviation(thetaI, n, reflections);
  }
  path.classification = classifyRay(path, n);
  return path;
}

/* =========================================================================
 * 8. Classification
 * =======================================================================*/

/**
 * Classify a traced ray.
 * The pedagogical point: "one internal reflection" is NOT the same thing as
 * "rainbow ray". A ray belongs to the bright family only if its exit
 * direction also lies close to the extremum -- the caustic.
 */
export function classifyRay(path, n, tolDeg = CAUSTIC_TOLERANCE_DEG) {
  if (!path || !path.hit) return RayClass.MISS;
  if (path.tangent) return RayClass.TANGENT;
  if (path.totalInternalReflection) return RayClass.NON_CAUSTIC;
  const k = path.reflections;
  if (k === 0) return RayClass.NO_REFLECTION;
  const geo = rainbowGeometry(n, k);
  if (!geo || path.antisolar === null) return RayClass.NON_CAUSTIC;
  if (Math.abs(path.antisolar * DEG - geo.antisolarDeg) > tolDeg) {
    return RayClass.NON_CAUSTIC;
  }
  if (k === 1) return RayClass.PRIMARY;
  if (k === 2) return RayClass.SECONDARY;
  return RayClass.HIGHER_ORDER;
}

/* =========================================================================
 * 9. Exit-angle curves (the most important graph)
 * =======================================================================*/

/**
 * Sample phi(b), Theta(b) and D(b) for one index and one reflection order.
 * b is the normalised impact parameter b/R in [0,1]. Angles in DEGREES.
 */
export function exitAngleCurve(n, k, samples = 400) {
  const out = { b: [], phi: [], theta: [], D: [], intensity: [] };
  for (let i = 0; i <= samples; i++) {
    const b = i / samples;
    const thetaI = Math.asin(clamp(b, 0, 1));
    const D = deviation(thetaI, n, k);
    if (D === null) continue;
    const R = fresnelReflectance(thetaI, 1, n);
    out.b.push(b);
    out.D.push(D * DEG);
    out.theta.push(foldToScattering(D) * DEG);
    out.phi.push(antisolarAngle(D) * DEG);
    out.intensity.push((1 - R) * (1 - R) * Math.pow(R, k));
  }
  return out;
}

/** Angle for one impact parameter, in degrees, in the requested convention. */
export function angleFor(n, k, b, mode = 'antisolar') {
  const thetaI = Math.asin(clamp(b, 0, 1));
  const D = deviation(thetaI, n, k);
  if (D === null) return null;
  if (mode === 'deviation') return D * DEG;
  if (mode === 'scattering') return foldToScattering(D) * DEG;
  return antisolarAngle(D) * DEG;
}

/* =========================================================================
 * 10. Angular intensity distribution (the caustic)
 * =======================================================================*/

/**
 * Accumulate the angular distribution of the light a droplet scatters.
 *
 * Documented simplification -- this is geometric optics only:
 *   - a uniform beam illuminates the droplet, so the number of rays with
 *     impact parameter in [b, b+db] is proportional to b*db (area weighting),
 *     which is why b is sampled as sqrt(u);
 *   - each ray carries the unpolarised Fresnel weight (1-R)^2 * R^k;
 *   - rays are binned by their angle phi from the antisolar direction;
 *   - dividing by sin(phi) converts "energy per bin" into radiance, because
 *     a bin at angle phi covers a solid angle proportional to sin(phi)*dphi.
 *
 * No interference, no diffraction, no Mie theory, no supernumerary bows, no
 * polarisation tracking. In the ideal limit the caustic peak is infinitely
 * sharp; here it is smoothed only by the finite bin width.
 */
export function angularDistribution(opts = {}) {
  const {
    n = 1.333,
    orders = [1],
    rays = 20000,
    minDeg = 0,
    maxDeg = 180,
    bins = 360,
    sampling = 'uniform',
    perSolidAngle = true,
    bMin = 0,
    bMax = 1,
  } = opts;
  const acc = new Float64Array(bins);
  const binWidth = (maxDeg - minDeg) / bins;
  let total = 0;
  let used = 0;
  for (const k of orders) {
    for (let i = 0; i < rays; i++) {
      const u = sampling === 'random' ? Math.random() : (i + 0.5) / rays;
      const b = Math.sqrt(bMin * bMin + u * (bMax * bMax - bMin * bMin));
      const thetaI = Math.asin(clamp(b, 0, 1));
      const D = deviation(thetaI, n, k);
      if (D === null) continue;
      const phi = antisolarAngle(D) * DEG;
      const R = fresnelReflectance(thetaI, 1, n);
      const w = (1 - R) * (1 - R) * Math.pow(R, k);
      total += w;
      used++;
      const idx = Math.floor((phi - minDeg) / binWidth);
      if (idx < 0 || idx >= bins) continue;
      acc[idx] += w;
    }
  }
  if (perSolidAngle) {
    for (let i = 0; i < bins; i++) {
      const phiMid = (minDeg + (i + 0.5) * binWidth) * RAD;
      acc[i] /= Math.max(Math.sin(phiMid), 1e-3);
    }
  }
  let peak = 0;
  let peakIndex = 0;
  for (let i = 0; i < bins; i++) {
    if (acc[i] > peak) {
      peak = acc[i];
      peakIndex = i;
    }
  }
  return {
    bins: acc,
    binWidth,
    minDeg,
    maxDeg,
    total,
    used,
    peak,
    peakIndex,
    peakDeg: minDeg + (peakIndex + 0.5) * binWidth,
    count: bins,
  };
}

/* =========================================================================
 * 11. Sky geometry: Sun, antisolar point, rainbow circles, horizon
 * =======================================================================*/

/**
 * Unit vector towards the Sun. Right-handed frame, +Y up:
 *   elevation  degrees above the horizon
 *   azimuth    degrees; 0 = +Z, increasing towards +X
 */
export function sunDirection(elevationDeg, azimuthDeg = 0) {
  const e = elevationDeg * RAD;
  const a = azimuthDeg * RAD;
  return vec(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a));
}

/** The antisolar point lies exactly opposite the Sun as seen by the observer. */
export function antisolarDirection(elevationDeg, azimuthDeg = 0) {
  return vneg(sunDirection(elevationDeg, azimuthDeg));
}

/** Two unit vectors spanning the plane perpendicular to `axis`. */
export function orthonormalBasis(axis) {
  const a = vnorm(axis);
  const helper = Math.abs(a.y) < 0.9 ? vec(0, 1, 0) : vec(1, 0, 0);
  const u = vnorm(vcross(a, helper));
  return { u, v: vcross(a, u) };
}

/**
 * Directions making the angle phiDeg with the antisolar direction -- i.e. the
 * rainbow circle. Returns unit vectors.
 */
export function rainbowCircle(antisolar, phiDeg, steps = 256) {
  const a = vnorm(antisolar);
  const { u, v } = orthonormalBasis(a);
  const ph = phiDeg * RAD;
  const ca = Math.cos(ph);
  const sa = Math.sin(ph);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const ring = vadd(vmul(u, Math.cos(t)), vmul(v, Math.sin(t)));
    pts.push(vadd(vmul(a, ca), vmul(ring, sa)));
  }
  return pts;
}

export const EARTH_RADIUS_M = 6371000;

/**
 * Dip of the geometric horizon below the astronomical horizontal, in degrees,
 * for an observer h metres above a spherical Earth.
 * ~0.04 deg at eye level, only ~1.0 deg at 1000 m -- which is precisely why
 * "standing higher" does not by itself reveal a full circular rainbow.
 */
export function horizonDipDeg(heightM, earthRadius = EARTH_RADIUS_M) {
  const h = Math.max(0, heightM);
  return Math.acos(earthRadius / (earthRadius + h)) * DEG;
}

/**
 * Which part of a bow of angular radius phi lies above the horizon?
 * The antisolar point sits at elevation -sunElevation, so the top of the bow
 * reaches elevation phi - sunElevation.
 */
export function visibleFraction(sunElevationDeg, phiDeg, dipDeg = 0, steps = 2048) {
  const anti = antisolarDirection(sunElevationDeg, 0);
  const pts = rainbowCircle(anti, phiDeg, steps);
  let above = 0;
  let topEl = -Infinity;
  let botEl = Infinity;
  for (const p of pts) {
    const el = Math.asin(clamp(p.y, -1, 1)) * DEG;
    if (el > topEl) topEl = el;
    if (el < botEl) botEl = el;
    if (el > -dipDeg) above++;
  }
  return {
    fraction: above / pts.length,
    topElevationDeg: topEl,
    bottomElevationDeg: botEl,
    antisolarElevationDeg: -sunElevationDeg,
  };
}

/* =========================================================================
 * 12. Spectrum helpers used by the renderers
 * =======================================================================*/

/**
 * Approximate wavelength -> RGB conversion (the widely used piecewise
 * approximation). Purely a display convenience: no physics depends on it.
 */
export function wavelengthToRGB(lambda, gamma = 0.8) {
  let r = 0;
  let g = 0;
  let b = 0;
  if (lambda >= 380 && lambda < 440) {
    r = -(lambda - 440) / 60;
    b = 1;
  } else if (lambda < 490) {
    g = (lambda - 440) / 50;
    b = 1;
  } else if (lambda < 510) {
    g = 1;
    b = -(lambda - 510) / 20;
  } else if (lambda < 580) {
    r = (lambda - 510) / 70;
    g = 1;
  } else if (lambda < 645) {
    r = 1;
    g = -(lambda - 645) / 65;
  } else if (lambda <= 780) {
    r = 1;
  }
  let factor = 0;
  if (lambda >= 380 && lambda < 420) factor = 0.3 + (0.7 * (lambda - 380)) / 40;
  else if (lambda <= 700) factor = 1;
  else if (lambda <= 780) factor = 0.3 + (0.7 * (780 - lambda)) / 80;
  const f = (x) => Math.round(255 * Math.pow(Math.max(0, x) * factor, gamma));
  return { r: f(r), g: f(g), b: f(b) };
}

export function rgbCss(lambda, alpha = 1, gamma = 0.8) {
  const c = wavelengthToRGB(lambda, gamma);
  return alpha >= 1
    ? `rgb(${c.r},${c.g},${c.b})`
    : `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

export function linspace(a, b, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(a + ((b - a) * i) / (n - 1));
  return out;
}

/* =========================================================================
 * 13. Spectral radiance profile of the bow
 * =======================================================================*/

/**
 * For a set of wavelengths and reflection orders compute radiance(phi) and
 * convert it into an RGB profile. This is what the sky renderer paints, so
 * the visible bow is a direct consequence of the ray simulation and never a
 * hard-coded coloured arc.
 */
export function spectralProfile(opts = {}) {
  const {
    indexModel = defaultIndex,
    orders = [1, 2],
    lambdas = null,
    minDeg = 0,
    maxDeg = 62,
    bins = 496,
    rays = 4000,
  } = opts;
  const ls = lambdas || linspace(405, 675, 28);
  const acc = ls.map((lam) =>
    angularDistribution({
      n: indexModel(lam),
      orders,
      rays,
      minDeg,
      maxDeg,
      bins,
      perSolidAngle: true,
    })
  );
  const weights = ls.map((lam) => wavelengthToRGB(lam, 1));
  const rgb = new Array(bins);
  let maxR = 0;
  for (let i = 0; i < bins; i++) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let j = 0; j < ls.length; j++) {
      const v = acc[j].bins[i];
      r += v * weights[j].r;
      g += v * weights[j].g;
      b += v * weights[j].b;
    }
    rgb[i] = { r, g, b };
    maxR = Math.max(maxR, r, g, b);
  }
  const bw = (maxDeg - minDeg) / bins;
  const phi = new Float64Array(bins);
  for (let i = 0; i < bins; i++) phi[i] = minDeg + (i + 0.5) * bw;
  return { phi, rgb, maxRadiance: maxR, binWidth: bw, minDeg, maxDeg, bins };
}

/* =========================================================================
 * 14. Alexander's band
 * =======================================================================*/

/**
 * The angular gap between the primary and the secondary bow. Geometric optics
 * sends no once- or twice-reflected light into this range, so it looks darker
 * than the sky inside the primary or outside the secondary. It is not black:
 * higher orders, external reflection, multiple scattering between droplets and
 * ordinary skylight all put some light there.
 */
export function alexandersBand(indexModel = defaultIndex) {
  const nRed = indexModel(650);
  const nViolet = indexModel(420);
  const p1r = rainbowGeometry(nRed, 1);
  const p1v = rainbowGeometry(nViolet, 1);
  const p2r = rainbowGeometry(nRed, 2);
  const p2v = rainbowGeometry(nViolet, 2);
  return {
    innerDeg: Math.max(p1r.antisolarDeg, p1v.antisolarDeg),
    outerDeg: Math.min(p2r.antisolarDeg, p2v.antisolarDeg),
    primary: p1r,
    secondary: p2r,
  };
}
