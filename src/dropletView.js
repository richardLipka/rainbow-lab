/**
 * dropletView.js -- Mode A: cross-section of a single spherical droplet.
 *
 * Nothing in here knows any optics: it renders the polylines that
 * optics.traceRay() produced. Dragging changes the impact parameter, which
 * re-runs the trace.
 */
import * as O from './optics.js';
import { state, set, indexModel, activeOrders, activeLambdas } from './state.js';
import {
  buildRays, distanceFromExtremum, colorFor, traceOne, BOW_MATCH_DEG, bowNameKey, sharedPrefix,
  entrySide,
} from './rays.js';
import { t, deg, num } from './i18n.js';
import { fitCanvas, strokePath, label, arrowHead, angleArc, capture } from './ui.js';

/** Rays classified into one of these families are the ones a real observer
 * would actually see as a bright rainbow -- everything else is scattered
 * light going somewhere else entirely. */
const REACHES_OBSERVER = new Set([O.RayClass.PRIMARY, O.RayClass.SECONDARY, O.RayClass.HIGHER_ORDER]);

const SEG_LABELS = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5'];

/**
 * How far the view may be pulled back from the droplet, in droplet radii.
 * Exported so the slider in the control column and the wheel gesture here
 * cannot disagree about the ends of the range.
 */
export const ZOOM_RANGE = [1, 40];

export function createDropletView(canvas) {
  let layout = null;
  let hover = null;
  /* The eyes currently on screen, and where each one was last drawn.
     rayStyle(), the tally and the pointer hit-test all have to agree with
     what drawObserver() actually painted, so they read these rather than
     each re-deriving the geometry. */
  let eyes = [];
  let eyeScreen = [];

  function project(p) {
    return { x: layout.cx + p.x * layout.s, y: layout.cy - p.y * layout.s };
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);

    // Zooming out draws the droplet smaller (dampened by sqrt so it stays
    // legible even at high zoom) while the observer moves proportionally
    // farther away (see drawObserver) -- together this is what lets a
    // dispersed fan of colour become visible on the way to the eye instead
    // of being lost in a droplet that fills most of the frame.
    const zoom = Math.max(1, state.dropletZoom);
    // Floored: below ~16 px the droplet stops reading as a sphere with a
    // traceable path inside it, and the point of zooming out is to compare
    // the fan's spread WITH the droplet, not to lose the droplet.
    const s = Math.max(16, Math.min(w * 0.19, h * 0.34) / Math.sqrt(zoom));

    // Where the eyes are depends only on optics, so it can be settled before
    // the layout -- which lets the layout use it. With essentially one exit
    // direction in play, centring the droplet wastes half the canvas: the fan
    // we are trying to spread out runs off one edge while the opposite side
    // stays empty. Sliding the droplet AGAINST the mean eye direction as the
    // zoom rises makes the droplet-to-eye baseline as long as the canvas
    // allows, and the drawn width of the dispersion fan is proportional to
    // exactly that baseline.
    eyes = computeObservers();
    const lean = meanScreenDir(eyes);
    const pull = Math.min(1, (zoom - 1) / 6);
    layout = {
      cx: w * 0.47 - (lean ? lean.x * w * 0.24 * pull : 0),
      cy: h * 0.5 - (lean ? lean.y * h * 0.2 * pull : 0),
      s, w, h, zoom,
    };
    eyeScreen = [];

    drawBackground(ctx, w, h);
    drawDroplet(ctx);
    drawSun(ctx, w, h);

    const observers = eyes;

    drawAlexanderBand(ctx);

    const rays = buildRays();
    // Rays that reach the observer are drawn LAST, above everything else.
    // Sorting by role alone used to bury them: a contributing fan ray would
    // be painted before a dim, non-contributing main ray and then covered by
    // it, so the very rays the scene is trying to emphasise ended up
    // underneath the ones it is trying to play down. Role only breaks ties
    // within each group.
    const order = { fan: 0, demo0: 1, demoNC: 1, main: 2 };
    rays.sort((a, b) => {
      const ra = reachesEye(a) ? 1 : 0;
      const rb = reachesEye(b) ? 1 : 0;
      return ra !== rb ? ra - rb : order[a.role] - order[b.role];
    });
    const reachingKs = new Set(rays.filter(reachesEye).map((r) => r.k));
    // The lowest order on screen draws the shared trunk; every higher order
    // starts at the wall where it carried on instead of refracting out. One
    // ray enters, and the orders peel off it -- which is the cause of the
    // secondary bow, and was invisible while each order redrew the whole
    // path on top of the others.
    const lowest = Math.min(...rays.filter((r) => r.role === 'main' || r.role === 'fan').map((r) => r.k));
    // Fan segments are batched by stroke style into one Path2D each and
    // stroked once per group. Every other ray keeps its own path, because it
    // carries decorations -- arrowheads, vertex dots, the reaches-the-eye
    // glow -- that a shared path cannot.
    const batch = new Map();
    for (const ray of rays) drawRay(ctx, ray, batch, lowest);
    flushBatch(ctx, batch);

    const main = rays.filter((r) => r.role === 'main');
    if (main.length) {
      // When several families are compared at once, the detailed breakdown
      // (angle arcs, R-segment labels, Theta/phi readout) has to pick ONE
      // ray to attach to. Prefer whichever matches the "Vnitřní odrazy"
      // solo-select control -- the one control the user is actually
      // steering -- rather than an arbitrary last-built ray, so the detail
      // view never silently jumps to a family the user didn't ask about.
      const ref = main.find((r) => r.k === state.reflections) ?? main[main.length - 1];
      if (state.show.angles) drawAngles(ctx, ref);
      if (state.show.labels) drawSegmentLabels(ctx, ref);
      if (state.show.angles && ref.path.dirOut) drawExitAngle(ctx, ref);
      if (state.show.normals) for (const r of main) drawNormals(ctx, r);
    }
    drawArrivalArc(ctx);
    drawImpactHandle(ctx);
    for (const observer of observers) drawObserver(ctx, observer, reachingKs.has(observer.kRef));
    drawLegend(ctx, w, h, rays);
    if (state.show.labels) {
      label(ctx, t(state.observerMode === 'manual' ? 'observerManualHint' : 'observerReachHint'), 12, h - 14, {
        color: '#6f86ab', font: '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      });
    }
  }

  /**
   * Where a real observer would need to stand to see each ACTIVE reflection
   * family's rainbow, and in which direction they'd be looking -- one entry
   * per family, not one overall. A real observer sees the primary and
   * secondary bows at once, at different angular radii (exactly what the sky
   * view draws as two concentric circles); drawing only a single shared eye
   * here would leave a secondary ray glowing as "reaching" while visibly
   * missing the one eye on screen, which is actively misleading whenever more
   * than one family is compared at a time.
   *
   * A real observer is effectively at infinity, so every droplet sends its
   * concentrated light in the same fixed direction -- the antisolar angle phi
   * for a given order/wavelength. We get that direction by tracing the
   * actual canonical ray at the analytic extremum (O.rainbowGeometry's own
   * impact parameter), reusing the exact same tested ray tracer as every
   * other ray on screen, rather than re-deriving the angle by hand.
   * k=0 has no extremum -- no reflection ever produces a concentrated
   * direction -- so it never gets an eye; if it is the only active family, a
   * single inactive placeholder eye is still shown, captioned accordingly.
   *
   * In MANUAL mode the eyes keep their per-family structure and their side of
   * the axis, but sit at the angle the user chose instead of the angle the
   * extremum dictates. Same code path, one substituted number -- so the two
   * modes cannot drift apart, and 42 deg becomes something to find rather
   * than something the app quietly asserts.
   */
  function computeObservers() {
    const idx = indexModel();
    const nRef = idx(650); // red, the same reference wavelength used elsewhere
    const manual = state.observerMode === 'manual';
    const orders = activeOrders().filter((k) => k >= 1);
    const lambdas = activeLambdas();
    const observers = [];
    for (const kRef of orders) {
      const geo = O.rainbowGeometry(nRef, kRef);
      if (!geo) continue;
      // The SAME signed entry buildRays() uses, or the eye would be placed
      // for a ray the scene is not drawing.
      const canonical = traceOne(650, nRef, kRef,
        entrySide(kRef, nRef) * geo.impactParameter);
      if (!canonical.path.dirOut) continue;
      // Every active colour's bow for this order. Under white light the bows
      // are 1.7 deg apart, so "the rainbow is at 42.4 deg" is red's edge of a
      // band, not the whole band -- an eye parked at 41.1 deg is on the bow
      // just as truly, it is simply catching blue. Quoting red's angle at
      // every eye position was the thing that made a single bow read as
      // several: nothing on screen ever said which colour was arriving.
      const bows = [];
      for (const lambda of lambdas) {
        const g = O.rainbowGeometry(idx(lambda), kRef);
        if (g) bows.push({ lambda, phi: g.antisolarDeg });
      }
      const common = { valid: true, kRef, manual, bows };
      if (!manual) {
        const near = nearestBow(bows, geo.antisolarDeg);
        observers.push({
          ...common, dir: canonical.path.dirOut, phiDeg: geo.antisolarDeg,
          rainbowPhiDeg: geo.antisolarDeg, bowLambda: near ? near.lambda : 650,
        });
        continue;
      }
      // The exit side flips with every internal reflection (k=1 leaves below
      // the axis for b>0, k=2 above), so the side has to come from this
      // family's own canonical ray -- a manual eye placed on the wrong side
      // would be mirrored away from the light and could never light up.
      const side = Math.sign(canonical.path.dirOut.y) || 1;
      // phi is measured AT the observer, between the line back to the droplet
      // and the antisolar direction (+x), so the droplet-to-eye direction is
      // Theta = 180 - phi away from +x.
      const phi = O.clamp(state.observerPhi, 0, 180) * O.RAD;
      const phiDeg = O.clamp(state.observerPhi, 0, 180);
      const near = nearestBow(bows, phiDeg);
      observers.push({
        ...common,
        dir: O.vec(-Math.cos(phi), side * Math.sin(phi), 0),
        phiDeg,
        rainbowPhiDeg: near ? near.phi : geo.antisolarDeg,
        bowLambda: near ? near.lambda : 650,
      });
    }
    if (!observers.length) {
      const kRef = state.reflections >= 1 ? state.reflections : 0;
      observers.push({
        dir: O.vec(-1, 0, 0), valid: false, kRef, phiDeg: null,
        rainbowPhiDeg: null, bowLambda: null, bows: [], manual,
      });
    }
    return observers;
  }

  /** Whichever active colour's bow for this order sits closest to phiDeg. */
  function nearestBow(bows, phiDeg) {
    let best = null;
    for (const b of bows) {
      if (!best || Math.abs(b.phi - phiDeg) < Math.abs(best.phi - phiDeg)) best = b;
    }
    return best;
  }

  /** Mean screen-space direction of the eyes, for the layout lean. */
  function meanScreenDir(observers) {
    let x = 0;
    let y = 0;
    let n = 0;
    for (const o of observers) {
      if (!o.valid) continue;
      x += o.dir.x;
      y += -o.dir.y; // world -> screen y-flip
      n++;
    }
    if (!n) return null;
    const len = Math.hypot(x, y);
    return len < 1e-6 ? null : { x: x / len, y: y / len };
  }

  /**
   * Does this ray actually deliver light into an eye that is on screen?
   *
   * AUTO mode asks the ray's own classification, which measures the ray
   * against the extremum computed from the ray's OWN refractive index. A
   * geometric test would be subtly wrong here: the eyes are positioned with
   * n(650), so a violet primary ray -- dead on its own caustic, 1.7 deg away
   * from red's -- would stop counting as reaching.
   *
   * MANUAL mode asks the geometric question instead, because that is the
   * question the user is now steering: does this ray come out at the angle
   * the eye is sitting at? Answering it geometrically is what makes the
   * caustic discoverable -- sweeping the eye through the rainbow angle makes
   * the count of arriving rays spike, and nothing had to be told to it.
   * Both tests use the same tolerance, so at the rainbow angle the two modes
   * agree ray for ray.
   */
  function reachesEye(ray) {
    if (state.observerMode !== 'manual') return REACHES_OBSERVER.has(ray.classification);
    if (ray.k < 1 || ray.path.antisolar === null) return false;
    const phi = ray.path.antisolar * O.DEG;
    for (const eye of eyes) {
      if (!eye.valid || eye.kRef !== ray.k) continue;
      if (Math.abs(phi - eye.phiDeg) <= O.CAUSTIC_TOLERANCE_DEG) return true;
    }
    return false;
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
      // The antisolar direction IS the incoming beam's direction of travel
      // (away from the Sun, continuing forward) -- so its label belongs on
      // the far side of the droplet from the Sun icon, not next to it.
      label(ctx, t('antisolarPoint'), w - 14, layout.cy - 13, {
        align: 'right', color: '#8fa4c8', bg: false,
        font: '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
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

  /**
   * Prominence is driven by whether the ray actually reaches the observer
   * (its own classification, exactly the same test used in the ray-info
   * panel), not by which role built it. A demo ray or a fan ray that happens
   * to land on the caustic is emphasised exactly like the main ray would be;
   * an off-caustic main ray is dimmed exactly like a non-rainbow fan ray.
   */
  function rayStyle(ray) {
    const reaches = reachesEye(ray);
    // greyMix is the primary cue (see colorFor): a ray that misses the
    // observer loses most of its hue, so with a whole fan on screen the few
    // that matter stand out by colour and not merely by being a little less
    // faint. Alpha is kept high enough that the missing rays stay clearly
    // present -- they are the pedagogical point, not clutter to hide.
    if (ray.role === 'fan') {
      return { alpha: reaches ? 0.95 : 0.4, width: reaches ? 2.2 : 0.9, greyMix: reaches ? 0 : 0.82, reaches };
    }
    return { alpha: reaches ? 1 : 0.62, width: reaches ? 2.4 : 1.3, greyMix: reaches ? 0 : 0.72, reaches };
  }

  /**
   * One ray.
   *
   * `batch` collects fan-ray segments instead of stroking them: with four
   * orders, six wavelengths and a sixty-ray fan the scene has about seven
   * thousand segments, and a stroke call each put the frame at 54 ms.
   * Grouped by style and width there are a couple of dozen strokes instead.
   */
  function drawRay(ctx, ray, batch, lowest = 0) {
    const p = ray.path;
    if (!p.hit && !p.miss) return;
    // Where this order stops being the same light as the lowest one drawn.
    const from = ray.role === 'main' || ray.role === 'fan' ? sharedPrefix(ray.k, lowest) : 0;
    const { alpha: a, width: baseWidth, greyMix, reaches } = rayStyle(ray);
    const selected =
      state.selectedRay &&
      state.selectedRay.k === ray.k &&
      Math.abs(state.selectedRay.b - ray.b) < 1e-9 &&
      state.selectedRay.lambda === ray.lambda;

    const base = colorFor(ray.lambda, a, greyMix);
    const dashed = ray.role === 'demo0' || ray.role === 'demoNC';

    // A glow under the exit segment for any ray that actually reaches the
    // observer -- the visual cue that ties "this ray" to "that eye", not
    // just a brighter version of the same colour.
    if (reaches && p.segments.length > from) {
      const exitSeg = p.segments[p.segments.length - 1];
      strokePath(ctx, [project(exitSeg.a), project(exitSeg.b)], 'rgba(224,168,63,0.35)', baseWidth + 5);
    }

    for (let si = 0; si < p.segments.length; si++) {
      if (si < from) continue;
      const seg = p.segments[si];
      const A = project(seg.a);
      const B = project(seg.b);
      let width = baseWidth;
      if (selected) width += 1.6;
      let style = base;
      if (seg.medium === 'water') {
        style = colorFor(ray.lambda, Math.min(1, a * 0.95), greyMix);
        width += 0.2;
      }
      if (seg.kind === 'incident' && ray.role !== 'fan') {
        // incoming sunlight is white before the droplet splits it, but a
        // ray that will miss the observer still reads as greyed out
        style = reaches && state.wavelength === 'white' ? `rgba(255,246,214,${a})` : base;
      }
      // A selected fan ray is drawn on its own: it is thicker than its group.
      if (batch && ray.role === 'fan' && !selected) {
        const key = `${style}|${width}`;
        let path = batch.get(key);
        if (!path) {
          path = { path: new Path2D(), style, width };
          batch.set(key, path);
        }
        path.path.moveTo(A.x, A.y);
        path.path.lineTo(B.x, B.y);
        continue;
      }
      strokePath(ctx, [A, B], style, width, dashed && seg.kind !== 'internal' ? [5, 4] : null);
    }

    if (p.dirOut && p.segments.length) {
      const last = p.segments[p.segments.length - 1];
      arrowHead(ctx, project(last.a), project(last.b), base, reaches ? 8 : ray.role === 'fan' ? 4 : 6);
    }

    if (ray.role !== 'fan') {
      // The refraction/reflection dots follow the ray's own emphasis --
      // full-strength markers on a greyed-out ray would pull the eye back
      // to exactly the ray the scene is trying to play down.
      for (const v of p.vertices) {
        const q = project(v.point);
        const dot = v.type === 'reflection' ? '255,209,102' : '139,224,255';
        ctx.fillStyle = reaches ? `rgb(${dot})` : `rgba(${dot},0.45)`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, selected ? 3.6 : reaches ? 2.6 : 2, 0, Math.PI * 2);
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

  /** Where the ticks sit, in droplet radii. Outside the sphere, inside the
   *  eyes, and far enough out that neighbouring exits separate. */
  const ARRIVAL_R = 1.62;
  /**
   * How many impact parameters the arc samples.
   *
   * Deliberately NOT the fan count. The fan is drawn, so its size is a
   * legibility choice; the arc is a density display, and density needs
   * samples. Measured for the secondary: at 45 the busiest 3-degree bucket
   * holds 3 ticks against a typical 1, which reads as noise; at 200 it holds
   * 15 against 4, which reads as a caustic.
   */
  const ARRIVAL_SAMPLES = 200;

  /* Cached against the physics, never the camera: the exit directions depend
     on the index model and the orders, and nothing else. */
  let arrival = { key: '', groups: [] };

  function arrivalKey() {
    return [
      state.wavelength, state.dispersion, state.indexMode, state.indexScale,
      activeOrders().join(','),
    ].join('|');
  }

  /**
   * Every impact parameter across the droplet face, reduced to the one thing
   * that decides whether it is a rainbow: the direction it leaves in.
   *
   * Uniform in b, so the DENSITY of the ticks is the density of exit
   * directions -- and that density is the whole of a caustic. Where they pile
   * up, a band of entry points is leaving along one direction. Everywhere
   * else they spread, because the exit direction is still swinging: measured,
   * about 1.4 deg per 0.01 of b for the secondary against 0.02 deg at its own
   * bow.
   *
   * This is the angular distribution plot drawn where the rays are, and it is
   * the bridge the scene was missing. A single traced ray can only ever show
   * one direction, which is why the secondary looks like it points somewhere
   * arbitrary until you see the population it belongs to.
   */
  function buildArrival() {
    const key = arrivalKey();
    if (arrival.key === key) return arrival;
    const idx = indexModel();
    const groups = [];
    // One curve per ORDER, not per order and wavelength. Six wavelengths put
    // 24 translucent polygons on screen at k=4 and cost 113 ms a frame, for a
    // bulge whose position moves less than two degrees across the spectrum --
    // invisible at this radius. The longest active wavelength is the same
    // convention graphView uses to label its extrema.
    const lambda = activeLambdas().includes(650) ? 650 : activeLambdas()[0];
    const n = idx(lambda);
    for (const k of activeOrders()) {
      if (k < 1) continue;
      const angs = [];
      for (let i = 0; i < ARRIVAL_SAMPLES; i++) {
        const b = (i + 0.5) / ARRIVAL_SAMPLES;
        const path = traceOne(lambda, n, k, b).path;
        if (!path.dirOut) continue;
        angs.push(Math.atan2(-path.dirOut.y, path.dirOut.x));
      }
      if (angs.length > 8) groups.push({ k, lambda, angs });
    }
    arrival = { key, groups };
    return arrival;
  }

  /**
   * The exit directions, drawn as a profile rather than as separate ticks.
   *
   * Ticks were tried first and only half worked: measured against the median
   * brightness along the arc, the primary's pile-up came out 3.3x brighter
   * and the secondary's only 1.7x. That asymmetry is real -- the secondary
   * spreads its exits over 128 degrees of screen against the primary's much
   * narrower span, so the same 200 samples land thinner -- and it is exactly
   * the thing this display exists to defeat. A bar per bin, scaled to the
   * group's own busiest bin, measures density instead of relying on ink
   * piling up, so a narrow caustic on a wide spread reads as strongly as a
   * tight one.
   */
  const ARRIVAL_BIN = 1.2 * Math.PI / 180;
  const ARRIVAL_BAR = 26;

  function drawArrivalArc(ctx) {
    // Pointless with one ray on screen: a pile-up needs a population, and the
    // reader has not asked to see one.
    if (state.fanCount <= 0) return;
    const r = layout.s * ARRIVAL_R;
    if (r < 40) return;
    const { groups } = buildArrival();
    if (!groups.length) return;

    ctx.save();
    let lo = Infinity;
    let hi = -Infinity;
    for (const g of groups) for (const a of g.angs) { if (a < lo) lo = a; if (a > hi) hi = a; }
    ctx.strokeStyle = 'rgba(126,150,196,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(layout.cx, layout.cy, r, lo - 0.04, hi + 0.04);
    ctx.stroke();

    for (const g of groups) {
      const bins = new Map();
      for (const a of g.angs) {
        const b = Math.round(a / ARRIVAL_BIN);
        bins.set(b, (bins.get(b) || 0) + 1);
      }
      const keys = [...bins.keys()].sort((x, y) => x - y);
      const peak = Math.max(...bins.values());
      if (!(peak > 0) || keys.length < 3) continue;
      // Filled, not hatched. Two hundred separate bars read as texture; the
      // same numbers as one filled curve read as a shape with a spike on it,
      // which is the entire message.
      const dens = (i) => {
        const c0 = bins.get(keys[i]) || 0;
        const cm = bins.get(keys[i - 1]) || c0;
        const cp = bins.get(keys[i + 1]) || c0;
        return (cm + 2 * c0 + cp) / 4;
      };
      const rad = (i) => r + 3 + ARRIVAL_BAR * Math.sqrt(dens(i) / peak);
      ctx.beginPath();
      for (let i = 0; i < keys.length; i++) {
        const a = keys[i] * ARRIVAL_BIN;
        const x = layout.cx + Math.cos(a) * rad(i);
        const y = layout.cy + Math.sin(a) * rad(i);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = keys.length - 1; i >= 0; i--) {
        const a = keys[i] * ARRIVAL_BIN;
        ctx.lineTo(layout.cx + Math.cos(a) * r, layout.cy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = colorFor(g.lambda, 0.22);
      ctx.fill();
      ctx.strokeStyle = colorFor(g.lambda, 0.9);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < keys.length; i++) {
        const a = keys[i] * ARRIVAL_BIN;
        const x = layout.cx + Math.cos(a) * rad(i);
        const y = layout.cy + Math.sin(a) * rad(i);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // The bulge needs naming. Left to inference it reads as "the band happens
    // to end thick here" rather than "this is the direction the bow is in".
    const idx2 = indexModel();
    for (const k of activeOrders()) {
      if (k < 1) continue;
      const geo = O.rainbowGeometry(idx2(activeLambdas()[0]), k);
      if (!geo) continue;
      const canon = traceOne(activeLambdas()[0], idx2(activeLambdas()[0]), k, geo.impactParameter);
      if (!canon.path.dirOut) continue;
      const a3 = Math.atan2(-canon.path.dirOut.y, canon.path.dirOut.x);
      const c3 = Math.cos(a3);
      const s3 = Math.sin(a3);
      ctx.save();
      ctx.strokeStyle = orderColor(k);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(layout.cx + c3 * (r - 10), layout.cy + s3 * (r - 10));
      ctx.lineTo(layout.cx + c3 * (r + ARRIVAL_BAR + 8), layout.cy + s3 * (r + ARRIVAL_BAR + 8));
      ctx.stroke();
      ctx.restore();
      if (!state.show.labels) continue;
      label(ctx, t(bowNameKey(k), { k }),
        O.clamp(layout.cx + c3 * (r + ARRIVAL_BAR + 24), 54, layout.w - 54),
        O.clamp(layout.cy + s3 * (r + ARRIVAL_BAR + 24), 14, layout.h - 26), {
          align: 'center', color: orderColor(k),
          font: '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
        });
    }

    if (!state.show.labels) return;
    const mid = (lo + hi) / 2;
    label(ctx, t('arrivalArcLabel'),
      O.clamp(layout.cx + Math.cos(mid) * (r + ARRIVAL_BAR + 18), 62, layout.w - 62),
      O.clamp(layout.cy + Math.sin(mid) * (r + ARRIVAL_BAR + 18), 14, layout.h - 26), {
        align: 'center', color: '#8ea3c6',
        font: '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      });
  }

  function flushBatch(ctx, batch) {
    if (!batch.size) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const g of batch.values()) {
      ctx.strokeStyle = g.style;
      ctx.lineWidth = g.width;
      ctx.stroke(g.path);
    }
    ctx.restore();
  }

  /**
   * The observer, drawn as an eye facing back toward the droplet, sitting
   * exactly along the direction the current family's canonical rainbow ray
   * exits along (see computeObserver). Its world-space distance grows with
   * state.dropletZoom (see draw()), so zooming out pushes it farther away
   * in step with the droplet shrinking -- not just a fixed offset -- and
   * the diverging exit rays get correspondingly longer to reach it (see
   * buildRays()). It is still clamped to stay comfortably inside the canvas
   * regardless of aspect ratio, since the true distance to an observer is
   * effectively infinite and has no true scale to draw at.
   */
  function drawObserver(ctx, observer, reaching) {
    const { cx, cy, s, w, h, zoom } = layout;
    // Brass means ONE thing: this eye is standing on the bow. Measured
    // against the nearest active colour, exactly as the caption below is, so
    // the glyph and the words can never disagree. It used to follow "some ray
    // reached me", which under white light was true across a window wider
    // than the whole band -- the eye was lit almost everywhere and so said
    // nothing about where the rainbow actually is.
    const onBow = observer.valid && observer.rainbowPhiDeg !== null &&
      Math.abs(observer.phiDeg - observer.rainbowPhiDeg) <= BOW_MATCH_DEG;
    const active = onBow && reaching !== false;
    const screenDir = { x: observer.dir.x, y: -observer.dir.y }; // world -> screen y-flip
    const len = Math.hypot(screenDir.x, screenDir.y) || 1;
    const ux = screenDir.x / len;
    const uy = screenDir.y / len;

    const margin = 58; // room for the eye glyph and its centred caption
    let radius = s * 3.3 * Math.sqrt(zoom);
    const limits = [];
    if (ux > 1e-6) limits.push((w - margin - cx) / ux);
    if (ux < -1e-6) limits.push((margin - cx) / ux);
    if (uy > 1e-6) limits.push((h - margin - cy) / uy);
    if (uy < -1e-6) limits.push((margin - cy) / uy);
    for (const lim of limits) if (lim > 0) radius = Math.min(radius, lim);

    const x = cx + ux * radius;
    const y = cy + uy * radius;
    const faceAngle = Math.atan2(cy - y, cx - x); // eye looks back at the droplet
    eyeScreen.push({ x, y, kRef: observer.kRef });

    ctx.save();
    if (active) {
      const g = ctx.createRadialGradient(x, y, 2, x, y, 30);
      g.addColorStop(0, 'rgba(224,168,63,0.38)');
      g.addColorStop(1, 'rgba(224,168,63,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    // line of sight, faint, from the observer toward the droplet
    strokePath(ctx, [{ x, y }, { x: cx, y: cy }],
      active ? 'rgba(224,168,63,0.3)' : 'rgba(147,163,189,0.16)', 1, [2, 4]);

    // A halo the moment the eye is on the bow, so "found it" is visible from
    // across the room rather than being a shade of line colour.
    if (active) {
      const halo = ctx.createRadialGradient(x, y, 2, x, y, 30);
      halo.addColorStop(0, 'rgba(224,168,63,0.42)');
      halo.addColorStop(1, 'rgba(224,168,63,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.translate(x, y);
    ctx.rotate(faceAngle);
    ctx.beginPath();
    ctx.ellipse(0, 0, active ? 16 : 14, active ? 8.6 : 7.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = active ? 'rgba(224,168,63,0.26)' : 'rgba(147,163,189,0.06)';
    ctx.fill();
    ctx.strokeStyle = active ? '#ffcf6a' : 'rgba(147,163,189,0.55)';
    ctx.lineWidth = active ? 2.4 : 1.1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, active ? 5 : 2.8, 0, Math.PI * 2);
    ctx.fillStyle = active ? '#ffcf6a' : 'rgba(147,163,189,0.75)';
    ctx.fill();
    ctx.restore();

    // phi, drawn where phi is actually defined: AT the eye, between the line
    // of sight back to the droplet and the antisolar direction (+x on screen
    // -- the direction the sunlight was already travelling, continuing past
    // the droplet). Sweeping the same arc at the droplet centre instead would
    // sweep Theta, not phi; that exact confusion is what the exit-angle
    // readout had to be fixed for, so it is not repeated here. With the arc
    // drawn, "the observer is at 42 deg" and "the ray leaves at phi = 42 deg"
    // are visibly the same statement about the same angle.
    if (state.show.angles && observer.valid && observer.phiDeg !== null) {
      const losAng = Math.atan2(cy - y, cx - x);
      const stub = Math.min(x + 66, w - 6);
      if (stub > x + 12) {
        strokePath(ctx, [{ x, y }, { x: stub, y }], 'rgba(143,164,200,0.4)', 1, [3, 4]);
      }
      // Labelled with the symbol only. The value is already in the caption a
      // few pixels away, and printing it twice put the two labels on top of
      // each other whenever the caption flipped up past the arc.
      angleArc(ctx, x, y, 34, Math.min(losAng, 0), Math.max(losAng, 0),
        active ? 'rgba(224,168,63,0.95)' : 'rgba(143,164,200,0.75)', 'φ');
    }

    if (state.show.labels) {
      // Name the colour whenever more than one is in play. Without it the
      // caption reads as one rainbow that moves around, when what actually
      // moves is which wavelength arrives at the eye.
      const manyColours = observer.bows && observer.bows.length > 1;
      const nm = manyColours && observer.bowLambda ? ` · ${observer.bowLambda} ${t('nm')}` : '';
      const belowLine2 = observer.valid
        ? `φ ${observer.manual ? '=' : '≈'} ${deg(observer.phiDeg, 1)}${observer.kRef ? ` · k=${observer.kRef}` : ''}`
        : t('observerNoConcentration');
      // Stack the caption upwards when a downward stack would not fit. The
      // eye's position is dictated by the optics -- for k=1 it lands on the
      // bottom margin at every zoom -- so the caption is the part that has to
      // give way. The reserved band at the foot is the hint row, which a
      // three-line stack from a bottom-margin eye lands exactly on top of.
      const HINT_BAND = 26;
      const dir = y + 62 > h - HINT_BAND ? -1 : 1;
      // With split entry on, the two eyes land about 8 deg apart, which at
      // this scale is a few tens of pixels -- close enough that the two
      // captions printed straight over each other and neither phi could be
      // read. The whole point of putting them that close is that you can read
      // both, so an eye whose caption would collide with one already drawn
      // steps its stack clear of it.
      const CAPTION_H = 46;
      let bump = 0;
      for (const prev of eyeScreen) {
        if (Math.abs(prev.x - x) > 108) continue;
        const py = prev.captionY;
        if (py === undefined) continue;
        while (Math.abs((dir > 0 ? y + 20 : y - 52) + dir * bump - py) < CAPTION_H) {
          bump += CAPTION_H;
        }
      }
      const y1 = (dir > 0 ? y + 20 : y - 52) + dir * bump;
      // Recorded so the NEXT eye can step clear of this one.
      const mine = eyeScreen[eyeScreen.length - 1];
      if (mine) mine.captionY = y1;
      // Centred on the eye, but slid back onto the canvas when that would
      // run it off an edge. The eye's position is dictated by the optics and
      // routinely sits hard against a margin, where the longest caption --
      // the k=0 "no reflection, so no concentrated direction" one -- loses
      // its first several characters.
      const centred = (text, ty, opts = {}) => {
        ctx.save();
        ctx.font = opts.font || '11px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
        const half = ctx.measureText(text).width / 2 + 6;
        ctx.restore();
        label(ctx, text, O.clamp(x, half + 2, Math.max(half + 2, w - half - 2)), ty,
          { align: 'center', ...opts });
      };
      centred(t('observerLabel'), y1, { color: active ? '#e0a83f' : '#93a3bd' });
      centred(belowLine2, y1 + 16, {
        color: '#6f86ab', font: '10px "IBM Plex Mono", ui-monospace, monospace',
      });
      // Manual mode has to say plainly how far from the bow the eye is, or
      // "move it until something happens" is a search with no feedback.
      if (observer.manual && observer.rainbowPhiDeg !== null) {
        const d = observer.phiDeg - observer.rainbowPhiDeg;
        // Measured against the NEAREST active colour's bow, with the tighter
        // of the two tolerances. Against red's angle at the caustic
        // half-width, "on the bow" lit up across a window wider than the
        // whole band -- including angles where nothing is concentrated at
        // all -- so the badge stopped meaning anything.
        const onBow = Math.abs(d) <= BOW_MATCH_DEG;
        centred(onBow
          ? `${t('observerOnBow')}${nm}`
          : `Δ ${d > 0 ? '+' : ''}${num(d, 1)}° → ${deg(observer.rainbowPhiDeg, 1)}${nm}`,
          y1 + 32, {
            color: onBow ? '#6fd3a4' : '#c9905c',
            font: '10px "IBM Plex Mono", ui-monospace, monospace',
          });
      } else if (observer.valid && nm) {
        centred(`${t('observerOnBow')}${nm}`, y1 + 32, {
          color: '#6fd3a4', font: '10px "IBM Plex Mono", ui-monospace, monospace',
        });
      }
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
    drawBounceNumbers(ctx, ray);
  }

  /**
   * Number the bounces.
   *
   * Which bow a ray belongs to is decided by one integer, and the path
   * already draws a dot at each internal reflection -- but counting dots in
   * a folded path is not something anyone gets right twice, and at k=3 the
   * dots sit close enough together to read as two. The numbers carry the
   * reflection dot's own colour so the pair reads as one mark.
   */
  function drawBounceNumbers(ctx, ray) {
    let n = 0;
    for (const v of ray.path.vertices) {
      if (v.type !== 'reflection') continue;
      n++;
      const q = project(v.point);
      // Pushed away from the droplet centre, so the number never lands on
      // the path it is counting.
      const away = { x: v.point.x, y: -v.point.y };
      const len = Math.hypot(away.x, away.y) || 1;
      label(ctx, String(n), q.x + (away.x / len) * 13, q.y + (away.y / len) * 13, {
        align: 'center', color: '#ffd166', font: '10px "IBM Plex Mono", ui-monospace, monospace',
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

  /**
   * Marks the angle this specific arc geometrically sweeps: the reference
   * line points forward (+x, continuing the incident beam undeviated) and
   * the arc closes onto the actual outgoing ray, so the angle between them is
   * Theta -- the scattering angle from the ORIGINAL direction of travel, per
   * optics.js's own convention -- not phi. (phi = 180 deg - Theta is measured
   * from the antisolar direction instead, i.e. from the reverse of this same
   * reference line, which would require the arc to sweep back through the
   * droplet body to draw honestly.) Showing Theta here and deriving phi as
   * text keeps the arc's size and its label in agreement, and ties directly
   * into the two conventions the Mathematics panel documents.
   */
  function drawExitAngle(ctx, ray) {
    const p = ray.path;
    const exitSeg = p.segments[p.segments.length - 1];
    const origin = project(exitSeg.a);
    const refEnd = { x: origin.x + 78, y: origin.y };
    strokePath(ctx, [origin, refEnd], 'rgba(120,140,180,0.5)', 1, [3, 4]);
    const d = { x: exitSeg.b.x - exitSeg.a.x, y: -(exitSeg.b.y - exitSeg.a.y) };
    const outAng = Math.atan2(d.y, d.x);
    const thetaDeg = p.scattering * O.DEG;
    const phiDeg = p.antisolar * O.DEG;
    angleArc(ctx, origin.x, origin.y, 46, 0, outAng, 'rgba(111,211,164,0.95)',
      `Θ=${deg(thetaDeg, 1)} → φ=${deg(phiDeg, 1)}`);
  }

  /** Chrome colour per reflection order, shared with the bow caption. */
  function orderColor(k) {
    return k === 1 ? '#6fd3a4' : k === 2 ? '#9b8cf0' : '#f0885d';
  }

  /**
   * Where each bow's own ray enters.
   *
   * Sunlight is parallel, so the only thing that differs between one ray and
   * the next is where it lands -- and because the droplet is curved, that
   * fixes the angle it meets the surface at (sin theta_i = b/R). Each order's
   * caustic therefore sits at its own entry position: 0.86 for the primary,
   * 0.95 for the secondary. Marking them on the handle's track is what makes
   * "the secondary needs a different ray" something you can see rather than
   * something the panel has to assert.
   */
  function drawBowMarks(ctx, x) {
    // Below this the droplet is too small for the marks to separate: the
    // primary and secondary sit 0.089 apart in b, so at s = 60 their ticks
    // are five pixels apart and the labels would be a smear.
    if (layout.s < 70) return;
    const nRef = indexModel()(650);
    const marks = [];
    for (const k of activeOrders()) {
      if (k < 1) continue;
      const geo = O.rainbowGeometry(nRef, k);
      if (!geo) continue;
      // With split entry on, order k's own ray enters the other half, so its
      // tick belongs on that half of the track. A tick left on the reference
      // side would point at an entry point no drawn ray uses.
      const sb = entrySide(k, nRef) * geo.impactParameter;
      marks.push({ k, b: geo.impactParameter, sb, y: layout.cy - sb * layout.s });
    }
    marks.sort((a2, b2) => a2.y - b2.y);
    let lastLabelY = -1e9;
    for (const m of marks) {
      const on = Math.abs(state.impact - m.b) < 0.004;
      if (m.sb !== 0 && Math.sign(m.sb) !== Math.sign(state.impact || 1)) {
        // Mirrored orders get their own faint dot on the track, so the second
        // entry point is visible as a position and not only as a ray that
        // appears from nowhere.
        ctx.save();
        ctx.fillStyle = orderColor(m.k);
        ctx.globalAlpha = on ? 0.9 : 0.4;
        ctx.beginPath();
        ctx.arc(x, m.y, on ? 4 : 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = orderColor(m.k);
      ctx.globalAlpha = on ? 1 : 0.55;
      ctx.lineWidth = on ? 2.4 : 1.4;
      ctx.beginPath();
      ctx.moveTo(x - 7, m.y);
      ctx.lineTo(x + 7, m.y);
      ctx.stroke();
      ctx.restore();
      // A tick is always worth drawing; a label only when it will not land on
      // the one above it.
      if (!state.show.labels || m.y - lastLabelY < 13) continue;
      lastLabelY = m.y;
      const text = `${t(bowNameKey(m.k), { k: m.k })} · ${num(m.b, 3)}`;
      ctx.save();
      ctx.font = '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
      const width = ctx.measureText(text).width;
      ctx.restore();
      label(ctx, text, Math.max(width + 8, x - 11), m.y, {
        align: 'right', color: orderColor(m.k), bg: on,
        font: '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      });
    }
  }

  /**
   * Alexander's dark band, as a wedge between two rays rather than a number.
   *
   * Only meaningful with split entry on. From one entry point the primary and
   * the secondary leave 92.8 deg apart on screen, and a wedge drawn between
   * them would be 92.8 deg of nothing -- a measurement of the drawing, not of
   * the sky. Let each order enter through its own half and the same two rays
   * leave 8.2 deg apart, which is the real gap: no light of either order
   * leaves into it, at any impact parameter. That is the whole reason the
   * band is dark, and it is the one claim the scene could not previously
   * make without asking the reader to subtract two captions.
   *
   * The edges come from the traced canonical rays, never from the analytic
   * angles, so if the trace and the formula ever disagreed the wedge would
   * show it.
   */
  function drawAlexanderBand(ctx) {
    if (!state.splitEntry) return;
    const orders = activeOrders().filter((k) => k === 1 || k === 2);
    if (orders.length < 2) return;
    const nRef = indexModel()(650);
    const edges = [];
    for (const k of orders) {
      const geo = O.rainbowGeometry(nRef, k);
      if (!geo) continue;
      const p = traceOne(650, nRef, k, entrySide(k, nRef) * geo.impactParameter).path;
      if (!p.dirOut) continue;
      edges.push({ k, ang: Math.atan2(-p.dirOut.y, p.dirOut.x), phi: geo.antisolarDeg });
    }
    if (edges.length < 2) return;
    const a0 = Math.min(edges[0].ang, edges[1].ang);
    const a1 = Math.max(edges[0].ang, edges[1].ang);
    const gap = Math.abs(edges[0].phi - edges[1].phi);

    // A ribbon rather than a wedge from the centre. A filled wedge was tried
    // and could not be seen: the band is dark, the canvas is dark, and 8 deg
    // of slightly-darker on a nearly-black ground is nothing. Hatching at a
    // radius the eyes are not sitting at gives the band an edge and a texture
    // without pretending there is light in it.
    const r0 = layout.s * 2.3;
    const r1 = layout.s * 3.2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(layout.cx, layout.cy, r1, a0, a1);
    ctx.arc(layout.cx, layout.cy, r0, a1, a0, true);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = 'rgba(152,174,218,0.42)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const span = r1 + Math.max(layout.w, layout.h);
    for (let o = -span; o < span; o += 7) {
      ctx.moveTo(layout.cx + o, layout.cy - span);
      ctx.lineTo(layout.cx + o + span * 2, layout.cy + span);
    }
    ctx.stroke();
    ctx.restore();

    // The two bow rays themselves, carried out past the droplet so the band
    // is visibly bounded BY them and not merely near them.
    ctx.save();
    ctx.strokeStyle = 'rgba(160,178,214,0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    for (const e of edges) {
      ctx.beginPath();
      ctx.moveTo(layout.cx, layout.cy);
      ctx.lineTo(layout.cx + Math.cos(e.ang) * r1, layout.cy + Math.sin(e.ang) * r1);
      ctx.stroke();
    }
    ctx.restore();

    if (!state.show.labels) return;
    const mid = (a0 + a1) / 2;
    // ON the ribbon, not beyond it. Beyond it the label ran into the two eye
    // captions, which sit much further out along this same bearing, and into
    // the hint row at the foot of the canvas.
    const lr = (r0 + r1) / 2;
    label(ctx, `${t('alexanderBandLabel')} · ${deg(gap, 1)}`,
      O.clamp(layout.cx + Math.cos(mid) * lr, 84, layout.w - 84),
      O.clamp(layout.cy + Math.sin(mid) * lr, 16, layout.h - 44),
      { align: 'center', color: '#b3c2dc', bg: true });
  }

  function drawImpactHandle(ctx) {
    const y = layout.cy - state.impact * layout.s;
    const x = layout.cx - layout.s * 1.9;
    drawBowMarks(ctx, x);
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
      // b/R and theta_i are the same knob: sin(theta_i) = b/R. Printing
      // only one of them leaves the reader looking for a second control that
      // sets the angle, and there isn't one.
      const thetaDeg = Math.asin(O.clamp(Math.abs(state.impact), 0, 1)) * O.DEG;
      label(ctx, `b/R = ${num(state.impact, 3)} · θᵢ = ${deg(thetaDeg, 1)}`, x, y - 16,
        { align: 'center', color: '#cfe0ff' });
    }
  }

  /**
   * What the current reflection count actually produces.
   *
   * The control says "internal reflections: 2" and the classification chip
   * in the side panel says "secondary rainbow family", but only for a ray
   * that happens to be sitting on the caustic -- so at any other impact
   * parameter nothing on screen connected the integer to the bow. This line
   * always does, straight out of `rainbowGeometry`.
   *
   * Order 3 is quoted from the SUN, not from the antisolar point, because
   * that is where it comes back: phi is 137 deg and reading "137 deg" next
   * to the primary's 42 deg invites the reader to look for it in the wrong
   * half of the sky.
   */
  function drawBowLine(ctx, w, y) {
    const orders = activeOrders().filter((k) => k >= 1);
    if (!orders.length) {
      label(ctx, t('dropletBowNone'), w - 12, y, { align: 'right', color: '#8ea3c6' });
      return y + 18;
    }
    // One line per order on screen. Naming only state.reflections left a
    // reader looking at two rays and one name, with no way to tell which
    // caption belonged to which.
    const idx = indexModel();
    for (const k of orders) {
      const geo = O.rainbowGeometry(idx(activeLambdas()[0]), k);
      if (!geo) continue;
      const sunward = geo.antisolarDeg > 90;
      label(ctx, t('dropletBowLine', {
        k,
        bow: t(bowNameKey(k), { k }),
        angle: deg(sunward ? 180 - geo.antisolarDeg : geo.antisolarDeg, 1),
        side: t(sunward ? 'bowFromSun' : 'bowFromAntisolar'),
      }), w - 12, y, { align: 'right', color: orderColor(k) });
      y += 18;
    }
    return y;
  }

  function drawLegend(ctx, w, h, rays) {
    let y = 18;
    if (state.show.labels) y = drawBowLine(ctx, w, y) + 4;
    if (state.show.wavelengthLabels) {
      const main = rays.filter((r) => r.role === 'main');
      const seen = new Set();
      for (const r of main) {
        if (seen.has(r.lambda)) continue;
        seen.add(r.lambda);
        const txt = `${r.lambda} ${t('nm')} · n=${num(r.n, 4)} · φ=${
          r.path.antisolar === null ? '—' : deg(r.path.antisolar * O.DEG, 2)
        }`;
        label(ctx, txt, w - 12, y, { align: 'right', color: colorFor(r.lambda) });
        y += 18;
      }
      y += 6;
    }
    drawRayTally(ctx, w, y, rays);
  }

  /**
   * How many of the rays on screen actually reach the observer, with a
   * swatch for each of the two states. Only worth showing once there is
   * more than one ray to compare -- with a single ray the observer eye
   * lighting up already says the same thing. Placed top-right, under the
   * wavelength legend, because the top-left is where the Sun icon and its
   * label travel as the impact parameter is dragged.
   */
  function drawRayTally(ctx, w, y0, rays) {
    if (!state.show.labels) return;
    const traced = rays.filter((r) => r.path.hit && !r.path.tangent);
    if (traced.length < 2) return;
    const reaching = traced.filter(reachesEye).length;

    let y = y0;
    label(ctx, `${t('rayTally')}: ${reaching} / ${traced.length}`, w - 12, y, {
      align: 'right', color: reaching ? '#e0a83f' : '#93a3bd',
    });
    y += 18;

    const font = '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
    const lambdas = state.wavelength === 'white'
      ? O.NAMED_COLORS.map((c) => c.lambda)
      : [state.wavelength];

    /** greyMix null => draw the swatch as the actual spectrum in play, so
     *  under white light the "reaches" key is a miniature rainbow rather
     *  than a single red line that misrepresents what is on screen. */
    const swatchRow = (text, greyMix, alpha) => {
      label(ctx, text, w - 12, y, { align: 'right', bg: false, color: '#8ea3c6', font });
      // measure with the same font label() draws in, not whatever the
      // context happened to be left set to
      ctx.save();
      ctx.font = font;
      const textW = ctx.measureText(text).width;
      ctx.restore();
      const x1 = w - 18 - textW;
      const x0 = x1 - 16;
      const seg = (x1 - x0) / lambdas.length;
      lambdas.forEach((lam, i) => {
        strokePath(ctx, [{ x: x0 + i * seg, y }, { x: x0 + (i + 1) * seg + 0.6, y }],
          colorFor(lam, alpha, greyMix), 2.4);
      });
      y += 15;
    };
    swatchRow(t('rayLegendReaches'), 0, 1);
    swatchRow(t('rayLegendMisses'), 0.82, 0.55);
  }

  /* ---------------------------------------------------------- interaction */

  function impactFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const b = (layout.cy - y) / layout.s;
    return Math.max(-0.999, Math.min(0.999, b));
  }

  /** The eye under the pointer, if any -- the drag handle for phi. */
  function eyeUnder(e) {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return eyeScreen.find((eye) => Math.hypot(px - eye.x, py - eye.y) < 22) || null;
  }

  /**
   * The phi a pointer position implies: the angle at the pointer between the
   * line back to the droplet and the antisolar direction. Only the magnitude
   * of the screen angle is used, so the eye stays on whichever side of the
   * axis its own reflection family actually exits towards, however far round
   * the droplet the pointer wanders.
   */
  function phiFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const dx = e.clientX - rect.left - layout.cx;
    const dy = e.clientY - rect.top - layout.cy;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return state.observerPhi;
    const theta = Math.acos(O.clamp(dx / len, -1, 1)) * O.DEG;
    return Math.round(O.clamp(180 - theta, 0, 180) * 10) / 10;
  }

  let dragging = false;
  let eyeDrag = false;
  canvas.addEventListener('pointerdown', (e) => {
    if (!layout) return;
    capture(canvas, e);
    // Grabbing the eye steers phi directly. Doing it while still in auto mode
    // is what switches the mode over: the gesture IS the request to place the
    // eye by hand, and making the user find a radio button first would only
    // give the drag a way to look broken.
    if (eyeUnder(e)) {
      eyeDrag = true;
      set({ observerMode: 'manual', observerPhi: phiFromEvent(e) });
      return;
    }
    dragging = true;
    set({ impact: impactFromEvent(e) });
    selectNearest(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!layout) return;
    if (eyeDrag) {
      set({ observerPhi: phiFromEvent(e) });
      return;
    }
    if (dragging) {
      set({ impact: impactFromEvent(e) });
    } else {
      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hy = layout.cy - state.impact * layout.s;
      const overEye = !!eyeUnder(e);
      const nowHover = !overEye && Math.abs(y - hy) < 14;
      const cursor = overEye ? 'grab' : nowHover ? 'ns-resize' : 'crosshair';
      if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
      if (nowHover !== hover) {
        hover = nowHover;
        draw();
      }
    }
  });
  const stop = () => { dragging = false; eyeDrag = false; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  // Wheel = pull back from the droplet, the same direction the sky view's
  // wheel moves its camera. Scaled by the raw deltaY rather than its sign so
  // a trackpad gets fine control and a notched mouse gets a useful step;
  // capped because some devices report a whole page of deltaY per notch.
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const step = O.clamp(e.deltaY, -120, 120) / 120;
      set({ dropletZoom: O.clamp(state.dropletZoom * Math.pow(1.35, step), ...ZOOM_RANGE) });
    },
    { passive: false }
  );

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
