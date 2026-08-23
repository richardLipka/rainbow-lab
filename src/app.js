/**
 * app.js -- assembly. Builds the shell, the control column and the render
 * loop, and keeps the four views in step with the store.
 */
import * as O from './optics.js';
import { t, setLang, getLang, num, deg, LANGS } from './i18n.js';
import { state, set, subscribe, indexModel } from './state.js';
import { el, clear, group, slider, toggle, segmented, select, collectSyncers } from './ui.js';
import { createDropletView } from './dropletView.js';
import { createGraphView } from './graphView.js';
import { createDropsView } from './dropsView.js';
import { createSkyView } from './skyView.js';
import { renderPanel, applyStep, TUTORIAL } from './panels.js';

/* ------------------------------------------------------------ shell DOM -- */

const root = document.getElementById('app');

const sceneCanvases = {
  droplet: el('canvas', { class: 'scene-canvas' }),
  drops: el('canvas', { class: 'scene-canvas' }),
  sky: el('canvas', { class: 'scene-canvas' }),
};
const graphCanvas = el('canvas', { class: 'graph-canvas' });

const controlsEl = el('div', { class: 'controls' });
const panelEl = el('div', { class: 'panel' });
const headerEl = el('header', { class: 'app-header' });
const sceneTabsEl = el('div', { class: 'scene-tabs' });
const sceneDescEl = el('p', { class: 'scene-desc' });
const graphTabsEl = el('div', { class: 'graph-tabs' });

root.append(
  headerEl,
  el(
    'main',
    { class: 'layout' },
    el('aside', { class: 'col col-controls' }, el('h2', { class: 'col-title' }, t('controls')), controlsEl),
    el(
      'section',
      { class: 'col col-scene' },
      sceneTabsEl,
      sceneDescEl,
      el('div', { class: 'scene-stage' }, sceneCanvases.droplet, sceneCanvases.drops, sceneCanvases.sky)
    ),
    el('aside', { class: 'col col-panel' }, panelEl)
  ),
  el('section', { class: 'graph-wrap' }, graphTabsEl, el('div', { class: 'graph-stage' }, graphCanvas))
);

const views = {
  droplet: createDropletView(sceneCanvases.droplet),
  drops: createDropsView(sceneCanvases.drops),
  sky: createSkyView(sceneCanvases.sky),
};
const graph = createGraphView(graphCanvas);

/* --------------------------------------------------------------- header -- */

function buildHeader() {
  clear(headerEl);
  headerEl.append(
    el(
      'div',
      { class: 'brand' },
      el('h1', {}, t('appTitle')),
      el('span', { class: 'sub' }, t('appSubtitle'))
    ),
    el(
      'div',
      { class: 'header-tools' },
      segmented(
        [
          { value: 'tutorial', labelKey: 'tabTutorial' },
          { value: 'free', labelKey: 'tabFree' },
        ],
        () => state.mode,
        (v) => {
          if (v === 'tutorial') applyStep(state.step);
          set({ mode: v, panel: 'guide' });
          rebuild();
        }
      ),
      el(
        'div',
        { class: 'lang' },
        LANGS.map((l) =>
          el(
            'button',
            {
              type: 'button',
              class: 'seg' + (getLang() === l ? ' active' : ''),
              onclick: () => {
                setLang(l);
                state.lang = l;
                document.documentElement.lang = l;
                rebuild();
              },
            },
            l.toUpperCase()
          )
        )
      )
    )
  );
}

/* --------------------------------------------------------------- scenes -- */

function buildSceneTabs() {
  clear(sceneTabsEl);
  sceneTabsEl.append(
    segmented(
      [
        { value: 'droplet', labelKey: 'sceneDroplet' },
        { value: 'drops', labelKey: 'sceneDrops' },
        { value: 'sky', labelKey: 'sceneSky' },
      ],
      () => state.scene,
      (v) => set({ scene: v })
    )
  );
}

function buildGraphTabs() {
  clear(graphTabsEl);
  graphTabsEl.append(
    segmented(
      [
        { value: 'exit', labelKey: 'graphExitAngle' },
        { value: 'dist', labelKey: 'graphDistribution' },
      ],
      () => state.graph,
      (v) => set({ graph: v })
    ),
    el('span', { class: 'graph-title' },
      state.graph === 'exit' ? t('graphExitAngleTitle') : t('graphDistributionTitle')),
    state.graph === 'exit'
      ? select(
          'angleConvention',
          [
            { value: 'antisolar', labelKey: 'angleAntisolar' },
            { value: 'scattering', labelKey: 'angleScattering' },
            { value: 'deviation', labelKey: 'angleDeviation' },
          ],
          () => state.angleMode,
          (v) => set({ angleMode: v })
        )
      : el(
          'div',
          { class: 'inline-ctl' },
          slider({
            labelKey: 'rayCount',
            min: 0, max: 5, step: 0.05,
            get: () => Math.log10(Math.max(1, state.distRays)),
            format: (v) => fmtCount(Math.round(Math.pow(10, v))),
            onInput: (v) => set({ distRays: Math.round(Math.pow(10, v)) }),
          }),
          toggle('accumulate', () => state.distAccumulate, (v) => set({ distAccumulate: v }))
        ),
    el('span', { class: 'graph-hint' }, t('graphHint'))
  );
}

function fmtCount(c) {
  if (c >= 1000000) return `${num(c / 1000000, 1)}M`;
  if (c >= 1000) return `${num(c / 1000, c >= 10000 ? 0 : 1)}k`;
  return String(c);
}

/* ------------------------------------------------------------- controls -- */

const HEIGHT_STOPS = [1.7, 5, 10, 50, 100, 300, 1000, 3000, 10000];

function buildControls() {
  clear(controlsEl);
  const idx = indexModel();

  /* --- light --- */
  const colorOptions = [
    { value: 'white', labelKey: 'white' },
    ...O.NAMED_COLORS.map((c) => ({
      value: c.lambda,
      labelKey: c.id,
      color: O.rgbCss(c.lambda),
    })),
  ];

  const lightGroup = group(
    'light',
    el('div', { class: 'ctl' },
      el('span', { class: 'ctl-label' }, t('wavelength')),
      segmented(colorOptions, () => state.wavelength, (v) =>
        set({ wavelength: v === 'white' ? 'white' : Number(v), selectedRay: null }), { wrap: true })),
    slider({
      labelKey: 'dispersion', min: 0, max: 1, step: 0.01,
      get: () => state.dispersion,
      format: (v) => `${num(v * 100, 0)} %`,
      onInput: (v) => set({ dispersion: v }),
      hintKey: 'dispersionHint',
    })
  );

  /* --- droplet & optics --- */
  const opticsGroup = group(
    'droplet',
    slider({
      labelKey: 'impactParameter', min: -0.999, max: 0.999, step: 0.001,
      get: () => state.impact,
      format: (v) => num(v, 3),
      onInput: (v) => set({ impact: v }),
    }),
    el('div', { class: 'ctl' },
      el('span', { class: 'ctl-label' }, t('reflections')),
      segmented(
        [0, 1, 2, 3, 4].map((k) => ({ value: k, label: String(k) })),
        () => state.reflections,
        (v) => {
          // Solo-select: picking a value here shows exactly that one family,
          // clearing any others left on from the checkboxes below so this
          // control always visibly drives the scene by itself.
          const k = Number(v);
          set({
            reflections: k,
            families: { 0: k === 0, 1: k === 1, 2: k === 2, 3: k >= 3 },
            selectedRay: null,
          });
        }
      )),
    slider({
      labelKey: 'dropletRadius', min: 0.05, max: 5, step: 0.05,
      get: () => state.dropletRadiusMm,
      format: (v) => `${num(v, 2)} mm`,
      onInput: (v) => set({ dropletRadiusMm: v }),
    }),
    el('small', { class: 'ctl-hint block' }, t('dropletSizeNote')),
    slider({
      labelKey: 'dropletZoom', min: 1, max: 9, step: 0.1,
      get: () => state.dropletZoom,
      format: (v) => `${num(v, 1)}×`,
      onInput: (v) => set({ dropletZoom: v }),
      hintKey: 'dropletZoomHint',
    }),
    select('indexModel',
      [{ value: 'table', labelKey: 'indexTable' }, { value: 'cauchy', labelKey: 'indexCauchy' }],
      () => state.indexMode, (v) => set({ indexMode: v })),
    slider({
      labelKey: 'indexScale', min: 0.85, max: 1.15, step: 0.001,
      get: () => state.indexScale,
      format: (v) => `×${num(v, 3)} → n=${num(idx(650) * 1, 4)}`,
      onInput: (v) => set({ indexScale: v }),
    })
  );

  /* --- rays --- */
  const raysGroup = group(
    'rays',
    toggle('showNonRainbow', () => state.showNonRainbow, (v) => set({ showNonRainbow: v }), { strong: true }),
    el('div', { class: 'ctl' },
      el('span', { class: 'ctl-label' }, t('showFamilies')),
      el('div', { class: 'stack' },
        toggle('family0', () => state.families[0], (v) => set({ families: { 0: v } })),
        toggle('family1', () => state.families[1], (v) => set({ families: { 1: v } })),
        toggle('family2', () => state.families[2], (v) => set({ families: { 2: v } })),
        toggle('family3', () => state.families[3], (v) => set({ families: { 3: v } })))),
    slider({
      labelKey: 'fanCount', min: 0, max: 60, step: 1,
      get: () => state.fanCount,
      format: (v) => (v === 0 ? '1' : String(v)),
      onInput: (v) => set({ fanCount: Math.round(v) }),
    })
  );

  /* --- sun & observer --- */
  const skyGroup = group(
    'sun',
    slider({
      labelKey: 'sunElevation', min: 0, max: 90, step: 0.5,
      get: () => state.sunElevation,
      format: (v) => deg(v, 1),
      onInput: (v) => set({ sunElevation: v }),
    }),
    slider({
      labelKey: 'sunAzimuth', min: 0, max: 360, step: 1,
      get: () => state.sunAzimuth,
      format: (v) => deg(v, 0),
      onInput: (v) => set({ sunAzimuth: v }),
    }),
    slider({
      labelKey: 'observerHeight', min: 0, max: HEIGHT_STOPS.length - 1, step: 0.01,
      get: () => heightToSlider(state.observerHeight),
      format: (v) => `${num(sliderToHeight(v), sliderToHeight(v) < 10 ? 1 : 0)} ${t('metres')}`,
      onInput: (v) => set({ observerHeight: sliderToHeight(v) }),
    }),
    el('small', { class: 'ctl-hint block' }, t('explObserverHeight')),
    el('div', { class: 'ctl' },
      el('span', { class: 'ctl-label' }, t('viewMode')),
      segmented(
        [{ value: 'orbit', labelKey: 'viewOrbit' }, { value: 'eye', labelKey: 'viewEye' }],
        () => state.view,
        (v) => set({ view: v, scene: 'sky' })
      )),
    slider({
      labelKey: 'lookAzimuth', min: -180, max: 180, step: 1,
      get: () => state.eyeAzimuth,
      format: (v) => deg(v, 0),
      onInput: (v) => set({ eyeAzimuth: v }),
    }),
    slider({
      labelKey: 'lookElevation', min: -60, max: 85, step: 1,
      get: () => state.eyeElevation,
      format: (v) => deg(v, 0),
      onInput: (v) => set({ eyeElevation: v }),
    }),
    slider({
      labelKey: 'fieldOfView', min: 25, max: 120, step: 1,
      get: () => state.fov,
      format: (v) => deg(v, 0),
      onInput: (v) => set({ fov: v }),
    }),
    toggle('rainBelow', () => state.show.rainBelow, (v) => set({ show: { rainBelow: v } })),
    el('small', { class: 'ctl-hint block' }, t('fullCircleNote'))
  );

  /* --- droplets scene --- */
  const dropsGroup = group(
    'sceneDrops',
    slider({
      labelKey: 'dropCount', min: 0, max: 4, step: 0.01,
      get: () => Math.log10(Math.max(1, state.dropCount)),
      format: (v) => fmtCount(Math.round(Math.pow(10, v))),
      onInput: (v) => set({ dropCount: Math.round(Math.pow(10, v)) }),
    }),
    toggle('animateDrops', () => state.dropsAnimate, (v) => set({ dropsAnimate: v }))
  );

  /* --- visualisation --- */
  const showToggle = (key, labelKey) =>
    toggle(labelKey, () => state.show[key], (v) => set({ show: { [key]: v } }));

  const visGroup = group(
    'visualization',
    el('div', { class: 'grid2' },
      showToggle('primary', 'showPrimary'),
      showToggle('secondary', 'showSecondary'),
      showToggle('higher', 'showHigherOrder'),
      showToggle('cone', 'showCone'),
      showToggle('antisolar', 'showAntisolar'),
      showToggle('horizon', 'showHorizon'),
      showToggle('ground', 'showGround'),
      showToggle('droplets', 'showDroplets'),
      showToggle('normals', 'showNormals'),
      showToggle('angles', 'showAngles'),
      showToggle('labels', 'showLabels'),
      showToggle('wavelengthLabels', 'showWavelengthLabels'),
      showToggle('alexander', 'showAlexander'),
      showToggle('sky', 'showSky')),
    toggle('showRenderedBow', () => state.show.renderedBow, (v) => set({ show: { renderedBow: v } }), { strong: true }),
    el('small', { class: 'ctl-hint block' }, t('warningNoRender'))
  );

  controlsEl.append(lightGroup, opticsGroup, raysGroup, skyGroup, dropsGroup, visGroup,
    el('button', {
      class: 'btn wide', type: 'button',
      onclick: () => { resetState(); rebuild(); },
    }, t('reset')));

  collectAllSyncers();
}

function heightToSlider(h) {
  let best = 0;
  for (let i = 0; i < HEIGHT_STOPS.length; i++) {
    if (HEIGHT_STOPS[i] <= h) best = i;
  }
  const lo = HEIGHT_STOPS[best];
  const hi = HEIGHT_STOPS[Math.min(best + 1, HEIGHT_STOPS.length - 1)];
  if (hi === lo) return best;
  return best + (Math.log10(h / lo) / Math.log10(hi / lo));
}

function sliderToHeight(v) {
  const i = Math.max(0, Math.min(HEIGHT_STOPS.length - 1, Math.floor(v)));
  const f = v - i;
  const lo = HEIGHT_STOPS[i];
  const hi = HEIGHT_STOPS[Math.min(i + 1, HEIGHT_STOPS.length - 1)];
  return hi === lo ? lo : lo * Math.pow(hi / lo, f);
}

function resetState() {
  set({
    wavelength: 'white', dispersion: 1, impact: 0.861, reflections: 1,
    dropletRadiusMm: 1, dropletZoom: 1, indexMode: 'table', indexScale: 1,
    showNonRainbow: false, fanCount: 0, families: { 0: false, 1: true, 2: false, 3: false },
    angleMode: 'antisolar', distRays: 60, distAccumulate: false,
    dropCount: 1, dropsAnimate: false,
    sunElevation: 15, sunAzimuth: 180, observerHeight: 1.7,
    view: 'orbit', camYaw: -35, camPitch: 14, camDist: 3.1,
    eyeAzimuth: 0, eyeElevation: 12, fov: 75, selectedRay: null,
    show: {
      normals: false, angles: true, labels: true, wavelengthLabels: false,
      droplets: true, cone: true, antisolar: true, horizon: true, ground: true,
      renderedBow: false, alexander: true, primary: true, secondary: false,
      higher: false, sky: true, rainBelow: false,
    },
  });
  graph.reset();
  views.drops.reset();
  views.sky.reset();
}

/* ------------------------------------------------------------- rendering -- */

let syncers = [];

/**
 * Every live control lives in one of these four containers. Re-collecting
 * after any of them is rebuilt keeps `syncers` complete -- the scene tabs
 * were missing from this list before, which is why their active highlight
 * used to freeze after the very first switch away from Tutorial mode.
 */
function collectAllSyncers() {
  syncers = [
    ...collectSyncers(sceneTabsEl),
    ...collectSyncers(controlsEl),
    ...collectSyncers(graphTabsEl),
    ...collectSyncers(panelEl),
  ];
}

function rebuild() {
  buildHeader();
  buildSceneTabs();
  buildGraphTabs();
  buildControls();
  renderPanel(panelEl);
  applyVisibility();
  collectAllSyncers();
  trackedGraph = state.graph;
  trackedPanelKey = panelKey();
}

/**
 * Which canvas is shown. Deliberately unconditional and run on every store
 * notification -- it is three cheap classList/textContent writes, so there is
 * no reason to gate it behind a "did something structural change?" check,
 * and every previous attempt at such a check has hidden a real bug behind it.
 */
function applyVisibility() {
  for (const [name, c] of Object.entries(sceneCanvases)) {
    c.classList.toggle('hidden', name !== state.scene);
  }
  sceneDescEl.textContent = t(
    state.scene === 'droplet' ? 'sceneDropletDesc' : state.scene === 'drops' ? 'sceneDropsDesc' : 'sceneSkyDesc'
  );
  document.body.dataset.scene = state.scene;
}

/** Everything renderPanel()'s output depends on, as one comparable string. */
function panelKey() {
  const liveRay = state.panel === 'ray' || (state.mode === 'tutorial' && TUTORIAL[state.step]?.showRay);
  const rayPart = liveRay
    ? (() => {
        const s = state.selectedRay;
        return `${state.impact.toFixed(4)}|${state.reflections}|${state.wavelength}|${state.dispersion}|${s ? `${s.lambda},${s.k},${s.b.toFixed(4)}` : '-'}`;
      })()
    : '';
  const mathPart =
    state.panel === 'math' ? `${state.reflections}|${state.dispersion}|${state.indexMode}|${state.indexScale}` : '';
  const guidePart =
    state.mode === 'free' && state.panel === 'guide'
      ? `${state.dispersion}|${state.indexMode}|${state.indexScale}|${state.show.renderedBow}`
      : '';
  return `${state.panel}|${state.step}|${rayPart}|${mathPart}|${guidePart}`;
}

let trackedGraph = state.graph;
let trackedPanelKey = panelKey();

subscribe(() => {
  applyVisibility();

  if (state.graph !== trackedGraph) {
    trackedGraph = state.graph;
    buildGraphTabs();
    collectAllSyncers();
  }

  const pk = panelKey();
  if (pk !== trackedPanelKey) {
    trackedPanelKey = pk;
    renderPanel(panelEl);
    collectAllSyncers();
  }

  for (const s of syncers) s();
});

function renderOnce() {
  const view = views[state.scene];
  if (view) {
    view.tick();
    view.draw();
  }
  graph.tick();
  graph.draw();
}

function loop() {
  renderOnce();
  requestAnimationFrame(loop);
}

/* --------------------------------------------------------------- startup -- */

function start() {
  setLang(navigator.language && navigator.language.startsWith('en') ? 'en' : 'cs');
  state.lang = getLang();
  document.documentElement.lang = state.lang;
  applyStep(0);
  rebuild();
  window.addEventListener('resize', () => set({}));
  requestAnimationFrame(loop);
}

start();

// exposed for quick console poking / debugging
window.RainbowLab = { state, set, O, TUTORIAL, renderOnce, rebuild, applyStep, views, graph, applyVisibility };
