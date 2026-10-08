/**
 * panels.js -- the explanation column: tutorial, ray readout, mathematics
 * and the question set. All text comes from i18n.
 */
import * as O from './optics.js';
import { state, set, indexModel, activeLambdas, activeOrders, resetPatch } from './state.js';
import { t, deg, num, CLASS_KEY, CLASS_EXPLAIN } from './i18n.js';
import { el, row, segmented, mathml, M } from './ui.js';
import {
  traceOne, distanceFromExtremum, dropReport, colorIdFor, DROP_ORDERS,
  orderLedger, bowNameKey, fieldReport, BOW_MATCH_DEG, nearestColorId, bowEntry,
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
    /* The destination, first. Both bows, each fed by its own half of the
       face, each with its own eye -- because the gap the sky shows is 8 deg
       and the picture has to start by being that picture. */
    title: 's1title', body: 's1body',
    apply: {
      scene: 'droplet', reflections: 2, wavelength: 'white', dispersion: 1,
      impact: 0.861, fanCount: 12, sunElevation: 0,
      // The arc and the band each get their own step later; here they are
      // the clutter between the reader and "two bows, two observers".
      show: { angles: false, walls: false, alexander: false, arrival: false },
    },
    focus: ['reflections', 'bowRays'],
    actions: [
      { labelKey: 'bowName1', patch: () => ({ impact: bowEntry(1, indexModel()(650)) }) },
      { labelKey: 'bowName2', patch: () => ({ impact: bowEntry(2, indexModel()(650)) }) },
    ],
    note: 'explOppositeHalves',
  },
  {
    /* Why one eye and not two. Each bow ray carries on for ever, so any
       distance along it sees that bow; both at once needs the one place the
       two rays cross, 12.2 radii out. */
    title: 's1ctitle', body: 's1cbody',
    apply: {
      scene: 'droplet', reflections: 2, impact: 0.861, fanCount: 0,
      dropletZoom: 25, sunElevation: 0,
      show: { angles: false, walls: false, alexander: false, arrival: false, meetingEye: true },
    },
    focus: ['impactParameter', 'dropletZoom'],
    actions: [
      { labelKey: 'bowName1', patch: () => ({ impact: bowEntry(1, indexModel()(650)) }) },
      { labelKey: 'bowName2', patch: () => ({ impact: bowEntry(2, indexModel()(650)) }) },
      { labelKey: 'eyeMeeting', flags: ['meetingEye'] },
    ],
    note: 'explMeetingPoint',
  },
  {
    /* Back to the beginning: one drop, one ray, no reflection at all. */
    title: 's1btitle', body: 's1bbody',
    apply: {
      scene: 'droplet', reflections: 0, dispersion: 0, impact: 0.6,
      sunElevation: 0, show: { angles: false, arrival: false },
    },
    focus: ['impactParameter', 'wavelength'],
  },
  {
    title: 's2title', body: 's2body',
    apply: {
      scene: 'droplet', reflections: 0, impact: 0.6, dispersion: 0,
      sunElevation: 0, show: { angles: true, normals: true, arrival: false },
    },
    focus: ['impactParameter', 'showNormals', 'showAngles'],
    actions: [
      { label: 'b/R = 0.2', patch: { impact: 0.2 } },
      { label: 'b/R = 0.6', patch: { impact: 0.6 } },
      { label: 'b/R = 0.95', patch: { impact: 0.95 } },
    ],
  },
  {
    /* Two bounces, not one: the body walks R0 -> R1 -> R2 -> R3, and a
       single reflection only ever produces three segments. */
    title: 's3title', body: 's3body',
    apply: {
      scene: 'droplet', reflections: 2, impact: 0.7, sunElevation: 0,
      show: { normals: false, angles: true, walls: true, arrival: false },
    },
    focus: ['reflections', 'showWalls', 'impactParameter'],
    note: ['explReflectionIsWeak', 'explNoTotalReflection'],
    showRay: true,
  },
  {
    /* Deliberately off the bow: an angle that is already the answer has
       nothing to demonstrate, and the chip is what makes 42 a measurement. */
    title: 's4title', body: 's4body',
    apply: {
      scene: 'droplet', reflections: 1, impact: 0.6, sunElevation: 0,
      show: { angles: true, arrival: false },
    },
    focus: ['impactParameter', 'showAngles'],
    note: 'explObserverAngle',
    actions: [{
      labelKey: 'extremumLabel',
      patch: () => ({ impact: bowEntry(1, indexModel()(650)) }),
    }],
    showRay: true,
  },
  {
    title: 's5title', body: 's5body',
    apply: {
      scene: 'droplet', graph: 'exit', graphOpen: true, reflections: 1,
      fanCount: 9, sunElevation: 0, show: { arrival: false, walls: false },
    },
    focus: ['fanCount', 'impactParameter', 'reflections'],
    actions: [
      { label: '1', patch: { fanCount: 0 } },
      { label: '9', patch: { fanCount: 9 } },
      { label: '25', patch: { fanCount: 25 } },
      { labelKey: 'chipRefl1', patch: { reflections: 1, families: { 0: false, 1: true, 2: false, 3: false } } },
      { labelKey: 'chipRefl2', patch: { reflections: 2, families: { 0: false, 1: true, 2: true, 3: false } } },
      { labelKey: 'chipRefl3', patch: { reflections: 3, families: { 0: false, 1: true, 2: true, 3: true } } },
    ],
  },
  {
    /* The pile-up, counted on the canvas. One wavelength, because the arc
       is a density display and six overlapping spectra make the count a
       guess. Starts sparse on purpose: four rays each leave in their own
       direction, and only as the count climbs do they stack. */
    title: 's6title', body: 's6body',
    apply: {
      scene: 'droplet', reflections: 1, fanCount: 16, wavelength: 650,
      impact: 0.861, dropletZoom: 2.6, sunElevation: 0,
      show: { angles: true, arrival: true, walls: false },
    },
    focus: ['fanCount', 'showArrival', 'impactParameter'],
    actions: [
      { label: '4', patch: { fanCount: 4 } },
      { label: '16', patch: { fanCount: 16 } },
      { label: '60', patch: { fanCount: 60 } },
      { labelKey: 'showArrival', flags: ['arrival'] },
    ],
    note: 'explArrivalArc',
  },
  {
    title: 's7title', body: 's7body',
    apply: {
      scene: 'droplet', graph: 'dist', graphOpen: true, reflections: 1,
      fanCount: 25, distRays: 2000, sunElevation: 0,
      show: { walls: false },
    },
    focus: ['rayCount'],
    actions: [
      { label: '10', patch: { distRays: 10 } },
      { label: '100', patch: { distRays: 100 } },
      { label: '1 000', patch: { distRays: 1000 } },
      { label: '100 000', patch: { distRays: 100000 } },
    ],
    note: ['explCaustic', 'explEnergyPlot'],
  },
  {
    title: 's8title', body: 's8body',
    apply: {
      scene: 'drops', dropCount: 1, dropsAnimate: true,
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
    /* The bow is not a place. Nothing about the rain changes here -- only
       where the reader stands -- and a different set of droplets lights up. */
    title: 's9title', body: 's9body',
    apply: {
      scene: 'drops', dropCount: 1500, sunElevation: 15,
      show: { droplets: true, primary: true, secondary: false, ground: true },
    },
    focus: ['observerDepth', 'observerRise', 'sunElevation'],
    actions: [
      { labelKey: 'observerRecentre', patch: { dropsObserverX: 0, dropsObserverY: 0, sunElevation: 15 } },
      { labelKey: 'obsChipForward', patch: { dropsObserverX: 0.45 } },
      { labelKey: 'obsChipUp', patch: { dropsObserverY: 0.28 } },
      { labelKey: 'obsChipDown', patch: { dropsObserverY: -0.09 } },
      { labelKey: 'chipSunHigh', patch: { sunElevation: 35 } },
    ],
    note: 'explBowFollowsYou',
  },
  {
    /* The flat scene's argument with the cross-section taken away. Nothing
       here draws a circle: the arc is however many droplets answered yes. */
    title: 's10title', body: 's10body',
    apply: {
      scene: 'field', view: 'eye', eyeAzimuth: 0, eyeElevation: 14, fov: 110,
      sunElevation: 15, observerHeight: 1.7, fieldCount: 60000,
      show: {
        droplets: true, primary: true, secondary: true, higher: false,
        ground: true, horizon: true, rainBelow: false, antisolar: true,
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
      scene: 'sky', view: 'orbit', sunElevation: 15,
      show: {
        cone: true, horizon: false, ground: false, antisolar: true,
        primary: true, secondary: false, renderedBow: false,
      },
    },
    focus: ['showCone', 'showHorizon', 'viewMode'],
    actions: [
      { labelKey: 'showCone', flags: ['cone'] },
      { labelKey: 'showHorizon', flags: ['horizon', 'ground'] },
      { labelKey: 'viewOrbit', patch: { view: 'orbit' } },
      { labelKey: 'viewEye', patch: { view: 'eye' } },
    ],
  },
  {
    /* Why an arc and not a ring -- and the camera has to be pointed where
       the answer is. At the default look-up the ring closes OFF SCREEN: the
       readout went from 40 % to 100 % while the picture did not change, so
       the chips looked broken. Centred on the antisolar point with a wide
       field, the arc visibly becomes a circle. */
    title: 's11btitle', body: 's11bbody',
    apply: {
      scene: 'sky', view: 'eye', sunElevation: 15, observerHeight: 1.7,
      eyeElevation: -15, fov: 120, reflections: 1,
      show: {
        primary: true, secondary: false, cone: false, horizon: true,
        ground: true, rainBelow: false, renderedBow: true, antisolar: true,
      },
    },
    focus: ['observerHeight', 'rainBelow'],
    actions: [
      { labelKey: 'rainBelow', flags: ['rainBelow'] },
      { label: '1.7 m', patch: { observerHeight: 1.7 } },
      { label: '300 m', patch: { observerHeight: 300, show: { rainBelow: true } } },
      { label: '1 km', patch: { observerHeight: 1000, show: { rainBelow: true } } },
      { label: '3 km', patch: { observerHeight: 3000, show: { rainBelow: true } } },
    ],
    note: 'explFullCircle',
  },
  {
    /* Two observers of the SAME bow. The reader stays on the ground -- that
       is the whole comparison -- and the chips fly the aircraft. */
    title: 's11ctitle', body: 's11cbody',
    apply: {
      scene: 'sky', view: 'eye', sunElevation: 15, observerHeight: 1.7,
      airHeight: 3000, eyeElevation: -15, fov: 120, reflections: 2,
      wavelength: 'white', dispersion: 1,
      show: {
        primary: true, secondary: true, airObserver: true, alexander: true,
        cone: false, horizon: true, ground: true, rainBelow: false,
        renderedBow: false, antisolar: true,
      },
    },
    focus: ['showAirObserver', 'airHeight', 'observerHeight'],
    actions: [
      { labelKey: 'showAirObserver', flags: ['airObserver'] },
      { label: '1 km', patch: { airHeight: 1000 } },
      { label: '3 km', patch: { airHeight: 3000 } },
      { label: '10 km', patch: { airHeight: 10000 } },
      { labelKey: 'chipClimbThere', patch: { observerHeight: 3000, show: { rainBelow: true } } },
      { labelKey: 'chipBackDown', patch: { observerHeight: 1.7, show: { rainBelow: false } } },
    ],
    note: 'explAirObserver',
  },
  {
    /* Colour, with the histogram already open: the step is about every
       wavelength getting its own angle, and that is a thing you read off
       the plot rather than off a single split ray. */
    title: 's12title', body: 's12body',
    apply: {
      scene: 'droplet', graph: 'dist', graphOpen: true, wavelength: 'white',
      dispersion: 1, reflections: 1, fanCount: 0, dropletZoom: 9,
      distRays: 2000, sunElevation: 0,
      show: { wavelengthLabels: true, angles: true, walls: false },
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
    /* The higher orders, built rather than announced: same drop, same
       geometry, a different place to land. */
    title: 's13atitle', body: 's13abody',
    apply: {
      scene: 'droplet', wavelength: 650, dispersion: 1, reflections: 2,
      fanCount: 36, dropletZoom: 2.2, sunElevation: 0,
      show: { angles: false, arrival: true, alexander: false, walls: false },
    },
    compute: () => ({ impact: bowEntry(2, indexModel()(650)) }),
    focus: ['impactParameter', 'bowRays', 'reflections'],
    actions: [
      { labelKey: 'bowName1', patch: () => ({ impact: bowEntry(1, indexModel()(650)) }) },
      { labelKey: 'bowName2', patch: () => ({ impact: bowEntry(2, indexModel()(650)) }) },
      { labelKey: 'chipRefl3', patch: { reflections: 3, families: { 0: false, 1: true, 2: true, 3: true } } },
    ],
    note: ['coneSliceNote', 'explOppositeHalves', 'explWhyFainter'],
    showRay: true,
  },
  {
    /* Why the colours run the other way. Both curves are on the plot the
       moment two orders are active; this step opens it and says what to
       look at, and the histogram chip shows where each colour lands. */
    title: 's13btitle', body: 's13bbody',
    apply: {
      scene: 'droplet', graph: 'exit', graphOpen: true, angleMode: 'antisolar',
      wavelength: 'white', dispersion: 1, reflections: 2, fanCount: 0,
      distRays: 2000, sunElevation: 0,
      show: { wavelengthLabels: true, arrival: false, walls: false },
    },
    // NOT angleConvention: it lives in the exit plot's own tab bar, so this
    // step's "switch to the histogram" chip takes it off screen and
    // applyFocus() rightly complains about a step pointing at a control that
    // is no longer there.
    focus: ['dispersion', 'impactParameter'],
    actions: [
      { labelKey: 'chipPlotExit', patch: { graph: 'exit' } },
      { labelKey: 'chipPlotDist', patch: { graph: 'dist' } },
      { labelKey: 'bowName1', patch: () => ({ impact: bowEntry(1, indexModel()(650)) }) },
      { labelKey: 'bowName2', patch: () => ({ impact: bowEntry(2, indexModel()(650)) }) },
    ],
    note: 'explColourFlip',
  },
  {
    /* Alexander's band, with the arrival arc on -- the gap between the two
       profiles IS the band, counted by the rays rather than shaded in. */
    title: 's13ctitle', body: 's13cbody',
    apply: {
      scene: 'droplet', wavelength: 650, dispersion: 1, reflections: 2,
      fanCount: 24, dropletZoom: 3, sunElevation: 0,
      show: { angles: false, alexander: true, arrival: true, walls: false },
    },
    compute: () => ({ impact: bowEntry(2, indexModel()(650)) }),
    focus: ['showArrival', 'showAlexander', 'impactParameter'],
    actions: [
      { labelKey: 'showArrival', flags: ['arrival'] },
      { labelKey: 'showAlexander', flags: ['alexander'] },
      { labelKey: 'bowName1', patch: () => ({ impact: bowEntry(1, indexModel()(650)) }) },
      { labelKey: 'bowName2', patch: () => ({ impact: bowEntry(2, indexModel()(650)) }) },
    ],
    note: 'explAlexander',
    showRay: true,
  },
  {
    title: 's13title', body: 's13body',
    apply: {
      scene: 'sky', view: 'eye', dispersion: 1, wavelength: 'white',
      reflections: 2, observerHeight: 1.7, sunElevation: 15,
      show: {
        primary: true, secondary: true, alexander: true, horizon: true,
        ground: true, renderedBow: true, cone: false, wavelengthLabels: true,
        rainBelow: false, airObserver: false,
      },
    },
    focus: ['showSecondary', 'showAlexander', 'showRenderedBow'],
    actions: [
      { labelKey: 'showRenderedBow', flags: ['renderedBow'] },
      { labelKey: 'showAlexander', flags: ['alexander'] },
      { labelKey: 'showCone', flags: ['cone'] },
      { labelKey: 'mat_water', patch: { material: 'water' } },
      { labelKey: 'mat_ice', patch: { material: 'ice' } },
      { labelKey: 'mat_crown', patch: { material: 'crown' } },
    ],
    note: ['explAlexander', 'explWhyFainter', 'explMaterials'],
  },
];

export function applyStep(i) {
  const s = TUTORIAL[i];
  if (!s) return;
  /*
   * Every step starts from the defaults, not from wherever the reader left
   * the controls.
   *
   * Pinning field by field was the old rule and it kept failing in the same
   * way: a step that did not mention the beam count, the material or the
   * dispersion inherited them, so the picture a step was written around
   * depended on what the reader had been playing with two steps earlier --
   * a 60-ray beam over a step about one path, a glass drop under a sentence
   * quoting water's 42 degrees. Starting from the baseline makes the
   * omission harmless: a step now declares what it is ABOUT and gets the
   * defaults for everything else.
   *
   * `scene` is not in the baseline (Reset deliberately leaves the reader
   * where they are), so it is defaulted here instead, and `panel` goes back
   * to the guide -- clicking a ray jumps the column to the ray readout, and
   * the next step must not open behind it.
   */
  const base = resetPatch();
  // `apply` is a literal, so a step that needs a value out of the engine --
  // an entry point, a bow angle -- supplies `compute()` instead of writing
  // the number down. Applied after `apply`, so it wins.
  const computed = typeof s.compute === 'function' ? s.compute() : null;
  // activeOrders() reads `families`, not `reflections`, so a step that sets
  // the count without the families would trace the wrong set. Derive it,
  // cumulatively, the way the control does. A step that states its own
  // families still wins.
  const k = s.apply.reflections;
  const families = s.apply.families
    ? { ...base.families, ...s.apply.families }
    : (k === undefined
      ? base.families
      : { 0: k === 0, 1: k >= 1, 2: k >= 2, 3: k >= 3 });
  set({
    ...base,
    scene: 'droplet',
    panel: 'guide',
    ...s.apply,
    ...computed,
    show: { ...base.show, ...(s.apply.show || {}) },
    families,
    step: i,
  });
}

/**
 * One chip in a step's action row.
 *
 * Two kinds. A `patch` chip sets something and is done -- a beam count, an
 * entry point, an altitude -- and may be a function when the value has to
 * come out of the engine rather than be written down as a literal.
 *
 * A `flags` chip switches a visualisation on AND off again, and shows which
 * it currently is. Every one of these used to be a one-way patch: the step
 * that says "switch the horizon on and the circle becomes an arc" set
 * horizon to true and offered no way back, and the steps whose `apply`
 * already turned the flag on offered a chip that did visibly nothing at
 * all. Reported, twice. The active class needs a sync(): what is on screen
 * changes from the control column too, and the panel is not rebuilt for it.
 */
function stepChip(a) {
  const flags = a.flags || (a.flag ? [a.flag] : null);
  const node = el('button', {
    class: 'chip', type: 'button',
    onclick: flags
      ? () => {
        const next = !state.show[flags[0]];
        set({ show: Object.fromEntries(flags.map((f) => [f, next])) });
      }
      : () => set(typeof a.patch === 'function' ? a.patch() : a.patch),
  }, a.labelKey ? t(a.labelKey) : a.label);
  if (flags) {
    node.sync = () => node.classList.toggle('active', !!state.show[flags[0]]);
    node.sync();
  }
  return node;
}

function renderTutorial() {
  const s = TUTORIAL[state.step];
  const nodes = [
    el('div', { class: 'step-counter' }, `${t('step')} ${state.step + 1} ${t('of')} ${TUTORIAL.length}`),
    el('h2', {}, t(s.title)),
    // A step's body is one string with blank lines in it, rendered as real
    // paragraphs. Run together in a single <p> the longer steps read as a
    // wall, and the breaks are where the argument turns.
    ...t(s.body).split('\n\n').map((para) => el('p', {}, para)),
  ];
  if (s.actions) {
    nodes.push(el('div', { class: 'action-row' }, s.actions.map(stepChip)));
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
  // Every value here is read out of the engine, so a material that has no
  // such bow prints that rather than a number -- which is the honest answer
  // and also the only one that does not throw.
  const band = O.alexandersBand(idx);
  return [
    el('h2', {}, t('reconstructTitle')),
    el('p', { class: 'chain' }, t('reconstructBody')),
    el('div', { class: 'panel-block' },
      el('h3', {}, t('notHardCoded')),
      row('primaryRainbow', p ? deg(p.antisolarDeg, 2) : t('noBowHere')),
      row('secondaryRainbow', s ? deg(s.antisolarDeg, 2) : t('noBowHere')),
      row('showAlexander', band
        ? `${deg(band.innerDeg, 1)} – ${deg(band.outerDeg, 1)}`
        : t('noBowHere'))
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
  if (key === 'explColourFlip' || key === 'explAlexander') {
    // Where each colour turns over, for each order. The whole reversal is in
    // these four numbers and nothing else, so they come from the engine.
    const turn = (lam, order) => {
      const g = O.rainbowGeometry(idx(lam), order);
      return g ? g.antisolarDeg : null;
    };
    const p1 = turn(650, 1);
    const p2 = turn(650, 2);
    const v1 = turn(420, 1);
    const v2 = turn(420, 2);
    if (p1 === null || p2 === null) return null;
    if (key === 'explAlexander') return { inner: deg(p1, 2), outer: deg(p2, 2) };
    return {
      p1: deg(p1, 2), p2: deg(p2, 2), v1: deg(v1, 2), v2: deg(v2, 2),
      gap: deg(p2 - p1, 2),
    };
  }
  if (key === 'explBowNeedsOwnRay' || key === 'explOppositeHalves') {
    const g1 = O.rainbowGeometry(idx(650), 1);
    const g2 = O.rainbowGeometry(idx(650), 2);
    if (!g1 || !g2) return null;
    return { b1: num(g1.impactParameter, 3), b2: num(g2.impactParameter, 3) };
  }
  if (key === 'explNoTotalReflection') {
    const light = O.bowBrightness(idx(650), Math.max(1, k));
    if (!light || light.criticalDeg === null) return null;
    return {
      crit: deg(light.criticalDeg, 2),
      theta: deg(light.internalDeg, 2),
      refl: `${num(light.R * 100, 1)} %`,
    };
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
      dist === null ? null : row('infoDistanceFromBow', `${dist >= 0 ? '+' : ''}${num(dist, 2)}°`),
      // The caustic as a number: this is what falls to zero at the bow, and
      // it is the answer to "why does the secondary's ray point somewhere
      // unrelated?" -- away from its own bow it swings about 2.5x faster
      // than the primary's.
      (() => {
        const sw = k >= 1 ? O.exitSwing(n, k, Math.abs(b)) : null;
        if (sw === null) return null;
        const per = sw / 100;
        return row('infoSwing', per < 0.05
          ? `${num(per, 2)}° · ${t('infoSwingStopped')}`
          : `${num(per, 2)}°`, { color: per < 0.05 ? 'var(--accent)' : null });
      })()
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
    // The three claims that have to be read, in the open and in this order:
    // one ray makes every order; a bow still needs its own ray; and the two
    // bows reaching one eye came in through opposite halves of the drop.
    // The last one is what sends people off to check against a textbook.
    if (manyOrders) {
      nodes.push(noteNode('coneSliceNote'), noteNode('explBowNeedsOwnRay'),
        noteNode('explOppositeHalves'));
    }
    nodes.push(...bowLedgerNodes());
    nodes.push(moreNode(
      manyOrders ? noteNode('entryHalvesNote') : null,
      noteNode('explNoTotalReflection'),
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
        // A dash rather than a crash: above n = 2 the one-bounce bow has no
        // turning point to tabulate.
        const cell = (g, pick, digits) => el('td', {}, g ? num(pick(g), digits) : '—');
        return el('tr', {},
          el('td', { style: `color:${O.rgbCss(c.lambda)}` }, `${c.lambda}`),
          el('td', {}, num(nn, 4)),
          cell(g1, (g) => g.thetaIDeg, 2),
          cell(g1, (g) => g.thetaRDeg, 2),
          cell(g1, (g) => g.deviationDeg, 2),
          cell(g1, (g) => g.antisolarDeg, 3),
          cell(g2, (g) => g.antisolarDeg, 3));
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
    mathml('<mrow><msub><mi>D</mi><mi>k</mi></msub><mo>(</mo><msub><mi>&#x3B8;</mi><mi>i</mi></msub><mo>)</mo><mo>=</mo><mn>2</mn><mo>(</mo><msub><mi>&#x3B8;</mi><mi>i</mi></msub><mo>&#x2212;</mo><msub><mi>&#x3B8;</mi><mi>r</mi></msub><mo>)</mo><mo>+</mo><mi>k</mi><mo>(</mo><mn>180</mn><mo>&#xB0;</mo><mo>&#x2212;</mo><mn>2</mn><msub><mi>&#x3B8;</mi><mi>r</mi></msub><mo>)</mo></mrow>'),
    el('p', { class: 'note' }, t('mathDeviationNote')),

    el('h3', {}, t('mathExtremum')),
    mathml('<mrow><mfrac><mrow><mi>d</mi><msub><mi>D</mi><mi>k</mi></msub></mrow><mrow><mi>d</mi><msub><mi>&#x3B8;</mi><mi>i</mi></msub></mrow></mfrac><mo>=</mo><mn>2</mn><mo>&#x2212;</mo><mn>2</mn><mo>(</mo><mi>k</mi><mo>+</mo><mn>1</mn><mo>)</mo><mo>&#x22C5;</mo><mfrac><mrow><mi>d</mi><msub><mi>&#x3B8;</mi><mi>r</mi></msub></mrow><mrow><mi>d</mi><msub><mi>&#x3B8;</mi><mi>i</mi></msub></mrow></mfrac><mo>=</mo><mn>0</mn></mrow>'),
    el('p', { class: 'note' }, t('mathExtremumNote')),
    mathml('<mrow><msup><mrow><mi>cos</mi></mrow><mn>2</mn></msup><mo>&#x2061;</mo><msub><mi>&#x3B8;</mi><mi>i</mi></msub><mo>=</mo><mfrac><mrow><msup><mi>n</mi><mn>2</mn></msup><mo>&#x2212;</mo><mn>1</mn></mrow><mrow><msup><mrow><mo>(</mo><mi>k</mi><mo>+</mo><mn>1</mn><mo>)</mo></mrow><mn>2</mn></msup><mo>&#x2212;</mo><mn>1</mn></mrow></mfrac></mrow>'),

    el('h3', {}, t('mathResult')),
    el('div', { class: 'panel-block' },
      row('infoIndex', `${num(n, 4)}  (λ = 650 ${t('nm')})`),
      row('infoReflections', String(k)),
      row('infoIncidence', deg(analytic * O.DEG, 4)),
      row('infoExitAngle', (() => {
        const g = O.rainbowGeometry(n, k);
        return g ? deg(g.antisolarDeg, 4) : t('noBowHere');
      })())),
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
  // Clicking a ray, a droplet or a bow jumps this panel to "Ray data", which
  // in guided mode silently replaces the step the reader was on. The tab
  // still reads "Tutorial", but nothing says which step, and getting back
  // means noticing that tab and guessing. So the tour announces itself and
  // offers the way back.
  if (state.mode === 'tutorial' && state.panel !== 'guide') {
    body.append(el('div', { class: 'tour-banner' },
      el('span', {}, t('tourHere', { n: state.step + 1, total: TUTORIAL.length })),
      el('button', {
        class: 'btn tiny', type: 'button',
        onclick: () => set({ panel: 'guide' }),
      }, t('tourBack'))));
  }
  let nodes;
  if (state.panel === 'ray') nodes = renderRayInfo();
  else if (state.panel === 'math') nodes = renderMath();
  else if (state.panel === 'quiz') nodes = renderQuiz();
  else nodes = state.mode === 'tutorial' ? renderTutorial() : renderFreeGuide();
  body.append(...nodes.filter(Boolean));
  container.append(body);
}
