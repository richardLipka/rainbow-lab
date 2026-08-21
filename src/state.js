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

/** Which reflection orders should be traced right now. */
export function activeOrders() {
  if (state.mode === 'tutorial') {
    const orders = [state.reflections];
    if (state.showNonRainbow && !orders.includes(0)) orders.push(0);
    return orders.sort();
  }
  const out = [];
  for (const k of [0, 1, 2, 3]) if (state.families[k]) out.push(k);
  if (!out.length) out.push(state.reflections);
  return out;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let queued = false;
export function notify() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    for (const fn of listeners) fn(state);
  });
}

/** Shallow-merge a patch into the state and notify. Nested `show` is merged. */
export function set(patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'show' || k === 'families') Object.assign(state[k], v);
    else state[k] = v;
  }
  notify();
}
