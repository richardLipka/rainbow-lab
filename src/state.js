/**
 * state.js -- one observable store for the whole application.
 * Views subscribe; nothing reads the DOM to find out what is going on.
 */
import { makeIndexModel, materialById } from './optics.js';

const listeners = new Set();

export const state = {
  /* shell */
  lang: 'cs',
  mode: 'tutorial', // 'tutorial' | 'free'
  step: 0,
  scene: 'droplet', // 'droplet' | 'drops' | 'field' | 'sky'
  graph: 'exit', // 'exit' | 'dist'

  /* Whether the plots at the bottom of the page are open. Closed by default:
     they are the evidence behind the scenes above, not the way in, and a
     reader who meets them before the droplet has no idea what the axes mean.
     Tutorial steps that actually talk about a plot open it themselves. */
  graphOpen: false,
  panel: 'guide', // 'guide' | 'ray' | 'math' | 'quiz'

  /* light */
  wavelength: 'white', // 'white' or a number in nm
  dispersion: 1,

  /* droplet & optics */
  impact: 0.861, // b/R
  reflections: 1,
  /* What the drop is made of. Water is the whole point of the app; the other
     presets exist so "would a drop of something else still make a bow, and
     where?" is a question the reader can answer by trying it rather than by
     being told. See MATERIALS in optics.js. */
  material: 'water',
  indexScale: 1,

  /* how far (in droplet radii) the observer is drawn from the droplet in the
     single-droplet scene -- 1 matches the original close-up framing; turning
     this up draws the droplet smaller and the rays longer, so a dispersed
     fan of colour becomes visible on its way to the eye. */
  dropletZoom: 1,

  /* rays */
  showNonRainbow: false,
  /* Which orders are traced. Written only by the reflections selector, which
     is cumulative: picking k shows every order up to k, because the angles
     are only worth anything next to each other. */
  families: { 0: false, 1: true, 2: false, 3: false },
  /* How many parallel rays cross the droplet face, rim to rim.
     0 draws the single ray at state.impact and nothing else, which is where
     the scene starts: one beam, one path, every wall it meets labelled.

     Turn it up and the beam covers the whole face the way sunlight does, b
     running from -1 to +1, and the exits bunch up at the bow angle. That
     bunching IS the bow and no single ray can show it -- but it is the second
     thing to look at, not the first. */
  fanCount: 0,

  /* graph */
  angleMode: 'antisolar', // 'antisolar' | 'scattering' | 'deviation'
  distRays: 60,
  distAccumulate: false,

  /* many droplets */
  dropCount: 1,
  dropsAnimate: false,

  /* How many droplets fill the three-dimensional rain volume. Large by
     default: the whole point of that scene is that the bow is not drawn, it
     is however many droplets happened to answer yes, and a thin field looks
     like scattered dots rather than an arc. */
  fieldCount: 60000,

  /* Where the observer stands inside the rain, in the same world units the
     droplet field uses: +x points away from the Sun (deeper into the rain),
     +y is up. Moving it re-tests every droplet at its new angle, so a
     completely different set of droplets delivers the bow -- which is the
     one thing that scene exists to demonstrate. */
  dropsObserverX: 0,
  dropsObserverY: 0,

  /* sky / observer */
  sunElevation: 15,
  /* How high the optional airborne observer is flying, in metres. */
  airHeight: 3000,
  sunAzimuth: 180,
  observerHeight: 1.7,
  view: 'orbit', // 'orbit' | 'eye'
  camYaw: -35,
  camPitch: 14,
  camDist: 3.1,
  eyeAzimuth: 0, // relative to the antisolar azimuth
  eyeElevation: 12,
  fov: 75,

  /* visualisation toggles */
  show: {
    normals: false,
    /* Show, on the same bow, the part of the circle an observer flying above
       the shower would see and this one cannot. Off by default: it is a
       second observer on a scene built around one. */
    airObserver: false,
    /* The exit-direction density arc around the droplet. Worth having on
       whenever a beam is running, but the very first step is about two bows
       and two eyes and nothing else, so it can be asked to stand down. */
    arrival: true,
    /* One observer standing where the bow rays actually cross, instead of one
       eye per order placed along its own direction.

       Two eyes answer "where would you have to stand for THIS bow"; they do
       not answer "can one person see both". From a single droplet the two bow
       rays leave different points in different directions, so they meet at
       exactly one place -- 12.2 droplet radii out, which on a 1 mm drop is
       12 mm. That is the honest answer, and it is also why the sky does not
       work that way: nobody's eye is a centimetre from a raindrop, so up
       there the two bows come from two different sets of droplets. */
    meetingEye: false,
    /* Mark what happens at each surface the ray meets: how much goes through
       and how much reflects on. On by default, because the thing it settles
       is a misconception most explanations repeat -- that the bounces inside
       a raindrop are TOTAL internal reflection. They are not, and cannot be. */
    walls: true,
    angles: true,
    labels: true,
    wavelengthLabels: false,
    droplets: true,
    cone: true,
    antisolar: true,
    horizon: true,
    ground: true,
    renderedBow: false,
    alexander: true,
    primary: true,
    secondary: false,
    higher: false,
    sky: true,
    rainBelow: false,
  },

  /* selection */
  selectedRay: null,

  /* The point on a bow the reader has clicked in the 3-D sky, as
     {k, lambda, roll}: a reflection order, a wavelength, and an angle around
     the antisolar axis. Held as a roll rather than a direction so the pick
     stays ON the bow when the Sun moves or the index model changes -- the
     direction is recomputed from the engine every frame. */
  skyPick: null,

  /* The droplet clicked in the 3-D field, as world coordinates. Held as a
     position rather than an index for the same reason selectedDrop is: the
     field is regenerated whenever the count changes. */
  fieldPick: null,

  /* The droplet the reader has clicked on in the many-droplets scene, as
     world coordinates ({x, y}), or null. Held as a position rather than an
     index because the droplet field is regenerated whenever the count or the
     spread changes; dropsView re-validates it against the field. */
  selectedDrop: null,
};

/**
 * Which fields describe what is ON SCREEN, as opposed to who is reading
 * (language), how (tutorial or free), where in the tour, and which scene.
 *
 * Captured from the literal above rather than written out a second time, so
 * the default value of anything lives in exactly one place. Both the Reset
 * button and every tutorial step start from this.
 */
const RESET_KEYS = [
  'graph', 'graphOpen', 'wavelength', 'dispersion', 'impact', 'reflections',
  'material', 'indexScale', 'dropletZoom', 'showNonRainbow', 'families',
  'fanCount', 'angleMode', 'distRays', 'distAccumulate', 'dropCount',
  'dropsAnimate', 'fieldCount', 'dropsObserverX', 'dropsObserverY',
  'sunElevation', 'sunAzimuth', 'airHeight', 'observerHeight', 'view',
  'camYaw', 'camPitch', 'camDist', 'eyeAzimuth', 'eyeElevation', 'fov',
  'show', 'selectedRay', 'skyPick', 'fieldPick', 'selectedDrop',
];

const DEFAULTS = Object.freeze(
  Object.fromEntries(RESET_KEYS.map((k) => [
    k,
    state[k] && typeof state[k] === 'object' ? Object.freeze({ ...state[k] }) : state[k],
  ]))
);

/**
 * A fresh patch back to the defaults.
 *
 * Returned as a new object every time because set() merges `show` and
 * `families` with Object.assign -- handing out the stored one would let a
 * later set() write straight into the defaults.
 */
export function resetPatch() {
  return { ...DEFAULTS, show: { ...DEFAULTS.show }, families: { ...DEFAULTS.families } };
}

/** Wavelengths currently in play: one, or all six for white light. */
export function activeLambdas() {
  if (state.wavelength === 'white') return [650, 610, 580, 540, 480, 420];
  return [state.wavelength];
}

/** The refractive-index model implied by the current controls. */
export function indexModel() {
  const m = materialById(state.material);
  return makeIndexModel({
    mode: m.mode,
    cauchy: m.cauchy,
    dispersion: state.dispersion,
    scale: state.indexScale,
  });
}

/**
 * Which reflection orders should be traced right now.
 *
 * One rule, used identically in both modes -- this used to branch on
 * state.mode and read a DIFFERENT control in each branch (state.reflections
 * in tutorial mode, state.families in free mode), which meant whichever
 * control the current mode ignored looked broken: it updated its own state
 * and its checkbox/highlight, but never touched the scene. families[3]
 * stands for "3 or more"; the exact bounce count traced for it follows
 * state.reflections when the user picked something >= 3, so a solo pick of
 * "4" via the segmented control still traces exactly 4 bounces.
 */
export function activeOrders() {
  const out = [];
  if (state.families[0]) out.push(0);
  if (state.families[1]) out.push(1);
  if (state.families[2]) out.push(2);
  // The "3+" checkbox means every order from three up to whatever the
  // reflections control is showing -- not just the highest one. Pushing only
  // max(3, reflections) skipped the tertiary whenever the control sat on 4.
  if (state.families[3]) {
    for (let k = 3; k <= Math.max(3, state.reflections); k++) out.push(k);
  }
  if (state.showNonRainbow && !out.includes(0)) out.push(0);
  if (!out.length) out.push(state.reflections);
  return [...new Set(out)].sort((a, b) => a - b);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Coalesce a burst of set() calls into one DOM sync per frame, aligned to
 * requestAnimationFrame in the normal case. rAF is also backed by a short
 * timer: if rAF is ever starved for longer than a user would tolerate (a
 * throttled/backgrounded tab, or an embedding context that skips painting
 * altogether), the `queued` guard below would otherwise latch permanently
 * true and silently stop every future state change from reaching the DOM,
 * since nothing else ever resets it. Whichever fires first wins; `fired`
 * stops the other from double-flushing.
 */
let queued = false;
export function notify() {
  if (queued) return;
  queued = true;
  let fired = false;
  const flush = () => {
    if (fired) return;
    fired = true;
    queued = false;
    for (const fn of listeners) fn(state);
  };
  requestAnimationFrame(flush);
  setTimeout(flush, 32);
}

/** Shallow-merge a patch into the state and notify. Nested `show` is merged. */
export function set(patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'show' || k === 'families') Object.assign(state[k], v);
    else state[k] = v;
  }
  notify();
}
