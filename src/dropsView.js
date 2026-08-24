/**
 * dropsView.js -- Mode B: from one droplet to thousands.
 *
 * A vertical cross-section through the observer, containing the antisolar
 * direction and the vertical. Each droplet is tested for one thing only:
 * does the observer see it at the angle phi at which that droplet sends out
 * its concentrated light? Distance never enters the test -- which is exactly
 * the point the brief asks us to make.
 */
import * as O from './optics.js';
import { state, set, indexModel } from './state.js';
import { t, num, deg } from './i18n.js';
import { fitCanvas, strokePath, label, capture, arrowHead, angleArc } from './ui.js';
import {
  colorFor, bowBands, colorAtPhi, dropReport, antisolarAxis, BOW_MATCH_DEG,
} from './rays.js';

const SMALL_FONT = '10px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';

const MAX_DRAWN_RAYS = 34;
const MAX_DRAWN_GREY_RAYS = 16;

/** Screen distance at which a click counts as landing on a droplet. */
const PICK_RADIUS = 14;

/**
 * How far the observer may wander, in world units. Shared with app.js so the
 * sliders and the drag clamp cannot disagree.
 *
 * The downward range is deliberately small: the ground is a fixed plane in
 * this cross-section, and its shallowest setting sits 0.128 world units below
 * the origin, so anything lower would put the observer underground. Up is the
 * interesting direction anyway -- rising is what puts rain below eye level.
 */
export const OBS_RANGE = { x: [-0.28, 0.72], y: [-0.1, 0.3] };

/** p offset by k world units along the unit direction d. */
const off = (p, d, k) => ({ x: p.x + d.x * k, y: p.y + d.y * k });

/** A world direction as a screen direction. P() flips y and scales uniformly. */
const SD = (v) => ({ x: v.x, y: -v.y });

const dot = (a, b) => a.x * b.x + a.y * b.y;

/**
 * The two directions, in this cross-section, into which a droplet sends its
 * concentrated light for a bow at antisolar angle phi.
 *
 * The outgoing ray makes the scattering angle Theta = 180 - phi with the
 * direction the sunlight was already travelling in, and the droplet is a
 * sphere, so in three dimensions this is a cone; a cross-section cuts it in
 * two rays, one either side of the axis. Both are drawn, because both are
 * real -- it is why droplets above AND below the antisolar line light up.
 */
function exitDirs(anti, phiDeg) {
  const theta = (180 - phiDeg) * O.RAD;
  return [rotate(anti, theta), rotate(anti, -theta)];
}

export function createDropsView(canvas) {
  let drops = [];
  let seedKey = '';
  let layout = null;
  let grabbing = false; // pointer is over (or holding) the observer handle

  function makeKey() {
    return `${state.dropCount}|${state.show.rainBelow}`;
  }

  function regenerate() {
    const target = state.dropCount;
    if (drops.length > target) drops.length = target;
    while (drops.length < target) {
      // spread in depth and height; log-ish depth so near and far are both seen
      const depth = 0.12 + Math.pow(Math.random(), 0.6) * 0.88;
      const spread = state.show.rainBelow ? 1 : 0.62;
      const height = (Math.random() * 2 - 1) * spread;
      drops.push({ x: depth, y: height * depth * 1.25 });
    }
    seedKey = makeKey();
    validateSelection();
  }

  /**
   * Drop a selection whose droplet the field no longer contains. Turning the
   * count down truncates the array, so the selected droplet can simply cease
   * to exist; leaving the marker behind would put an inspector on a piece of
   * empty sky.
   */
  function validateSelection() {
    const sel = state.selectedDrop;
    if (!sel) return;
    const still = drops.some((d) => Math.abs(d.x - sel.x) < 1e-9 && Math.abs(d.y - sel.y) < 1e-9);
    if (!still) set({ selectedDrop: null });
  }

  /** Bow bands the FIELD is currently highlighting, from the engine. */
  function bands(idx) {
    const orders = [];
    if (state.show.primary) orders.push(1);
    if (state.show.secondary) orders.push(2);
    return bowBands(idx, orders);
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    if (seedKey !== makeKey()) regenerate();

    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#070a12');
    g.addColorStop(1, '#0c1120');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const ox = w * 0.1;
    const oy = h * 0.52;
    const s = Math.min(w * 0.82, h * 1.25);
    // Where the observer is STANDING, in the same world units the droplet
    // field uses. The rain does not move; the observer does. Every droplet is
    // re-tested at its new angle, so moving here hands the bow to a
    // completely different set of droplets -- which is the one thing this
    // scene exists to show, and something a fixed observer could only assert
    // in a caption.
    const obs = { x: state.dropsObserverX, y: state.dropsObserverY };
    layout = { ox, oy, s, obs };
    const P = (p) => ({ x: ox + p.x * s, y: oy - p.y * s });
    const o = P(obs);

    const anti = antisolarAxis();
    const sun = { x: -anti.x, y: -anti.y };
    const idx = indexModel();
    const bs = bands(idx);
    const sel = state.selectedDrop;

    // The sun-antisolar axis: sunlight is parallel at this distance, so this
    // ONE line, running the full width of the scene through the observer, is
    // literally the direction every ray of incoming light travels along. It
    // also makes the Sun's position explicit rather than leaving it floating
    // near the observer with no visible connection to anything.
    strokePath(ctx, [P(off(obs, sun, 1.4)), P(off(obs, anti, 1.4))],
      'rgba(255,225,160,0.28)', 1, [5, 5]);
    if (state.show.labels) {
      // Pulled back onto the canvas when the antisolar direction runs off the
      // right edge -- which it does at every observer position, since the
      // droplet field already fills that side. The dashed axis carries the
      // true direction; the label only has to name what is out there.
      const e = P(off(obs, anti, 1.2));
      const ex = Math.min(e.x, w - 12);
      label(ctx, t('antisolarPoint'), ex, e.y - 12, {
        align: ex < e.x ? 'right' : 'center', color: '#9fb4d8',
      });
    }

    // the two directions that can deliver bow light, in this cross-section
    for (const band of bs) {
      for (const sign of [1, -1]) {
        for (const edge of [band.lo, band.hi]) {
          const dir = rotate(anti, sign * edge * O.RAD);
          strokePath(ctx, [o, P(off(obs, dir, 1.35))],
            band.k === 1 ? 'rgba(111,211,164,0.22)' : 'rgba(155,140,240,0.2)', 1,
            band.k === 1 ? [3, 4] : [2, 5]);
        }
      }
    }

    // ground
    if (state.show.ground) {
      const gy = groundY();
      const yy = P({ x: 0, y: gy }).y;
      const gg = ctx.createLinearGradient(0, yy, 0, h);
      gg.addColorStop(0, 'rgba(30,45,35,0.85)');
      gg.addColorStop(1, 'rgba(12,18,16,0.95)');
      ctx.fillStyle = gg;
      ctx.fillRect(0, yy, w, h - yy);
      strokePath(ctx, [{ x: 0, y: yy }, { x: w, y: yy }], 'rgba(120,170,140,0.45)', 1.2);
      if (state.show.labels) label(ctx, t('horizon'), w - 12, yy - 12, { align: 'right', color: '#9ec9ab' });
    }

    // Every droplet in the field concentrates light into the SAME two
    // directions: the sunlight is parallel, the droplets are identical
    // spheres, so nothing distinguishes them but where they happen to sit.
    // Which is the whole point -- a droplet is lit for this observer only if
    // one of those two fixed directions happens to end at their eye.
    const geo1 = O.rainbowGeometry(idx(650), 1);
    const greyDirs = geo1 ? exitDirs(anti, geo1.antisolarDeg) : null;

    // droplets. The non-contributing ones are by far the most numerous, so
    // they go into a single path and a single fill() -- one fill per droplet
    // is what makes ten thousand of them slow.
    let contributing = 0;
    let drawnRays = 0;
    let drawnGreyRays = 0;
    const dotR = state.dropCount > 3000 ? 0.7 : state.dropCount > 600 ? 1.1 : state.dropCount > 60 ? 1.8 : 3;
    const greyPath = new Path2D();
    let greyCount = 0;
    ctx.save();
    // With one droplet under inspection the field is context, not the
    // subject: dimmed rather than hidden, so the inspected droplet's rays
    // are still visibly parallel to every other droplet's.
    if (sel) ctx.globalAlpha = 0.4;
    for (const d of drops) {
      // Angles are measured FROM THE OBSERVER, so this is the only place the
      // observer's position enters the physics -- and it is enough to change
      // which droplets qualify.
      const rel = { x: d.x - obs.x, y: d.y - obs.y };
      const len = Math.hypot(rel.x, rel.y);
      if (len < 1e-6) continue;
      const dir = { x: rel.x / len, y: rel.y / len };
      const phi = Math.acos(O.clamp(dot(dir, anti), -1, 1)) * O.DEG;
      const hitc = colorAtPhi(phi, bs);
      const q = P(d);
      if (q.x < -20 || q.x > w + 20 || q.y < -20 || q.y > h + 20) continue;

      if (hitc) {
        contributing++;
        ctx.fillStyle = colorFor(hitc.lambda, 0.95);
        ctx.beginPath();
        ctx.arc(q.x, q.y, dotR + 1.2, 0, Math.PI * 2);
        ctx.fill();
        if (drawnRays < MAX_DRAWN_RAYS && state.show.droplets) {
          drawnRays++;
          // incoming sunlight
          strokePath(ctx, [P(off(d, sun, 0.22)), q], 'rgba(255,246,214,0.5)', 1);
          // the ray that actually reaches the eye -- dashed for the
          // secondary bow (k=2), solid for the primary (k=1), the same
          // convention used everywhere else in the app for the two orders
          strokePath(ctx, [q, o], colorFor(hitc.lambda, 0.6), 1,
            hitc.k === 2 ? [4, 3] : null);
        }
      } else if (state.show.droplets) {
        greyPath.moveTo(q.x + dotR, q.y);
        greyPath.arc(q.x, q.y, dotR, 0, Math.PI * 2);
        greyCount++;
        // A sample of the grey droplets get the same treatment as the
        // coloured ones: sunlight really does reach every droplet, and every
        // droplet really does concentrate it into a bow -- it is only the
        // DIRECTION that fails to line up with this particular observer's
        // eye. Both exit directions come out of rainbowGeometry, so they are
        // exactly parallel to the rays the lit droplets send to the eye, and
        // the picture makes its own argument: the light is not missing, it
        // is aimed somewhere else.
        if (drawnGreyRays < MAX_DRAWN_GREY_RAYS && len > 0.12 && greyDirs) {
          drawnGreyRays++;
          strokePath(ctx, [P(off(d, sun, 0.22)), q], 'rgba(255,246,214,0.16)', 1);
          for (const gd of greyDirs) {
            strokePath(ctx, [q, P(off(d, gd, 0.13))], 'rgba(150,175,215,0.3)', 1);
          }
        }
      }
    }
    if (greyCount) {
      ctx.fillStyle = 'rgba(150,175,215,0.24)';
      ctx.fill(greyPath);
    }
    ctx.restore();

    if (sel) drawInspector(ctx, { sel, anti, sun, P, o, w, h, s });

    // observer -- drawn as a grabbable handle, since it is one
    ctx.save();
    ctx.fillStyle = '#e8eefc';
    ctx.beginPath();
    ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,238,252,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(o.x, o.y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (grabbing) {
      ctx.save();
      ctx.strokeStyle = 'rgba(232,238,252,0.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (state.show.labels) label(ctx, t('observerLabel'), o.x, o.y + 22, { align: 'center', color: '#e8eefc' });

    // Sun icon, at a small FIXED pixel distance from the observer in the
    // correct direction -- not scaled by world units. The observer sits
    // close to the left edge (ox is only ~10% of the width, to leave room
    // for droplet depth on the antisolar side), so at low sun elevations the
    // true sun direction points almost straight off the left edge: there is
    // close to zero margin on that side by construction of the layout, so
    // no world-space radius reliably keeps the icon on-canvas. The dashed
    // axis line above is drawn unclamped (harmless off-canvas) and carries
    // the true far-away direction; the icon only needs to sit clearly,
    // legibly, and in the right direction close to the observer, the same
    // way the single-droplet view's own Sun icon is a fixed screen element
    // rather than a geometrically "correct" distance. It is anchored to the
    // observer, so it travels with them -- the Sun stays behind whoever is
    // looking, which is the whole precondition for seeing a bow at all.
    const sunScreenDir = SD(sun);
    const sunMargin = 14;
    let sunDist = 70;
    if (sunScreenDir.x < -1e-6) sunDist = Math.min(sunDist, (o.x - sunMargin) / -sunScreenDir.x);
    if (sunScreenDir.x > 1e-6) sunDist = Math.min(sunDist, (w - o.x - sunMargin) / sunScreenDir.x);
    if (sunScreenDir.y < -1e-6) sunDist = Math.min(sunDist, (o.y - sunMargin) / -sunScreenDir.y);
    if (sunScreenDir.y > 1e-6) sunDist = Math.min(sunDist, (h - o.y - sunMargin) / sunScreenDir.y);
    sunDist = Math.max(24, sunDist);
    const sp = { x: o.x + sunScreenDir.x * sunDist, y: o.y + sunScreenDir.y * sunDist };
    const sg = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, 26);
    sg.addColorStop(0, 'rgba(255,238,180,0.9)');
    sg.addColorStop(1, 'rgba(255,210,90,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
    ctx.fill();
    if (state.show.labels) {
      // Left-aligned, not centred: the icon sits close to the left edge at
      // most sun elevations (see the clamp above), and a centred label would
      // clip against that edge.
      label(ctx, `${t('sunLabel')} · ${num(state.sunElevation, 0)}°`, Math.max(sp.x - 4, 4), sp.y - 28, {
        align: 'left', color: '#ffe9a8',
      });
    }

    // readout
    label(ctx, `${t('dropCount')}: ${fmt(drops.length)}`, 12, 16, { color: '#cfe0ff' });
    label(ctx, `${t('dropsContributing')}: ${fmt(contributing)}`, 12, 36, { color: '#6fd3a4' });

    // legend: what green vs grey actually means, spelled out next to a
    // sample swatch rather than left for the hint text alone to carry
    if (state.show.labels) {
      const swatch = (x, y, color) => {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      };
      swatch(16, 58, '#6fd3a4');
      label(ctx, t('dropsLegendReaches'), 26, 58, {
        align: 'left', color: '#9fd8bd', bg: false, font: SMALL_FONT,
      });
      swatch(16, 74, 'rgba(150,175,215,0.7)');
      label(ctx, t('dropsLegendMisses'), 26, 74, {
        align: 'left', color: '#8ea3c6', bg: false, font: SMALL_FONT,
      });

      label(ctx, t('dropsHint'), 12, h - 62, { color: '#8ea3c6', font: SMALL_FONT });
      label(ctx, t('dropsSunHint'), 12, h - 46, { color: '#e0a83f', font: SMALL_FONT });
      label(ctx, t('dropsMoveHint'), 12, h - 30, { color: '#9fd8bd', font: SMALL_FONT });
      label(ctx, t(sel ? 'dropsClearHint' : 'dropsClickHint'), 12, h - 14, {
        color: '#cfa9e8', font: SMALL_FONT,
      });
    }
  }

  /* --------------------------------------------------------- inspector -- */

  /**
   * Everything one droplet does with the sunlight that hits it.
   *
   * The field answers "which droplets reach this observer"; this answers
   * "why that one, and where does the rest of its light go" -- for every
   * order in DROP_ORDERS, not just the one the field is highlighting.
   * Nothing here is positioned by hand: each exit direction is
   * rainbowGeometry's own scattering angle rotated off the incoming
   * sunlight, so the ray that lands in the eye lands there because the
   * numbers put it there.
   */
  function drawInspector(ctx, v) {
    const { sel, anti, sun, P, o, w, h, s } = v;
    const { dir, phiSeen, bands, hit } = dropReport(sel);
    if (!dir) return;
    const toEye = { x: -dir.x, y: -dir.y };
    const q = P(sel);
    const maxLen = Math.min(s * 0.45, 300);
    // The hint stack owns the bottom of the canvas; a caption placed by the
    // optics will otherwise sit on top of it, which this project has now had
    // to fix twice in two different views.
    const bottom = h - (state.show.labels ? 74 : 10);
    // Arc radii follow how far apart the eye and the droplet actually are on
    // screen. At full canvas width they need room to read; for a droplet a
    // few pixels from the eye, two fixed-radius arcs land on top of each
    // other and on the observer's own label.
    const gap = Math.hypot(q.x - o.x, q.y - o.y);

    // the incoming sunlight, drawn back towards the Sun until it leaves the
    // canvas -- parallel light, so this segment is a copy of the dashed axis
    const sd = SD(sun);
    const inLen = Math.min(edgeDist(q, sd, w, h), maxLen);
    if (inLen > 12) {
      const from = { x: q.x + sd.x * inLen, y: q.y + sd.y * inLen };
      strokePath(ctx, [from, q], 'rgba(255,242,196,0.9)', 1.6);
      arrowHead(ctx, from, q, 'rgba(255,242,196,0.95)', 7);
      if (state.show.labels) {
        tip(ctx, t('dropIncoming'), from.x - sd.x * 4, from.y - sd.y * 4 - 12, w, h, {
          color: '#ffe9a8', bottom,
        });
      }
    }

    for (const band of bands) {
      const ref = band.angles.find((a) => a.lambda === 650) || band.angles[0];
      const refDirs = exitDirs(anti, ref.phi);
      // Which of the two cross-section rays points at the observer's side of
      // the axis. Both are drawn; only this one can ever end in the eye.
      const nearSide = dot(refDirs[0], toEye) >= dot(refDirs[1], toEye) ? 0 : 1;

      for (const a of band.angles) {
        const dirs = exitDirs(anti, a.phi);
        const reaches = Math.abs(phiSeen - a.phi) <= BOW_MATCH_DEG;
        for (let i = 0; i < 2; i++) {
          const away = i !== nearSide;
          const sdir = SD(dirs[i]);
          if (reaches && !away) {
            // drawn to the eye itself, not to a nominal length: the whole
            // claim is that this ray ends there
            strokePath(ctx, [q, o], colorFor(a.lambda, 0.95), 1.8);
            continue;
          }
          const L = Math.min(edgeDist(q, sdir, w, h), maxLen);
          if (L < 6) continue;
          strokePath(ctx, [q, { x: q.x + sdir.x * L, y: q.y + sdir.y * L }],
            colorFor(a.lambda, away ? 0.3 : 0.55, away ? 0.7 : 0.45), 1,
            away ? [3, 4] : null);
        }
      }

      if (state.show.labels) {
        const sdir = SD(refDirs[nearSide]);
        const L = Math.min(edgeDist(q, sdir, w, h), maxLen);
        tip(ctx, `k=${band.k} · φ ${deg(ref.phi, 1)}`,
          q.x + sdir.x * (L - 18), q.y + sdir.y * (L - 18), w, h,
          { color: hit && hit.k === band.k ? '#ffdca0' : '#9fb4d8', bottom });
      }
    }

    // The two angles, each drawn where it is actually measured. Theta is the
    // turn the droplet puts into the light, so it belongs at the droplet;
    // phi is how far from the antisolar point the OBSERVER has to look, so
    // it belongs at the eye. Drawing either one at the other's vertex is the
    // mistake this project has already had to fix once.
    if (state.show.angles) {
      const antiAng = Math.atan2(SD(anti).y, SD(anti).x);
      const band = hit || bands[0];
      if (band) {
        const ref = band.angles.find((a) => a.lambda === 650) || band.angles[0];
        const dirs = exitDirs(anti, ref.phi);
        const nearSide = dot(dirs[0], toEye) >= dot(dirs[1], toEye) ? 0 : 1;
        const exitAng = Math.atan2(SD(dirs[nearSide]).y, SD(dirs[nearSide]).x);
        arcBetween(ctx, q.x, q.y, O.clamp(gap * 0.26, 16, 34), antiAng, exitAng,
          'rgba(224,168,63,0.85)', `Θ ${deg(180 - ref.phi, 1)}`);
      }
      const losAng = Math.atan2(SD(dir).y, SD(dir).x);
      arcBetween(ctx, o.x, o.y, O.clamp(gap * 0.42, 24, 46), antiAng, losAng,
        hit ? 'rgba(224,168,63,0.95)' : 'rgba(143,164,200,0.8)', `φ ${deg(phiSeen, 1)}`);
    }

    // the droplet itself, and the verdict
    ctx.save();
    ctx.strokeStyle = hit ? colorFor(hit.nearest.lambda, 0.95) : 'rgba(207,169,232,0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(q.x, q.y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(q.x, q.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (state.show.labels) {
      const text = hit
        ? t('dropHits', { angle: deg(phiSeen, 1) })
        : t('dropMisses', { angle: deg(phiSeen, 1) });
      tip(ctx, text, q.x, q.y + 26, w, h, { color: hit ? '#ffdca0' : '#cfa9e8', bottom });
    }
  }

  function groundY() {
    // Observer height in metres, mapped onto the scene purely for legibility.
    // Anchored in WORLD coordinates, not to the observer: tying it to the
    // observer made the ground ride upwards with them, which buried the very
    // thing rising is supposed to reveal -- rain below eye level. The ground
    // is a fixed plane and the observer moves relative to it, which is also
    // why OBS_RANGE cannot let them descend past it.
    const hm = state.observerHeight;
    return -Math.min(0.55, 0.06 + Math.log10(1 + hm) * 0.16);
  }

  function fmt(n) {
    return n >= 1000 ? `${num(n / 1000, n >= 10000 ? 0 : 1)}k` : String(n);
  }

  /** Grow the droplet field towards the target while animating. */
  function tick() {
    if (state.scene !== 'drops' || !state.dropsAnimate) return false;
    if (drops.length >= state.dropCount) return false;
    const add = Math.max(1, Math.ceil(drops.length * 0.25));
    const target = Math.min(state.dropCount, drops.length + add);
    while (drops.length < target) {
      const depth = 0.12 + Math.pow(Math.random(), 0.6) * 0.88;
      const spread = state.show.rainBelow ? 1 : 0.62;
      drops.push({ x: depth, y: (Math.random() * 2 - 1) * spread * depth * 1.25 });
    }
    seedKey = makeKey();
    return true;
  }

  function reset() {
    drops = [];
    seedKey = '';
    if (state.selectedDrop) set({ selectedDrop: null });
  }

  /* ------------------------------------------------------- interaction -- */

  /** Screen position of a world point, from the last frame's layout. */
  function proj(p) {
    return { x: layout.ox + p.x * layout.s, y: layout.oy - p.y * layout.s };
  }

  function obsScreen() {
    return proj(layout.obs);
  }

  function obsFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      dropsObserverX: O.clamp((e.clientX - rect.left - layout.ox) / layout.s, ...OBS_RANGE.x),
      dropsObserverY: O.clamp((layout.oy - (e.clientY - rect.top)) / layout.s, ...OBS_RANGE.y),
    };
  }

  function near(e, p, r) {
    const rect = canvas.getBoundingClientRect();
    return Math.hypot(e.clientX - rect.left - p.x, e.clientY - rect.top - p.y) < r;
  }

  /** The droplet under the pointer, if any -- nearest wins. */
  function dropUnder(e) {
    if (!layout) return null;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best = null;
    let bestD = PICK_RADIUS;
    for (const d of drops) {
      const q = proj(d);
      const dd = Math.hypot(q.x - px, q.y - py);
      if (dd < bestD) {
        bestD = dd;
        best = d;
      }
    }
    return best;
  }

  // Only the observer glyph is a drag handle -- a click anywhere else stays a
  // plain click. Teleporting the observer to wherever the canvas happened to
  // be tapped would make the readout jump for reasons the user did not ask
  // for, and the sliders in the control column cover precise placement.
  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => {
    if (layout && near(e, obsScreen(), 18)) {
      dragging = true;
      grabbing = true;
      capture(canvas, e);
      return;
    }
    // A click on a droplet is an inspection request; a click on empty sky
    // puts the panel back to the explanation, which is where it was.
    const d = dropUnder(e);
    set(d ? { selectedDrop: { x: d.x, y: d.y }, panel: 'ray' } : { selectedDrop: null, panel: 'guide' });
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!layout) return;
    if (dragging) {
      set(obsFromEvent(e));
      return;
    }
    const over = near(e, obsScreen(), 18);
    if (over !== grabbing) {
      grabbing = over;
      draw();
    }
    canvas.style.cursor = over ? 'grab' : dropUnder(e) ? 'pointer' : 'default';
  });
  const stopDrag = () => {
    dragging = false;
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);

  return { draw, tick, reset };
}

function rotate(v, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/** Distance from p to the canvas edge along the unit screen direction d. */
function edgeDist(p, d, w, h) {
  let best = Infinity;
  if (d.x > 1e-6) best = Math.min(best, (w - p.x) / d.x);
  if (d.x < -1e-6) best = Math.min(best, -p.x / d.x);
  if (d.y > 1e-6) best = Math.min(best, (h - p.y) / d.y);
  if (d.y < -1e-6) best = Math.min(best, -p.y / d.y);
  return Number.isFinite(best) ? Math.max(0, best) : 0;
}

/**
 * The arc between two screen angles, taking the short way round so the sweep
 * always shows the angle actually being named.
 */
function arcBetween(ctx, cx, cy, r, a0, a1, color, text) {
  let delta = (a1 - a0) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  angleArc(ctx, cx, cy, r, a0, a0 + delta, color, text);
}

/**
 * A centred caption clamped onto the canvas. Everything the inspector labels
 * is placed by the optics, so any of these can land past an edge -- which is
 * a class of bug this project has already shipped twice.
 */
function tip(ctx, text, x, y, w, h, opts = {}) {
  ctx.save();
  ctx.font = opts.font || SMALL_FONT;
  const half = ctx.measureText(text).width / 2 + 6;
  ctx.restore();
  const bottom = opts.bottom ?? h - 10;
  label(ctx, text, O.clamp(x, half + 2, Math.max(half + 2, w - half - 2)),
    O.clamp(y, 10, Math.max(10, bottom)), { align: 'center', font: SMALL_FONT, ...opts });
}
