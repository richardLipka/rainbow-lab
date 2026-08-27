/**
 * app.js -- assembly. Builds the shell, the control column and the render
 * loop, and keeps the four views in step with the store.
 */
import * as O from './optics.js';
import { t, setLang, getLang, num, deg, LANGS } from './i18n.js';
import { state, set, subscribe, indexModel } from './state.js';
import { el, clear, group, slider, toggle, segmented, select, collectSyncers, setRenderScale } from './ui.js';
import { FAV_LOGO } from './assets.js';
import { createDropletView, ZOOM_RANGE } from './dropletView.js';
import { createGraphView } from './graphView.js';
import { createDropsView, OBS_RANGE } from './dropsView.js';
import { createSkyView } from './skyView.js';
import { createFieldView } from './fieldView.js';
import { renderPanel, applyStep, TUTORIAL } from './panels.js';

/* ------------------------------------------------------------ shell DOM -- */

const root = document.getElementById('app');

const sceneCanvases = {
  droplet: el('canvas', { class: 'scene-canvas' }),
  drops: el('canvas', { class: 'scene-canvas' }),
  field: el('canvas', { class: 'scene-canvas' }),
  sky: el('canvas', { class: 'scene-canvas' }),
};
const graphCanvas = el('canvas', { class: 'graph-canvas' });

const controlsEl = el('div', { class: 'controls' });
const panelEl = el('div', { class: 'panel' });
const headerEl = el('header', { class: 'app-header' });
const sceneTabsEl = el('div', { class: 'scene-tabs' });
const sceneDescEl = el('p', { class: 'scene-desc' });
const graphTabsEl = el('div', { class: 'graph-tabs' });
const graphBarEl = el('div', { class: 'graph-bar' });
const graphExplainEl = el('p', { class: 'graph-explain' });
const graphStageEl = el('div', { class: 'graph-stage' }, graphCanvas);
// One section, three parts: the bar is always there so the plots are
// discoverable; the tabs and the stage only exist when they are open.
const graphWrapEl = el('section', { class: 'graph-wrap collapsed' },
  graphBarEl, graphTabsEl, graphExplainEl, graphStageEl);
const footerEl = el('footer', { class: 'app-footer' });

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
      el('div', { class: 'scene-stage' },
        sceneCanvases.droplet, sceneCanvases.drops, sceneCanvases.field, sceneCanvases.sky)
    ),
    el('aside', { class: 'col col-panel' }, panelEl)
  ),
  graphWrapEl,
  footerEl
);

const views = {
  droplet: createDropletView(sceneCanvases.droplet),
  drops: createDropsView(sceneCanvases.drops),
  field: createFieldView(sceneCanvases.field),
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
        { value: 'field', labelKey: 'sceneField' },
    { value: 'sky', labelKey: 'sceneSky' },
      ],
      () => state.scene,
      (v) => set({ scene: v })
    ),
    exportButton(
      () => sceneCanvases[state.scene],
      () => views[state.scene].draw(),
      () => state.scene
    )
  );
}

/**
 * The plots, and the bar that opens them.
 *
 * When they are closed the tabs are genuinely emptied rather than merely
 * hidden, so `applyFocus()` still reports a tutorial step that asks for a
 * control living down here (the ray count) without opening the plots first.
 * Hiding them with CSS would leave the control in the DOM and turn that
 * loud failure into a silent one.
 */
function buildGraphTabs() {
  clear(graphBarEl);
  clear(graphTabsEl);
  clear(graphExplainEl);
  const open = state.graphOpen;
  graphWrapEl.classList.toggle('collapsed', !open);
  graphBarEl.append(
    el('button', {
      class: 'graph-toggle', type: 'button', 'aria-expanded': open ? 'true' : 'false',
      onclick: () => set({ graphOpen: !state.graphOpen }),
    }, `${open ? '\u25be' : '\u25b8'} ${t(open ? 'graphHide' : 'graphShow')}`)
  );
  if (!open) {
    // Say what is down here while it is shut; once the plots are on screen
    // their own title and explanation take over.
    graphBarEl.append(el('span', { class: 'graph-bar-hint' }, t('graphCollapsedHint')));
    return;
  }

  graphExplainEl.append(t(state.graph === 'exit' ? 'graphExitExplain' : 'graphDistExplain'));
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
    el('span', { class: 'graph-hint' }, t('graphHint')),
    exportButton(() => graphCanvas, () => graph.draw(), () => `graph-${state.graph}`)
  );
}

function fmtCount(c) {
  if (c >= 1000000) return `${num(c / 1000000, 1)}M`;
  if (c >= 1000) return `${num(c / 1000, c >= 10000 ? 0 : 1)}k`;
  return String(c);
}

/* --------------------------------------------------------------- export -- */

/**
 * How many device pixels per CSS pixel an exported figure is rendered at.
 * 3× turns a ~860 px canvas into a ~2600 px image, which survives being
 * dropped into a slide or printed.
 */
const EXPORT_SCALE = 3;

/** Height of the credit strip under an exported figure, in CSS pixels. */
const CREDIT_H = 26;

/**
 * PNG, not SVG, and deliberately so: Canvas 2-D is the only renderer in this
 * project. An SVG export would mean a second drawing path for every view,
 * and two paths that have to agree about every angle is exactly the class of
 * thing this codebase exists to avoid. Rendering at EXPORT_SCALE recovers
 * most of what vector output would have been for.
 */
function renderForExport(canvas, drawAt) {
  setRenderScale(EXPORT_SCALE);
  try {
    drawAt();
  } finally {
    // Restore before anything can throw its way out of here, or the app is
    // left rendering at 3× for the rest of the session.
    setRenderScale(null);
  }
  const w = canvas.width;
  const h = canvas.height;

  const out = el('canvas');
  out.width = w;
  out.height = h + CREDIT_H * EXPORT_SCALE;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#080b14';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);

  // A figure pasted into a slide loses every trace of where it came from, so
  // the credit travels inside the image rather than only on the page.
  ctx.save();
  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
  const cw = w / EXPORT_SCALE;
  const cy = h / EXPORT_SCALE + CREDIT_H / 2;
  ctx.strokeStyle = 'rgba(126,150,196,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / EXPORT_SCALE + 0.5);
  ctx.lineTo(cw, h / EXPORT_SCALE + 0.5);
  ctx.stroke();
  ctx.font = '11px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8ea3c6';
  ctx.textAlign = 'left';
  ctx.fillText(t('appTitle'), 12, cy);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#6f86ab';
  ctx.fillText(CREDIT_URL, cw - 12, cy);
  ctx.restore();

  // Put the screen back the way it was.
  drawAt();
  return out;
}

/** `rainbow-lab-droplet-20260824-1530.png` */
function exportName(key) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  return `rainbow-lab-${key}-${stamp}.png`;
}

/**
 * Hand the file to the user.
 *
 * Inside the claude.ai artifact viewer a page cannot start a download
 * itself; the host offers the file and the viewer confirms it. Everywhere
 * else -- GitHub Pages, the standalone dist file, file:// -- the ordinary
 * anchor is the only thing that works. Feature-detected at runtime rather
 * than built two ways, and the two paths never both run: if the capability
 * is present, a refusal from it is the answer, not a reason to try an
 * anchor the sandbox would ignore anyway.
 */
async function offerDownload(blob, filename) {
  let downloads = null;
  try {
    if (typeof window.claude?.use === 'function') downloads = await window.claude.use('downloads');
  } catch {
    downloads = null;
  }
  if (downloads) {
    try {
      await downloads.save({ filename, data: blob });
      return 'exportSaved';
    } catch (err) {
      return err && err.code === 'declined' ? 'exportDeclined' : 'exportFailed';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'exportSaved';
}

/** A "save this canvas" button, with its own transient status line. */
function exportButton(getCanvas, drawAt, getKey) {
  const status = el('span', { class: 'export-status' });
  let busy = false;
  const btn = el(
    'button',
    {
      class: 'btn tiny', type: 'button', title: t('exportPngHint'),
      onclick: async () => {
        if (busy) return;
        busy = true;
        btn.disabled = true;
        // Rendering at 3x and PNG-encoding a ~2600 px image takes most of a
        // second; without this the button just goes dead for that long.
        status.textContent = t('exportWorking');
        status.className = 'export-status';
        try {
          const out = renderForExport(getCanvas(), drawAt);
          const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
          const key = blob ? await offerDownload(blob, exportName(getKey())) : 'exportFailed';
          status.textContent = t(key);
          status.className = `export-status${key === 'exportSaved' ? ' ok' : ' warn'}`;
        } catch {
          status.textContent = t('exportFailed');
          status.className = 'export-status warn';
        } finally {
          busy = false;
          btn.disabled = false;
          setTimeout(() => { status.textContent = ''; }, 4000);
        }
      },
    },
    t('exportPng')
  );
  return el('span', { class: 'export-ctl' }, btn, status);
}

/* --------------------------------------------------------------- footer -- */

const CREDIT_URL = 'home.zcu.cz/~lipka';
const CREDIT_HREF = 'https://home.zcu.cz/~lipka/';
const CREDIT_EMAIL = 'lipka@fav.zcu.cz';
const FAV_HREF = 'https://www.fav.zcu.cz/';

function buildFooter() {
  clear(footerEl);
  const lang = getLang();
  footerEl.append(
    el(
      'a',
      { class: 'fav-logo', href: FAV_HREF, target: '_blank', rel: 'noopener noreferrer',
        'aria-label': t('favFaculty') },
      el('img', { src: FAV_LOGO[lang] || FAV_LOGO.cs, alt: t('favFaculty') })
    ),
    el(
      'p',
      { class: 'credit' },
      `© ${new Date().getFullYear()} `,
      el('a', { href: CREDIT_HREF, target: '_blank', rel: 'noopener noreferrer' }, CREDIT_EMAIL)
    )
  );
}

/* ------------------------------------------------------------- controls -- */

// Up to 15 km: from an airliner the rain really is below you, and that is
// the only way a whole circular bow is ever seen. The stops are the slider's
// detents, interpolated logarithmically between.
const HEIGHT_STOPS = [1.7, 5, 10, 50, 100, 300, 1000, 3000, 10000, 15000];
const ALL = ['droplet', 'drops', 'field', 'sky'];
/** The two scenes that project a 3-D world with the shared camera. */
const SPACE = ['field', 'sky'];

/** Zoom-out range for the single-droplet scene, driven on a log slider. */
const ZOOM_MAX = ZOOM_RANGE[1];
const ZOOM_MAX_LOG = Math.log10(ZOOM_MAX);

/**
 * One entry in the control column: the scenes that actually READ this
 * control, a thunk that builds it, and an optional extra condition.
 *
 * The column used to show every control in every scene. That is not harmless
 * extra choice: a reader in the 3-D sky scrolled past the impact parameter,
 * the fan count and the zoom-out slider -- none of which that scene reads --
 * to reach the horizon toggle, and moving any of them did nothing. A control
 * that visibly does nothing teaches that the simulation is decorative. So
 * these scene lists are not cosmetic; each one is what the corresponding view
 * actually reads out of the store.
 */
const c = (scenes, node, when) => ({ scenes, node, when });
const shown = (i) => i && i.scenes.includes(state.scene) && (!i.when || i.when());

/** A group holding only the items the current scene can act on; null if none. */
function sceneGroup(titleKey, items, opts) {
  const kids = items.filter(shown).map((i) => i.node());
  if (!kids.length) return null;
  return opts ? group(titleKey, ...kids, opts) : group(titleKey, ...kids);
}

const chipRow = (...chips) => el('div', { class: 'action-row' }, ...chips);
const chip = (labelKey, onclick) => el('button', { class: 'chip', type: 'button', onclick }, t(labelKey));

/** The rainbow angle for order k, from the engine -- never a literal. */
function rainbowPhi(k) {
  const geo = O.rainbowGeometry(indexModel()(650), Math.max(1, k));
  return geo ? geo.antisolarDeg : 42;
}

/**
 * The angle the single-droplet eye is at right now. In auto mode that is the
 * angle the engine derives, so the slider tracks the eye rather than sitting
 * on a stale number the user never set -- and dragging it out of auto is then
 * one continuous gesture instead of a jump.
 */
function observerPhiNow() {
  return state.observerMode === 'manual' ? state.observerPhi : rainbowPhi(state.reflections);
}

/** Which visualisation toggles each scene actually reads. */
const VIS_TOGGLES = [
  { scenes: ['drops', 'field', 'sky'], key: 'primary', labelKey: 'showPrimary' },
  { scenes: ['drops', 'field', 'sky'], key: 'secondary', labelKey: 'showSecondary' },
  { scenes: ['field', 'sky'], key: 'higher', labelKey: 'showHigherOrder' },
  { scenes: ['sky'], key: 'cone', labelKey: 'showCone' },
  { scenes: SPACE, key: 'antisolar', labelKey: 'showAntisolar' },
  { scenes: SPACE, key: 'horizon', labelKey: 'showHorizon' },
  { scenes: ['drops', 'field', 'sky'], key: 'ground', labelKey: 'showGround' },
  { scenes: ['drops', 'field'], key: 'droplets', labelKey: 'showDroplets' },
  { scenes: ['droplet'], key: 'normals', labelKey: 'showNormals' },
  // The many-droplets and sky scenes read show.angles only for the
  // phi/Theta arcs of something the reader has clicked on, so it is offered
  // there only once they have -- a toggle with nothing to toggle teaches
  // that the scene is decorative.
  {
    scenes: ['droplet', 'drops', 'sky'], key: 'angles', labelKey: 'showAngles',
    when: () =>
      state.scene === 'droplet' ||
      (state.scene === 'drops' && !!state.selectedDrop) ||
      (state.scene === 'sky' && !!state.skyPick),
  },
  { scenes: ALL, key: 'labels', labelKey: 'showLabels' },
  { scenes: ['droplet', 'sky'], key: 'wavelengthLabels', labelKey: 'showWavelengthLabels' },
  { scenes: ['sky'], key: 'alexander', labelKey: 'showAlexander' },
  { scenes: ['sky'], key: 'sky', labelKey: 'showSky' },
  { scenes: ['drops', 'field', 'sky'], key: 'rainBelow', labelKey: 'rainBelow' },
];

function buildControls() {
  clear(controlsEl);
  const idx = indexModel();

  const colorOptions = [
    { value: 'white', labelKey: 'white' },
    ...O.NAMED_COLORS.map((col) => ({
      value: col.lambda,
      labelKey: col.id,
      color: O.rgbCss(col.lambda),
    })),
  ];

  const showToggle = (key, labelKey) =>
    toggle(labelKey, () => state.show[key], (v) => set({ show: { [key]: v } }));

  const groups = [
    /* --- the light going in --- */
    sceneGroup('light', [
      c(ALL, () => el('div', { class: 'ctl', dataset: { ctl: 'wavelength' } },
        el('span', { class: 'ctl-label' }, t('wavelength')),
        segmented(colorOptions, () => state.wavelength, (v) =>
          set({ wavelength: v === 'white' ? 'white' : Number(v), selectedRay: null }), { wrap: true }))),
      c(ALL, () => slider({
        labelKey: 'dispersion', min: 0, max: 1, step: 0.01,
        get: () => state.dispersion,
        format: (v) => `${num(v * 100, 0)} %`,
        onInput: (v) => set({ dispersion: v }),
        hintKey: 'dispersionHint',
      })),
    ]),

    /* --- the ray being steered, and the droplet it goes through --- */
    sceneGroup('droplet', [
      c(['droplet'], () => slider({
        labelKey: 'impactParameter', min: -0.999, max: 0.999, step: 0.001,
        get: () => state.impact,
        format: (v) => num(v, 3),
        onInput: (v) => set({ impact: v }),
      })),
      c(['droplet'], () => slider({
        labelKey: 'fanCount', min: 0, max: 60, step: 1,
        get: () => state.fanCount,
        format: (v) => (v === 0 ? '1' : String(v)),
        onInput: (v) => set({ fanCount: Math.round(v) }),
      })),
      c(['droplet'], () =>
        toggle('showNonRainbow', () => state.showNonRainbow, (v) => set({ showNonRainbow: v }),
          { strong: true })),
      c(['droplet'], () => slider({
        labelKey: 'dropletZoom', min: 0, max: ZOOM_MAX_LOG, step: 0.004,
        get: () => Math.log10(O.clamp(state.dropletZoom, 1, ZOOM_MAX)),
        format: (v) => `${num(Math.pow(10, v), 1)}×`,
        onInput: (v) => set({ dropletZoom: Math.pow(10, v) }),
        hintKey: 'dropletZoomHint',
      })),
      c(['droplet'], () => slider({
        labelKey: 'dropletRadius', min: 0.05, max: 5, step: 0.05,
        get: () => state.dropletRadiusMm,
        format: (v) => `${num(v, 2)} mm`,
        onInput: (v) => set({ dropletRadiusMm: v }),
      })),
      c(['droplet'], () => el('small', { class: 'ctl-hint block' }, t('dropletSizeNote'))),
    ]),

    /* --- which reflection families are traced at all. The bounce count lives
           here rather than under "droplet": it is the same question as the
           family checkboxes below it, and in the scenes that draw no single
           ray it was the only thing left in the droplet group. --- */
    sceneGroup('rays', [
      c(ALL, () => el('div', { class: 'ctl', dataset: { ctl: 'reflections' } },
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
          }))),
      c(ALL, () => el('div', { class: 'ctl', dataset: { ctl: 'showFamilies' } },
        el('span', { class: 'ctl-label' }, t('showFamilies')),
        el('div', { class: 'stack' },
          toggle('family0', () => state.families[0], (v) => set({ families: { 0: v } })),
          toggle('family1', () => state.families[1], (v) => set({ families: { 1: v } })),
          toggle('family2', () => state.families[2], (v) => set({ families: { 2: v } })),
          toggle('family3', () => state.families[3], (v) => set({ families: { 3: v } }))))),
    ]),

    /* --- where the observer is standing, in whichever scene we are in --- */
    sceneGroup('observerGroup', [
      c(['droplet'], () => el('div', { class: 'ctl', dataset: { ctl: 'observerPlacement' } },
        el('span', { class: 'ctl-label' }, t('observerPlacement')),
        segmented(
          [{ value: 'auto', labelKey: 'observerAuto' }, { value: 'manual', labelKey: 'observerManual' }],
          () => state.observerMode,
          // Seed the manual angle from wherever the eye already is, so
          // switching mode never teleports it.
          (v) => set({ observerMode: v, observerPhi: observerPhiNow() })))),
      c(['droplet'], () => slider({
        labelKey: 'observerAngle', min: 0, max: 180, step: 0.1,
        get: () => observerPhiNow(),
        format: (v) => deg(v, 1),
        onInput: (v) => set({ observerMode: 'manual', observerPhi: v }),
        hintKey: 'observerAngleHint',
      })),
      c(['droplet'], () => chipRow(
        chip('observerSnap', () =>
          set({ observerMode: 'manual', observerPhi: Math.round(rainbowPhi(state.reflections) * 10) / 10 })),
        chip('observerAuto', () => set({ observerMode: 'auto' })))),

      c(['drops'], () => slider({
        labelKey: 'observerDepth', min: OBS_RANGE.x[0], max: OBS_RANGE.x[1], step: 0.005,
        get: () => state.dropsObserverX,
        format: (v) => `${v >= 0 ? '+' : ''}${num(v, 2)}`,
        onInput: (v) => set({ dropsObserverX: v }),
        hintKey: 'observerMoveHint',
      })),
      c(['drops'], () => slider({
        labelKey: 'observerRise', min: OBS_RANGE.y[0], max: OBS_RANGE.y[1], step: 0.005,
        get: () => state.dropsObserverY,
        format: (v) => `${v >= 0 ? '+' : ''}${num(v, 2)}`,
        onInput: (v) => set({ dropsObserverY: v }),
      })),
      c(['drops'], () => chipRow(
        chip('observerRecentre', () => set({ dropsObserverX: 0, dropsObserverY: 0 })))),

      // Sky only. The many-droplets scene already places the observer with
      // observerRise, and a second control that also means "how high am I" --
      // this one moving the ground instead of the eye -- gave that scene two
      // observers that could disagree about where the reader was standing.
      c(SPACE, () => slider({
        labelKey: 'observerHeight', min: 0, max: HEIGHT_STOPS.length - 1, step: 0.01,
        get: () => heightToSlider(state.observerHeight),
        format: (v) => `${num(sliderToHeight(v), sliderToHeight(v) < 10 ? 1 : 0)} ${t('metres')}`,
        onInput: (v) => set({ observerHeight: sliderToHeight(v) }),
      })),
      c(['sky'], () => el('small', { class: 'ctl-hint block' }, t('explObserverHeight'))),
      c(SPACE, () => el('div', { class: 'ctl', dataset: { ctl: 'viewMode' } },
        el('span', { class: 'ctl-label' }, t('viewMode')),
        segmented(
          [{ value: 'orbit', labelKey: 'viewOrbit' }, { value: 'eye', labelKey: 'viewEye' }],
          () => state.view,
          // Keep whichever 3-D scene is showing; both use this camera.
          (v) => set({ view: v, scene: SPACE.includes(state.scene) ? state.scene : 'sky' })))),
      // Only the eye view reads these three: in orbit view the camera is
      // driven by dragging, so moving them there looked broken.
      c(SPACE, () => slider({
        labelKey: 'lookAzimuth', min: -180, max: 180, step: 1,
        get: () => state.eyeAzimuth,
        format: (v) => deg(v, 0),
        onInput: (v) => set({ eyeAzimuth: v }),
      }), () => state.view === 'eye'),
      c(SPACE, () => slider({
        labelKey: 'lookElevation', min: -85, max: 85, step: 1,
        get: () => state.eyeElevation,
        format: (v) => deg(v, 0),
        onInput: (v) => set({ eyeElevation: v }),
      }), () => state.view === 'eye'),
      c(SPACE, () => slider({
        labelKey: 'fieldOfView', min: 25, max: 140, step: 1,
        get: () => state.fov,
        format: (v) => deg(v, 0),
        onInput: (v) => set({ fov: v }),
      }), () => state.view === 'eye'),
    ]),

    /* --- the Sun. The single-droplet scene has no sky, so no elevation. --- */
    sceneGroup('sun', [
      c(['drops', 'field', 'sky'], () => slider({
        labelKey: 'sunElevation', min: 0, max: 90, step: 0.5,
        get: () => state.sunElevation,
        format: (v) => deg(v, 1),
        onInput: (v) => set({ sunElevation: v }),
      })),
      c(SPACE, () => slider({
        labelKey: 'sunAzimuth', min: 0, max: 360, step: 1,
        get: () => state.sunAzimuth,
        format: (v) => deg(v, 0),
        onInput: (v) => set({ sunAzimuth: v }),
      })),
    ]),

    /* --- the droplet field --- */
    sceneGroup('sceneDrops', [
      c(['drops'], () => slider({
        labelKey: 'dropCount', min: 0, max: 4, step: 0.01,
        get: () => Math.log10(Math.max(1, state.dropCount)),
        format: (v) => fmtCount(Math.round(Math.pow(10, v))),
        onInput: (v) => set({ dropCount: Math.round(Math.pow(10, v)) }),
      })),
      c(['drops'], () => toggle('animateDrops', () => state.dropsAnimate, (v) => set({ dropsAnimate: v }))),
      c(['field'], () => slider({
        labelKey: 'fieldCount', min: 3, max: 5.3, step: 0.01,
        get: () => Math.log10(O.clamp(state.fieldCount, 1000, 200000)),
        format: (v) => fmtCount(Math.round(Math.pow(10, v))),
        onInput: (v) => set({ fieldCount: Math.round(Math.pow(10, v)) }),
        hintKey: 'fieldCountHint',
      })),
    ]),

    /* --- what is drawn --- */
    sceneGroup('visualization', [
      c(ALL, () => el('div', { class: 'grid2' },
        ...VIS_TOGGLES.filter((v) => v.scenes.includes(state.scene) && (!v.when || v.when()))
          .map((v) => showToggle(v.key, v.labelKey)))),
      c(['drops', 'field', 'sky'], () => el('small', { class: 'ctl-hint block' }, t('fullCircleNote'))),
      c(['sky'], () => toggle('showRenderedBow', () => state.show.renderedBow,
        (v) => set({ show: { renderedBow: v } }), { strong: true })),
      c(['sky'], () => el('small', { class: 'ctl-hint block' }, t('warningNoRender'))),
    ]),

    /* --- the physics knobs. Reachable in every scene but closed by default:
           the refractive-index model is the one thing in here that changes
           the answer, so it must not be hidden, but it is not where anyone
           starts. --- */
    sceneGroup('indexGroup', [
      c(ALL, () => select('indexModel',
        [{ value: 'table', labelKey: 'indexTable' }, { value: 'cauchy', labelKey: 'indexCauchy' }],
        () => state.indexMode, (v) => set({ indexMode: v }))),
      c(ALL, () => slider({
        labelKey: 'indexScale', min: 0.85, max: 1.15, step: 0.001,
        get: () => state.indexScale,
        format: (v) => `×${num(v, 3)} → n=${num(idx(650) * 1, 4)}`,
        onInput: (v) => set({ indexScale: v }),
      })),
    ], { collapsed: true }),
  ];

  controlsEl.append(
    ...groups.filter(Boolean),
    el('button', {
      class: 'btn wide', type: 'button',
      onclick: () => { resetState(); rebuild(); },
    }, t('reset'))
  );

  applyFocus();
  collectAllSyncers();
}

/**
 * In tutorial mode, mark the controls the current step is actually about.
 *
 * The scene filter already removed the controls this scene ignores; this
 * points at the ones this step needs. It doubles as the check that they are
 * there at all: a focus key with no matching control in the current scene is
 * a step asking for something the column is not offering, which is a bug in
 * the step, so it is reported rather than silently ignored.
 */
function applyFocus() {
  const step = state.mode === 'tutorial' ? TUTORIAL[state.step] : null;
  const want = (step && step.focus) || [];
  for (const host of [controlsEl, graphWrapEl]) {
    for (const node of host.querySelectorAll('[data-ctl]')) {
      node.classList.toggle('focus', want.includes(node.dataset.ctl));
    }
  }
  const missing = want.filter(
    (k) => !controlsEl.querySelector(`[data-ctl="${k}"]`) && !graphWrapEl.querySelector(`[data-ctl="${k}"]`)
  );
  if (missing.length) {
    console.warn(`tutorial step ${state.step + 1} (${state.scene}): controls not on screen:`, missing);
  }
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
    observerMode: 'auto', observerPhi: 42.4,
    dropsObserverX: 0, dropsObserverY: 0,
    showNonRainbow: false, fanCount: 0, families: { 0: false, 1: true, 2: false, 3: false },
    angleMode: 'antisolar', distRays: 60, distAccumulate: false, graphOpen: false,
    dropCount: 1, dropsAnimate: false, fieldCount: 60000,
    sunElevation: 15, sunAzimuth: 180, observerHeight: 1.7,
    view: 'orbit', camYaw: -35, camPitch: 14, camDist: 3.1,
    eyeAzimuth: 0, eyeElevation: 12, fov: 75,
    selectedRay: null, selectedDrop: null, skyPick: null,
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
    ...collectSyncers(graphWrapEl),
    ...collectSyncers(panelEl),
  ];
}

function rebuild() {
  buildHeader();
  buildSceneTabs();
  buildGraphTabs();
  buildFooter();
  buildControls();
  renderPanel(panelEl);
  applyVisibility();
  collectAllSyncers();
  trackedGraph = graphKey();
  trackedPanelKey = panelKey();
  trackedControlsKey = controlsKey();
}

/**
 * Everything the SHAPE of the control column depends on: the scene (which
 * controls are relevant at all), the sky view mode (the look/FOV sliders
 * exist only in the eye view), the observer mode, and the tutorial position
 * (which controls are highlighted). None of these used to rebuild it, so
 * switching scenes left the previous scene's controls sitting there.
 */
function controlsKey() {
  return [
    state.scene, state.view, state.observerMode, state.mode, state.step,
    state.selectedDrop ? 1 : 0, state.skyPick ? 1 : 0,
  ].join('|');
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
  sceneDescEl.textContent = t(`scene${state.scene[0].toUpperCase()}${state.scene.slice(1)}Desc`);
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
  // The many-droplets readout is about a clicked droplet, so it moves with
  // the droplet, the observer, the Sun and the index model -- everything
  // dropReport() reads.
  const dropPart =
    state.scene === 'drops' && state.panel === 'ray'
      ? (() => {
          const d = state.selectedDrop;
          return `${d ? `${d.x.toFixed(4)},${d.y.toFixed(4)}` : '-'}|${state.sunElevation}|${state.dropsObserverX}|${state.dropsObserverY}|${state.dispersion}|${state.indexMode}|${state.indexScale}`;
        })()
      : '';
  // The sky readout is about a clicked point on a bow, so it moves with the
  // pick, the Sun and the index model -- everything skyPickNodes() reads.
  const skyPart =
    state.scene === 'sky' && state.panel === 'ray'
      ? (() => {
          const k = state.skyPick;
          return `${k ? `${k.k},${k.lambda},${k.roll.toFixed(2)}` : '-'}|${state.sunElevation}|${state.sunAzimuth}|${state.dispersion}|${state.indexMode}|${state.indexScale}`;
        })()
      : '';
  const guidePart =
    state.mode === 'free' && state.panel === 'guide'
      ? `${state.dispersion}|${state.indexMode}|${state.indexScale}|${state.show.renderedBow}`
      : '';
  return `${state.panel}|${state.scene}|${state.step}|${rayPart}|${mathPart}|${dropPart}|${skyPart}|${guidePart}`;
}

/** Everything the shape of the graph section depends on. */
function graphKey() {
  return `${state.graph}|${state.graphOpen}`;
}

let trackedGraph = graphKey();
let trackedPanelKey = panelKey();
let trackedControlsKey = controlsKey();

subscribe(() => {
  applyVisibility();

  const gk = graphKey();
  const graphChanged = gk !== trackedGraph;
  if (graphChanged) {
    trackedGraph = gk;
    buildGraphTabs();
  }

  const ck = controlsKey();
  if (ck !== trackedControlsKey) {
    trackedControlsKey = ck;
    buildControls(); // re-runs applyFocus() and re-collects the syncers itself
  } else if (graphChanged) {
    // Only when the column was NOT rebuilt. Some focused controls live in the
    // plot bar, so opening or closing the plots can add or remove one without
    // controlsKey() changing, and the check would otherwise never run for
    // exactly the case it exists to catch. It has to happen after the
    // buildControls() branch, not inside the graph branch above: a step change
    // moves both keys, and checking first would test the OUTGOING step's
    // column and report controls that are about to appear.
    applyFocus();
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
  // Skip entirely while collapsed: the canvas is display:none, so it would
  // measure 0 x 0 and every plotted coordinate would be meaningless.
  if (state.graphOpen && graphCanvas.clientWidth > 0) {
    graph.tick();
    graph.draw();
  }
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
