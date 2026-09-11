/**
 * panels.js -- the explanation column: tutorial, ray readout, mathematics
 * and the question set. All text comes from i18n.
 */
import * as O from './optics.js';
import { state, set, indexModel, activeLambdas, activeOrders } from './state.js';
import { t, deg, num, CLASS_KEY, CLASS_EXPLAIN } from './i18n.js';
import { el, row, segmented } from './ui.js';
import {
  traceOne, distanceFromExtremum, dropReport, colorIdFor, DROP_ORDERS,
  orderLedger, bowNameKey, fieldReport, BOW_MATCH_DEG, nearestColorId,
} from './rays.js';
// One definition of what a world unit is worth, shared with the scene that
// generates the rain -- a readout quoting its own metres would drift.
import { WORLD_SCALE_M } from './fieldView.js';

/* ==========================================================================
 * Tutorial
 * ======================================================================== */

/**
 * The guided path. Each step owns three things:
 *
 *   apply  the state it needs on screen, pushed on entry. Every step sets
 *          `graphOpen` explicitly, true only where the step actually talks
 *          about a plot or focuses a control that lives in one -- otherwise
 *          the plots stay shut and the reader is not handed axes they have
 *          no reason for yet.
 *   focus  the control-column ids (translation keys, see ui.js) the step is
 *          actually asking the reader to move. app.js highlights them and
 *          warns to the console if a focused control is not present in the
 *          scene this step selected -- so "the step tells you to turn a knob
 *          that this scene hides" is a loud bug rather than a dead end.
 *   actions optional chips, either a patch object or a function returning one
 *          (used where the value has to come out of the engine instead of
 *          being written down as a literal).
 */
export const TUTORIAL = [
  {
    title: 's1title', body: 's1body',
    apply: {
      scene: 'droplet', graph: 'exit', reflections: 0, dispersion: 0, wavelength: 'white',
      impact: 0.6, fanCount: 0, showNonRainbow: false, angleMode: 'antisolar',
      dropletZoom: 1, observerMode: 'auto', graphOpen: false,
      show: { angles: false, normals: false, labels: true, renderedBow: false },
      families: { 0: true, 1: false, 2: false, 3: false },
    },
    focus: ['impactParameter', 'wavelength'],
  },
  {
    title: 's2title', body: 's2body',
    apply: {
      scene: 'droplet', reflections: 0, graphOpen: false,
      show: { angles: true, normals: true },
      families: { 0: true, 1: false, 2: false, 3: false },
    },
    focus: ['impactParameter', 'showNormals', 'showAngles'],
    actions: [
      { label: 'b/R = 0.2', patch: { impact: 0.2 } },
      { label: 'b/R = 0.6', patch: { impact: 0.6 } },
      { label: 'b/R = 0.95', patch: { impact: 0.95 } },
    ],
  },
  {
    title: 's3title', body: 's3body',
    apply: {
      scene: 'droplet', reflections: 1, impact: 0.7, showNonRainbow: true, graphOpen: false,
      families: { 0: false, 1: true, 2: false, 3: false },
      show: { normals: false, angles: true },
    },
    focus: ['reflections', 'showNonRainbow'],
    note: 'explReflectionIsWeak',
  },
  {
    title: 's4title', body: 's4body',
    apply: {
      scene: 'droplet', reflections: 1, showNonRainbow: false, panel: 'guide',
      graphOpen: false, show: { angles: true },
    },
    focus: ['impactParameter', 'showAngles'],
    actions: [{
      labelKey: 'extremumLabel',
      // From the engine, not written down: 0.861 was a literal sitting in
      // the one file that is supposed to contain none.
      patch: () => ({ impact: O.rainbowGeometry(indexModel()(650), 1).impactParameter }),
    }],
    showRay: true,
  },
  {
    title: 's5title', body: 's5body',
    apply: {
      scene: 'droplet', graph: 'exit', graphOpen: true, reflections: 1, fanCount: 9,
      panel: 'guide',
    },
    focus: ['fanCount', 'impactParameter'],
    actions: [
      { label: '1', patch: { fanCount: 0 } },
      { label: '9', patch: { fanCount: 9 } },
      { label: '25', patch: { fanCount: 25 } },
    ],
  },
  {
    /* Where must you stand? The eye is handed over to the reader here: the
       fan is already on screen from the previous step, so sweeping the eye
       across it makes the caustic count itself, and 42 deg arrives as a
       measurement rather than as an assertion. Deliberately started off the
       bow -- an eye that is already correct has nothing to demonstrate. */
    title: 's6title', body: 's6body',
    apply: {
      // One wavelength, full dispersion: the tally then counts exactly the
      // rays that are visible on screen (under white light all six overlap
      // at once and it would read 48/276 for 46 visible lines), and the
      // angle being hunted for is the real n(650) one the rest of the app
      // quotes rather than the mean-index 41.9 that dispersion=0 produces.
      scene: 'droplet', graph: 'exit', reflections: 1, fanCount: 45, dispersion: 1,
      wavelength: 650, impact: 0.861, dropletZoom: 2.6, observerMode: 'manual', observerPhi: 30,
      panel: 'guide', graphOpen: false, show: { angles: true, normals: false, labels: true },
      families: { 0: false, 1: true, 2: false, 3: false },
    },
    focus: ['observerAngle', 'observerPlacement'],
    actions: [
      { label: '30°', patch: { observerMode: 'manual', observerPhi: 30 } },
      { label: '38°', patch: { observerMode: 'manual', observerPhi: 38 } },
      {
        labelKey: 'observerSnap',
        patch: () => ({
          observerMode: 'manual',
          observerPhi: Math.round(O.rainbowGeometry(indexModel()(650), 1).antisolarDeg * 10) / 10,
        }),
      },
      { label: '55°', patch: { observerMode: 'manual', observerPhi: 55 } },
    ],
    note: 'explObserverAngle',
  },
  {
    title: 's7title', body: 's7body',
    apply: {
      scene: 'droplet', graph: 'dist', graphOpen: true, reflections: 1, fanCount: 25,
      distRays: 40,
    },
    focus: ['rayCount'],
    actions: [
      { label: '10', patch: { distRays: 10 } },
      { label: '100', patch: { distRays: 100 } },
      { label: '1 000', patch: { distRays: 1000 } },
      { label: '100 000', patch: { distRays: 100000 } },
    ],
    note: 'explCaustic',
  },
  {
    title: 's8title', body: 's8body',
    apply: {
      scene: 'drops', graph: 'dist', dropCount: 1, dropsAnimate: true,
      dropsObserverX: 0, dropsObserverY: 0, graphOpen: false,
      show: { droplets: true, primary: true, secondary: false },
    },
    focus: ['dropCount', 'animateDrops'],
    actions: [
      { label: '1', patch: { dropCount: 1 } },
      { label: '10', patch: { dropCount: 10 } },
      { label: '100', patch: { dropCount: 100 } },
      { label: '1 000', patch: { dropCount: 1000 } },
      { label: '10 000', patch: { dropCount: 10000 } },
    ],
    note: 'explNotAnObject',
  },
  {
    /* The bow is not a place. Nothing about the droplet field changes here --
       only where the reader is standing -- and a different set of droplets
       lights up, which is the claim the previous step could only make in
       words. */
    title: 's9title', body: 's9body',
    apply: {
      scene: 'drops', graph: 'dist', dropCount: 1500, dropsAnimate: false,
      dropsObserverX: 0, dropsObserverY: 0, sunElevation: 15, graphOpen: false,
      show: { droplets: true, primary: true, secondary: false, ground: true, labels: true },
    },
    focus: ['observerDepth', 'observerRise'],
    actions: [
      { labelKey: 'observerRecentre', patch: { dropsObserverX: 0, dropsObserverY: 0 } },
      { labelKey: 'obsChipForward', patch: { dropsObserverX: 0.45 } },
      { labelKey: 'obsChipUp', patch: { dropsObserverY: 0.28 } },
      { labelKey: 'obsChipDown', patch: { dropsObserverY: -0.09 } },
    ],
    note: 'explBowFollowsYou',
  },
  {
    /* The flat scene's argument, with the cross-section taken away. Nothing
       here draws a circle: the arc is however many of the droplets around
       the reader answered yes to the one angular test, which is the claim
       the sky view can only make by drawing the circle it is explaining. */
    title: 's10title', body: 's10body',
    apply: {
      scene: 'field', view: 'eye', eyeAzimuth: 0, eyeElevation: 14, fov: 110,
      sunElevation: 15, observerHeight: 1.7, fieldCount: 60000, graphOpen: false,
      wavelength: 'white', dispersion: 1,
      show: {
        droplets: true, primary: true, secondary: true, higher: false,
        ground: true, horizon: true, rainBelow: false, antisolar: true, labels: true,
      },
    },
    focus: ['fieldCount', 'viewMode'],
    actions: [
      { labelKey: 'viewEye', patch: { view: 'eye' } },
      { labelKey: 'viewOrbit', patch: { view: 'orbit' } },
      { label: '10k', patch: { fieldCount: 10000 } },
      { label: '60k', patch: { fieldCount: 60000 } },
      { label: '200k', patch: { fieldCount: 200000 } },
    ],
    note: 'explFieldAssembles',
  },
  {
    title: 's11title', body: 's11body',
    apply: {
      scene: 'sky', view: 'orbit', sunElevation: 15, graphOpen: false,
      show: { cone: true, horizon: false, ground: false, antisolar: true, primary: true, secondary: false, renderedBow: false },
    },
    focus: ['showCone', 'showHorizon', 'viewMode'],
    actions: [
      { labelKey: 'showCone', patch: { show: { cone: true } } },
      { labelKey: 'showHorizon', patch: { show: { horizon: true, ground: true } } },
      { labelKey: 'viewEye', patch: { view: 'eye' } },
    ],
  },
  {
    title: 's12title', body: 's12body',
    apply: {
      scene: 'droplet', graph: 'exit', wavelength: 'white', dispersion: 0, reflections: 1,
      fanCount: 0, dropletZoom: 9, observerMode: 'auto', graphOpen: true,
      show: { wavelengthLabels: true, angles: true },
      families: { 0: false, 1: true, 2: false, 3: false },
    },
    focus: ['dispersion', 'dropletZoom', 'showWavelengthLabels'],
    actions: [
      { label: '0 %', patch: { dispersion: 0 } },
      { label: '50 %', patch: { dispersion: 0.5 } },
      { label: '100 %', patch: { dispersion: 1 } },
    ],
    note: 'explDispersionZoom',
  },
  {
    title: 's13title', body: 's13body',
    apply: {
      scene: 'sky', view: 'eye', dispersion: 1, wavelength: 'white', reflections: 2,
      graphOpen: false, families: { 0: false, 1: true, 2: true, 3: false },
      show: {
        primary: true, secondary: true, alexander: true, horizon: true, ground: true,
        renderedBow: true, cone: false, wavelengthLabels: true,
      },
    },
    focus: ['showSecondary', 'showAlexander', 'showRenderedBow'],
    actions: [
      { labelKey: 'showRenderedBow', patch: { show: { renderedBow: true } } },
      { labelKey: 'showAlexander', patch: { show: { alexander: true } } },
      { labelKey: 'showCone', patch: { show: { cone: true } } },
    ],
    note: ['explAlexander', 'explWhyFainter'],
  },
];

export function applyStep(i) {
  const s = TUTORIAL[i];
  if (!s) return;
  set({ ...s.apply, step: i });
}

function renderTutorial() {
  const s = TUTORIAL[state.step];
  const nodes = [
    el('div', { class: 'step-counter' }, `${t('step')} ${state.step + 1} ${t('of')} ${TUTORIAL.length}`),
    el('h2', {}, t(s.title)),
    el('p', {}, t(s.body)),
  ];
  if (s.actions) {
    nodes.push(
      el('div', { class: 'action-row' },
        s.actions.map((a) =>
          el('button', {
            class: 'chip', type: 'button',
            // A patch may be a function when the value has to come out of the
            // engine -- a chip that jumps to the rainbow angle must not carry
            // that angle as a literal.
            onclick: () => set(typeof a.patch === 'function' ? a.patch() : a.patch),
          }, a.labelKey ? t(a.labelKey) : a.label)
        ))
    );
  }
  if (s.showRay) nodes.push(...rayInfoNodes({ compact: true }));
  // A step may carry more than one note: naming the bow a reflection count
  // makes and saying what the extra bounce costs are two separate claims.
  for (const key of [].concat(s.note || [])) nodes.push(noteNode(key));

  nodes.push(
    el('div', { class: 'step-nav' },
      el('button', {
        class: 'btn', type: 'button', disabled: state.step === 0,
        onclick: () => applyStep(state.step - 1),
      }, t('prev')),
      el('button', {
        class: 'btn primary', type: 'button',
        onclick: () => {
          if (state.step < TUTORIAL.length - 1) applyStep(state.step + 1);
          else set({ mode: 'free' });
        },
      }, state.step < TUTORIAL.length - 1 ? t('next') : t('startFree'))
    ),
    el('div', { class: 'progress' },
      TUTORIAL.map((_, i) =>
        el('button', {
          class: 'dot' + (i === state.step ? ' on' : '') + (i < state.step ? ' done' : ''),
          type: 'button', title: `${t('step')} ${i + 1}`, onclick: () => applyStep(i),
        })
      ))
  );
  return nodes;
}

function renderFreeGuide() {
  const idx = indexModel();
  const p = O.rainbowGeometry(idx(650), 1);
  const s = O.rainbowGeometry(idx(650), 2);
  return [
    el('h2', {}, t('reconstructTitle')),
    el('p', { class: 'chain' }, t('reconstructBody')),
    el('div', { class: 'panel-block' },
      el('h3', {}, t('notHardCoded')),
      row('primaryRainbow', deg(p.antisolarDeg, 2)),
      row('secondaryRainbow', deg(s.antisolarDeg, 2)),
      row('showAlexander', `${deg(O.alexandersBand(idx).innerDeg, 1)} – ${deg(O.alexandersBand(idx).outerDeg, 1)}`)
    ),
    el('p', { class: 'note' }, t('explObserverHeight')),
    el('p', { class: 'note' }, t('dropletSizeNote')),
    !state.show.renderedBow ? el('p', { class: 'note warn' }, t('warningNoRender')) : null,
  ];
}

/* ==========================================================================
 * Which reflection count makes which bow
 * ======================================================================== */

/**
 * Notes whose sentences quote engine numbers.
 *
 * The percentages live in the placeholders rather than in the Czech and
 * English prose, for the same reason no angle is written down anywhere else
 * here: change the index model and the sentence has to change with it, and a
 * number typed into a translation string never will.
 */
function noteParams(key, k = state.reflections) {
  const idx = indexModel();
  if (key === 'coneSliceNote') {
    const g1 = O.rainbowGeometry(idx(650), 1);
    const g2 = O.rainbowGeometry(idx(650), 2);
    if (!g1 || !g2) return null;
    // Two numbers, both from the engine: what the canvas shows, and what is
    // true. The first is a sum because the families land on opposite sides of
    // the axis; the second is the difference, which is the sky.
    return {
      apart: deg(g1.antisolarDeg + g2.antisolarDeg, 1),
      gap: deg(g2.antisolarDeg - g1.antisolarDeg, 2),
    };
  }
  if (key === 'explWhyFainter') {
    const [first, second] = orderLedger(idx);
    if (!first || !second) return null;
    return { r1: `${num(first.R * 100, 1)} %`, rel2: `${num(second.relative * 100, 0)} %` };
  }
  if (key === 'entryHalvesNote') {
    const g1 = O.rainbowGeometry(idx(650), 1);
    const g2 = O.rainbowGeometry(idx(650), 2);
    if (!g1 || !g2) return null;
    return {
      phi1: deg(g1.antisolarDeg, 1), phi2: deg(g2.antisolarDeg, 1),
      gap: deg(g2.antisolarDeg - g1.antisolarDeg, 2),
    };
  }
  if (key === 'explBowNeedsOwnRay') {
    const g1 = O.rainbowGeometry(idx(650), 1);
    const g2 = O.rainbowGeometry(idx(650), 2);
    if (!g1 || !g2) return null;
    return { b1: num(g1.impactParameter, 3), b2: num(g2.impactParameter, 3) };
  }
  if (key === 'explReflectionIsWeak') {
    const light = O.bowBrightness(idx(650), Math.max(1, k));
    if (!light || light.criticalDeg === null) return null;
    return { crit: deg(light.criticalDeg, 1), theta: deg(light.internalDeg, 1) };
  }
  return null;
}

const noteNode = (key, k) => el('p', { class: 'note' }, t(key, noteParams(key, k) || undefined));

/**
 * Supporting prose, folded away.
 *
 * Seven notes had accumulated in this panel, 420 words, 1474 px of it in a
 * 734 px column -- so the mechanism the scene exists to teach was the second
 * item of seven and half of them were below the fold. Two claims stay in the
 * open; everything that qualifies or extends them goes in here.
 */
const moreNode = (...children) =>
  el('details', { class: 'more' },
    el('summary', {}, t('moreDetail')),
    ...children.filter(Boolean));

/**
 * The ledger: one line per reflection order, naming the bow it produces and
 * what is left of the light by the time it gets there.
 *
 * Both numbers come from `bowBrightness()`, so the table is the Fresnel
 * factor and nothing else. The row matching the reflections control is
 * marked, which is the whole point of putting it next to that control: turn
 * the knob to 2 and watch the highlight move to the line that says the light
 * has dropped to a third.
 */
function bowLedgerNodes() {
  // Covers whatever the reflections control can reach, since the ledger is
  // there to explain that control. DROP_ORDERS stays at three for the scene
  // inspectors, which answer a different question.
  const top = Math.max(3, state.reflections);
  const rows = orderLedger(indexModel(), Array.from({ length: top }, (_, i) => i + 1));
  if (!rows.length) return [];
  return [
    el('h3', {}, t('bowLedgerTitle')),
    el('div', { class: 'panel-block' },
      rows.map((r) =>
        el('div', { class: 'row' + (r.k === state.reflections ? ' row-on' : '') },
          el('span', { class: 'row-key' }, `k = ${r.k} → ${t(bowNameKey(r.k), { k: r.k })}`),
          el('span', { class: 'row-val mono' },
            `${num(r.survives * 100, 2)} % · ×${num(r.relative, 2)}`)))),
  ];
}

/* ==========================================================================
 * Ray readout
 * ======================================================================== */

function rayInfoNodes(opts = {}) {
  const idx = indexModel();
  const sel = state.selectedRay;
  const lambda = sel ? sel.lambda : activeLambdas()[0];
  const k = sel ? sel.k : state.reflections;
  const b = sel ? sel.b : state.impact;
  const n = idx(lambda);
  const ray = traceOne(lambda, n, k, Math.abs(b));
  const p = ray.path;
  const cls = p.classification;
  const dist = distanceFromExtremum(ray);

  const nodes = [
    opts.compact ? null : el('h2', {}, t('rayInfo')),
    el('div', { class: 'panel-block' },
      row('infoWavelength', `${lambda} ${t('nm')}`, { color: O.rgbCss(lambda) }),
      row('infoIndex', num(n, 4)),
      row('infoImpact', num(Math.abs(b), 3)),
      row('infoIncidence', p.thetaI === null ? '—' : deg(p.thetaI * O.DEG, 2)),
      row('infoRefraction', p.thetaR === null ? '—' : deg(p.thetaR * O.DEG, 2)),
      row('infoReflections', String(k)),
      row('infoExitAngle', p.antisolar === null ? '—' : deg(p.antisolar * O.DEG, 2)),
      row('infoScattering', p.scattering === null ? '—' : deg(p.scattering * O.DEG, 2)),
      row('infoDeviation', p.deviation === null ? '—' : deg(p.deviation * O.DEG, 2)),
      row('infoIntensity', `${num(p.intensity * 100, 2)} %`),
      dist === null ? null : row('infoDistanceFromBow', `${dist >= 0 ? '+' : ''}${num(dist, 2)}°`)
    ),
    // Named with its order. With several families on screen the verdict is
    // about one of them, and an unlabelled "ordinary scattered ray" next to a
    // ray visibly reaching its eye reads as a contradiction.
    el('div', { class: `classification cls-${cls}` },
      `${k >= 1 ? `k = ${k} · ` : ''}${t(CLASS_KEY[cls] || 'classNonCaustic')}`),
  ];
  if (CLASS_EXPLAIN[cls]) nodes.push(el('p', { class: 'note' }, t(CLASS_EXPLAIN[cls])));
  if (cls === 'nonCaustic' && k === 1) {
    nodes.push(el('p', { class: 'note' }, t('explNotOneReflection')));
  }
  if (!opts.compact) {
    const manyOrders = activeOrders().filter((o) => o >= 1).length > 1;
    // The two claims that have to be read, in the open and in this order:
    // one ray makes every order, and a bow still needs its own ray.
    if (manyOrders) nodes.push(noteNode('coneSliceNote'), noteNode('explBowNeedsOwnRay'));
    nodes.push(...bowLedgerNodes());
    nodes.push(moreNode(
      manyOrders ? noteNode('entryHalvesNote') : null,
      // Quoting the critical angle next to k = 0 would describe a bounce the
      // ray never makes.
      k >= 1 ? noteNode('explReflectionIsWeak', k) : null,
      noteNode('explWhyFainter'),
      el('p', { class: 'note' }, t('bowLedgerNote'))
    ));
    nodes.push(el('p', { class: 'hint' }, t('rayInfoHint')));
  }
  return nodes.filter(Boolean);
}

/* ==========================================================================
 * Droplet readout (many droplets)
 * ======================================================================== */

/** Which classification badge a delivered order deserves. */
const ORDER_CLASS = { 1: 'primary', 2: 'secondary' };

/**
 * The numbers behind one clicked droplet.
 *
 * Everything comes from dropReport(), the same call the canvas draws from,
 * so the table and the picture cannot end up disagreeing about which order
 * reaches the eye or by how much the others miss.
 */
function dropInfoNodes() {
  const rep = dropReport(state.selectedDrop);
  const hit = rep.hit;
  const missBy = rep.bands.length ? Math.min(...rep.bands.map((b) => Math.abs(b.delta))) : null;
  const third = rep.bands.find((b) => b.k === 3);
  const thirdRef = third ? third.angles.find((a) => a.lambda === 650) || third.angles[0] : null;

  return [
    el('h2', {}, t('dropInfo')),
    el('div', { class: 'panel-block' },
      row('dropSeenAt', rep.phiSeen === null ? '—' : deg(rep.phiSeen, 2)),
      row('dropDistanceRow', num(rep.distance, 3))
    ),
    el('p', { class: 'note' }, t('dropDistanceNote')),

    el('h3', {}, t('dropOrdersTitle')),
    el('table', { class: 'math-table' },
      el('thead', {}, el('tr', {},
        el('th', {}, 'k'), el('th', { class: 'bow' }, t('bowLedgerBow')), el('th', {}, 'θᵢ'), el('th', {}, 'φ'), el('th', {}, 'Δφ'))),
      el('tbody', {},
        rep.bands.map((b) => {
          const ref = b.angles.find((a) => a.lambda === 650) || b.angles[0];
          return el('tr', { class: b.reaches ? 'hit' : null },
            el('td', {}, String(b.k)),
            el('td', { class: 'bow' }, t(bowNameKey(b.k), { k: b.k })),
            el('td', {}, num(ref.geo.thetaIDeg, 1)),
            el('td', {}, `${num(b.lo, 1)}–${num(b.hi, 1)}`),
            el('td', {}, b.delta === null ? '—' : `${b.delta >= 0 ? '+' : ''}${num(b.delta, 2)}`));
        }))),

    el('div', { class: `classification cls-${hit ? ORDER_CLASS[hit.k] || 'higherOrder' : 'nonCaustic'}` },
      hit
        ? t('dropDelivers', {
            color: t(colorIdFor(hit.nearest.lambda) || 'red'),
            bow: t(bowNameKey(hit.k), { k: hit.k }),
          })
        : t('dropDeliversNone', { delta: missBy === null ? '—' : deg(missBy, 2) })),

    el('p', { class: 'note' }, t('dropPhiThetaNote')),
    noteNode('explSameSplitInSky'),
    thirdRef
      ? el('p', { class: 'note' }, t('dropHigherNote', {
          phi: deg(thirdRef.phi, 1), fromSun: deg(180 - thirdRef.phi, 1),
        }))
      : null,
    el('button', {
      class: 'btn wide', type: 'button',
      onclick: () => set({ selectedDrop: null, panel: 'guide' }),
    }, t('dropClear')),
    el('p', { class: 'hint' }, t('dropInfoHint')),
  ].filter(Boolean);
}

/* ==========================================================================
 * Clicked droplet in the 3-D field
 * ======================================================================== */

/**
 * Why THIS droplet is coloured and the one beside it is not.
 *
 * The scene answers that by drawing the beam; this answers it in numbers,
 * and it has to be the SAME answer -- so the verdict comes from
 * `fieldReport()`, which runs the identical `fieldTest` object the field
 * classified all sixty thousand droplets with.
 *
 * The table lists all three orders, not only the ones being highlighted. A
 * grey droplet that is sitting exactly on the secondary bow with the
 * secondary switched off is a different story from one that is nowhere near
 * any bow, and the reader cannot tell those apart by looking.
 */
function fieldPickNodes() {
  const rep = fieldReport(state.fieldPick);
  const cls = rep.hit ? ORDER_CLASS[rep.hit.k] || 'higherOrder' : 'nonCaustic';

  return [
    el('h2', {}, t('fieldPickInfo')),
    el('div', { class: 'panel-block' },
      row('dropSeenAt', rep.phiSeen === null ? '—' : deg(rep.phiSeen, 2)),
      row('dropDistanceRow', `${num(rep.distance * WORLD_SCALE_M, 0)} ${t('metres')}`)
    ),
    el('p', { class: 'note' }, t('fieldTestNote', { tol: deg(BOW_MATCH_DEG, 2) })),

    el('h3', {}, t('fieldBandsTitle')),
    el('table', { class: 'math-table' },
      el('thead', {}, el('tr', {},
        el('th', {}, 'k'), el('th', { class: 'bow' }, t('bowLedgerBow')), el('th', {}, 'φ'), el('th', {}, 'Δφ'))),
      el('tbody', {},
        rep.rows.map((r) =>
          el('tr', { class: r.inBand && r.shown ? 'hit' : r.shown ? null : 'off' },
            el('td', {}, String(r.k)),
            el('td', { class: 'bow' }, t(bowNameKey(r.k), { k: r.k })),
            el('td', {}, `${num(r.band.lo, 1)}–${num(r.band.hi, 1)}`),
            el('td', {}, r.gap === 0 ? '0' : `${r.gap >= 0 ? '+' : ''}${num(r.gap, 2)}`))))),

    el('div', { class: `classification cls-${cls}` },
      rep.hit
        ? t('fieldDelivers', {
            nm: String(Math.round(rep.hit.lambda)),
            color: t(nearestColorId(rep.hit.lambda) || 'red'),
            bow: t(bowNameKey(rep.hit.k), { k: rep.hit.k }),
          })
        : t('fieldDeliversNone', { delta: rep.miss ? deg(rep.miss.gap, 2) : '—' })),

    rep.hidden
      ? el('p', { class: 'note warn' },
          t('fieldHiddenOrder', { bow: t(bowNameKey(rep.hidden.k), { k: rep.hidden.k }) }))
      : null,
    el('p', { class: 'note' }, t('fieldWhyNote')),
    noteNode('explSameSplitInSky'),
    el('button', {
      class: 'btn wide', type: 'button',
      onclick: () => set({ fieldPick: null, panel: 'guide' }),
    }, t('dropClear')),
    el('p', { class: 'hint' }, t('fieldClearHint')),
  ].filter(Boolean);
}

/* ==========================================================================
 * Traced-beam readout (3-D sky)
 * ======================================================================== */

/**
 * The numbers behind one clicked point on a bow.
 *
 * The angular offsets are not looked up anywhere: each one is the angle
 * between the direction that order actually leaves the droplet in and the
 * direction of the observer, both built by the engine.
 */
function skyPickNodes() {
  const pick = state.skyPick;
  const idx = indexModel();
  const anti = O.antisolarDirection(state.sunElevation, state.sunAzimuth);
  const geo = O.rainbowGeometry(idx(pick.lambda), pick.k);
  if (!geo) return [el('h2', {}, t('skyPickInfo')), el('p', { class: 'hint' }, t('skyClickHint'))];

  const dir = O.bowDirection(anti, geo.antisolarDeg, pick.roll);
  const toEye = O.vneg(dir);
  const elevation = Math.asin(O.clamp(dir.y, -1, 1)) * O.DEG;

  const rows = DROP_ORDERS.map((k) => {
    const g = O.rainbowGeometry(idx(pick.lambda), k);
    if (!g) return null;
    const out = O.directionAtAngle(anti, toEye, g.scatteringDeg);
    return { k, g, miss: O.vangle(out, toEye) * O.DEG };
  }).filter(Boolean);

  return [
    el('h2', {}, t('skyPickInfo')),
    el('div', { class: 'panel-block' },
      row('infoWavelength', `${pick.lambda} ${t('nm')}`, { color: O.rgbCss(pick.lambda) }),
      row('skyPickOrder', `${pick.k} · ${t(bowNameKey(pick.k), { k: pick.k })}`),
      row('infoExitAngle', deg(geo.antisolarDeg, 2)),
      row('infoScattering', deg(geo.scatteringDeg, 2)),
      row('infoIncidence', deg(geo.thetaIDeg, 2)),
      row('skyPickElevation', deg(elevation, 2)),
      row('skyPickRoll', deg(pick.roll, 0))
    ),

    el('h3', {}, t('skyPickOthers')),
    el('table', { class: 'math-table' },
      el('thead', {}, el('tr', {},
        el('th', {}, 'k'), el('th', { class: 'bow' }, t('bowLedgerBow')), el('th', {}, 'φ'), el('th', {}, 'Θ'), el('th', {}, 'Δ'))),
      el('tbody', {},
        rows.map((r) => el('tr', { class: r.k === pick.k ? 'hit' : null },
          el('td', {}, String(r.k)),
          el('td', { class: 'bow' }, t(bowNameKey(r.k), { k: r.k })),
          el('td', {}, num(r.g.antisolarDeg, 2)),
          el('td', {}, num(r.g.scatteringDeg, 2)),
          el('td', {}, r.k === pick.k ? t('skyPickReaches') : t('skyPickMiss', { delta: deg(r.miss, 2) }))))))
    ,
    el('p', { class: 'note' }, t('skyPickNote', { k: pick.k })),
    noteNode('explSameSplitInSky'),
    // Same test the scene uses to cut the bow at the horizon, so the panel
    // says why the beam stopped being drawn instead of leaving it a mystery.
    !state.show.rainBelow &&
    (state.show.horizon || state.show.ground) &&
    elevation < -O.horizonDipDeg(state.observerHeight)
      ? el('p', { class: 'note warn' }, t('skyPickBelowHorizon'))
      : null,
    el('button', {
      class: 'btn wide', type: 'button',
      onclick: () => set({ skyPick: null, panel: 'guide' }),
    }, t('skyPickClear')),
  ].filter(Boolean);
}

/**
 * Two of the three scenes steer no single ray, so in those the readout is
 * about whatever the reader clicked on instead.
 */
function renderRayInfo() {
  if (state.scene === 'drops') {
    if (state.selectedDrop) return dropInfoNodes();
    return [el('h2', {}, t('dropInfo')), el('p', { class: 'hint' }, t('dropsClickHint'))];
  }
  if (state.scene === 'sky') {
    if (state.skyPick) return skyPickNodes();
    return [el('h2', {}, t('skyPickInfo')), el('p', { class: 'hint' }, t('skyClickHint'))];
  }
  // The droplet field had no branch at all, so clicking a droplet there drew
  // the beam on the canvas while this column went on describing a ray in the
  // single-droplet cross-section -- a different scene, a different droplet,
  // an impact parameter that means nothing here.
  if (state.scene === 'field') {
    if (state.fieldPick) return fieldPickNodes();
    return [el('h2', {}, t('fieldPickInfo')), el('p', { class: 'hint' }, t('fieldClickHint'))];
  }
  return rayInfoNodes();
}

/* ==========================================================================
 * Mathematics
 * ======================================================================== */

function renderMath() {
  const idx = indexModel();
  const n = idx(650);
  const k = Math.max(1, state.reflections);
  const analytic = O.rainbowIncidenceAnalytic(n, k);
  const numeric = O.rainbowIncidenceNumeric(n, k);

  const table = el('table', { class: 'math-table' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'λ'), el('th', {}, 'n'), el('th', {}, 'θᵢ'), el('th', {}, 'θᵣ'),
      el('th', {}, 'D'), el('th', {}, 'φ (k=1)'), el('th', {}, 'φ (k=2)'))),
    el('tbody', {},
      O.NAMED_COLORS.map((c) => {
        const nn = idx(c.lambda);
        const g1 = O.rainbowGeometry(nn, 1);
        const g2 = O.rainbowGeometry(nn, 2);
        return el('tr', {},
          el('td', { style: `color:${O.rgbCss(c.lambda)}` }, `${c.lambda}`),
          el('td', {}, num(nn, 4)),
          el('td', {}, num(g1.thetaIDeg, 2)),
          el('td', {}, num(g1.thetaRDeg, 2)),
          el('td', {}, num(g1.deviationDeg, 2)),
          el('td', {}, num(g1.antisolarDeg, 3)),
          el('td', {}, num(g2.antisolarDeg, 3)));
      }))
  );

  return [
    el('h2', {}, t('mathematics')),
    el('p', {}, t('mathIntro')),

    el('h3', {}, t('mathConventions')),
    el('ul', { class: 'conv' },
      el('li', {}, t('mathConvTheta')),
      el('li', {}, t('mathConvThetaR')),
      el('li', {}, t('mathConvD')),
      el('li', {}, t('mathConvTheta2')),
      el('li', {}, t('mathConvPhi'))),
    el('p', { class: 'note warn' }, t('mathWarning')),

    el('h3', {}, t('mathDeviation')),
    el('div', { class: 'formula' }, 'D_k(θᵢ) = 2 (θᵢ − θᵣ) + k (180° − 2 θᵣ)'),
    el('p', { class: 'note' }, t('mathDeviationNote')),

    el('h3', {}, t('mathExtremum')),
    el('div', { class: 'formula' }, 'dD_k/dθᵢ = 2 − 2(k+1) · dθᵣ/dθᵢ = 0'),
    el('p', { class: 'note' }, t('mathExtremumNote')),
    el('div', { class: 'formula' }, 'cos²θᵢ = (n² − 1) / ((k+1)² − 1)'),

    el('h3', {}, t('mathResult')),
    el('div', { class: 'panel-block' },
      row('infoIndex', `${num(n, 4)}  (λ = 650 ${t('nm')})`),
      row('infoReflections', String(k)),
      row('infoIncidence', deg(analytic * O.DEG, 4)),
      row('infoExitAngle', deg(O.rainbowGeometry(n, k).antisolarDeg, 4))),
    el('p', { class: 'note' }, t('mathResultNote')),

    el('h3', {}, t('mathNumericCheck')),
    el('p', { class: 'note' }, t('mathNumericNote')),
    el('div', { class: 'panel-block' },
      row('infoIncidence', `${deg(numeric * O.DEG, 6)}  (Δ = ${num(Math.abs(numeric - analytic) * O.DEG, 6)}°)`)),

    el('h3', {}, t('mathResult')),
    table,

    el('h3', {}, t('mathIntensityTitle')),
    el('p', { class: 'note' }, t('mathIntensityNote')),
    ...bowLedgerNodes(),
    el('h3', {}, t('mathLimits')),
    el('p', { class: 'note' }, t('mathLimitsNote')),
    el('p', { class: 'note' }, t('dropletSizeNote')),
  ];
}

/* ==========================================================================
 * Questions
 * ======================================================================== */

const QUESTIONS = [
  ['q1', 'a1'], ['q2', 'a2'], ['q3', 'a3'], ['q4', 'a4'],
  ['q5', 'a5'], ['q6', 'a6'], ['q7', 'a7'],
];

function renderQuiz() {
  return [
    el('h2', {}, t('quiz')),
    el('p', { class: 'note' }, t('quizIntro')),
    ...QUESTIONS.map(([q, a]) => {
      const answer = el('p', { class: 'answer hidden' }, t(a));
      const btn = el('button', {
        class: 'chip', type: 'button',
        onclick: () => {
          const hidden = answer.classList.toggle('hidden');
          btn.textContent = hidden ? t('showAnswer') : t('hideAnswer');
        },
      }, t('showAnswer'));
      return el('div', { class: 'qa' }, el('h3', {}, t(q)), btn, answer);
    }),
  ];
}

/* ==========================================================================
 * Panel shell
 * ======================================================================== */

export function renderPanel(container) {
  container.textContent = '';
  const tabs = segmented(
    [
      { value: 'guide', labelKey: state.mode === 'tutorial' ? 'tutorial' : 'explanation' },
      { value: 'ray', labelKey: 'rayInfo' },
      { value: 'math', labelKey: 'mathematics' },
      { value: 'quiz', labelKey: 'quiz' },
    ],
    state.panel,
    (v) => set({ panel: v }),
    { wrap: true }
  );
  container.append(tabs);

  const body = el('div', { class: 'panel-body' });
  let nodes;
  if (state.panel === 'ray') nodes = renderRayInfo();
  else if (state.panel === 'math') nodes = renderMath();
  else if (state.panel === 'quiz') nodes = renderQuiz();
  else nodes = state.mode === 'tutorial' ? renderTutorial() : renderFreeGuide();
  body.append(...nodes.filter(Boolean));
  container.append(body);
}
