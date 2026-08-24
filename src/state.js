/**
 * state.js -- one observable store for the whole application.
 * Views subscribe; nothing reads the DOM to find out what is going on.
 */
import { makeIndexModel } from './optics.js';

const listeners = new Set();

export const state = {
  /* shell */
  lang: 'cs',
  mode: 'tutorial', // 'tutorial' | 'free'
  step: 0,
  scene: 'droplet', // 'droplet' | 'drops' | 'sky'
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
  dropletRadiusMm: 1.0,
  indexMode: 'table',
  indexScale: 1,

  /* how far (in droplet radii) the observer is drawn from the droplet in the
     single-droplet scene -- 1 matches the original close-up framing; turning
     this up draws the droplet smaller and the rays longer, so a dispersed
     fan of colour becomes visible on its way to the eye. */
  dropletZoom: 1,

  /* Where the single-droplet observer's eye sits.
     'auto'   -- one eye per active reflection family, each exactly along its
                 own rainbow direction (the app tells you where to stand).
     'manual' -- one eye at state.observerPhi, so the angle is the thing the
                 user steers and ~42 deg is something they find rather than
                 something they are shown. In manual mode a ray is emphasised
                 when it really does point at THAT eye, so the emphasis is a
                 geometric consequence of where the eye is, not a label. */
  observerMode: 'auto', // 'auto' | 'manual'
  observerPhi: 42.4, // antisolar angle (deg) of the manually placed eye

  /* rays */
  showNonRainbow: false,
  families: { 0: false, 1: true, 2: false, 3: false },
  fanCount: 0, // 0 = a single ray

  /* graph */
  angleMode: 'antisolar', // 'antisolar' | 'scattering' | 'deviation'
  distRays: 60,
  distAccumulate: false,

  /* many droplets */
  dropCount: 1,
  dropsAnimate: false,

  /* Where the observer stands inside the rain, in the same world units the
     droplet field uses: +x points away from the Sun (deeper into the rain),
     +y is up. Moving it re-tests every droplet at its new angle, so a
     completely different set of droplets delivers the bow -- which is the
     one thing that scene exists to demonstrate. */
  dropsObserverX: 0,
  dropsObserverY: 0,

  /* sky / observer */
  sunElevation: 15,
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

  /* The droplet the reader has clicked on in the many-droplets scene, as
     world coordinates ({x, y}), or null. Held as a position rather than an
     index because the droplet field is regenerated whenever the count or the
     spread changes; dropsView re-validates it against the field. */
  selectedDrop: null,
};

/** Wavelengths currently in play: one, or all six for white light. */
export function activeLambdas() {
  if (state.wavelength === 'white') return [650, 610, 580, 540, 480, 420];
  return [state.wavelength];
}

/** The refractive-index model implied by the current controls. */
export function indexModel() {
  return makeIndexModel({
    mode: state.indexMode,
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
  if (state.families[3]) out.push(Math.max(3, state.reflections));
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
