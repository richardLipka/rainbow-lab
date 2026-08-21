/**
 * panels.js -- the explanation column: tutorial, ray readout, mathematics
 * and the question set. All text comes from i18n.
 */
import * as O from './optics.js';
import { state, set, indexModel, activeLambdas } from './state.js';
import { t, deg, num, CLASS_KEY, CLASS_EXPLAIN } from './i18n.js';
import { el, row, segmented } from './ui.js';
import { traceOne, distanceFromExtremum } from './rays.js';

/* ==========================================================================
 * Tutorial
 * ======================================================================== */

export const TUTORIAL = [
  {
    title: 's1title', body: 's1body',
    apply: {
      scene: 'droplet', graph: 'exit', reflections: 0, dispersion: 0, wavelength: 'white',
      impact: 0.6, fanCount: 0, showNonRainbow: false, angleMode: 'antisolar',
      show: { angles: false, normals: false, labels: true, renderedBow: false },
      families: { 0: true, 1: false, 2: false, 3: false },
    },
  },
  {
    title: 's2title', body: 's2body',
    apply: {
      scene: 'droplet', reflections: 0, show: { angles: true, normals: true },
      families: { 0: true, 1: false, 2: false, 3: false },
    },
    actions: [
      { label: 'b/R = 0.2', patch: { impact: 0.2 } },
      { label: 'b/R = 0.6', patch: { impact: 0.6 } },
      { label: 'b/R = 0.95', patch: { impact: 0.95 } },
    ],
  },
  {
    title: 's3title', body: 's3body',
    apply: {
      scene: 'droplet', reflections: 1, impact: 0.7, showNonRainbow: true,
      families: { 0: false, 1: true, 2: false, 3: false },
      show: { normals: false, angles: true },
    },
  },
  {
    title: 's4title', body: 's4body',
    apply: { scene: 'droplet', reflections: 1, showNonRainbow: false, panel: 'guide', show: { angles: true } },
    actions: [{ labelKey: 'extremumLabel', patch: { impact: 0.861 } }],
    showRay: true,
  },
  {
    title: 's5title', body: 's5body',
    apply: { scene: 'droplet', graph: 'exit', reflections: 1, fanCount: 9, panel: 'guide' },
    actions: [
      { label: '1', patch: { fanCount: 0 } },
      { label: '9', patch: { fanCount: 9 } },
      { label: '25', patch: { fanCount: 25 } },
    ],
  },
  {
    title: 's6title', body: 's6body',
    apply: { scene: 'droplet', graph: 'dist', reflections: 1, fanCount: 25, distRays: 40 },
    actions: [
      { label: '10', patch: { distRays: 10 } },
      { label: '100', patch: { distRays: 100 } },
      { label: '1 000', patch: { distRays: 1000 } },
      { label: '100 000', patch: { distRays: 100000 } },
    ],
    note: 'explCaustic',
  },
  {
    title: 's7title', body: 's7body',
    apply: {
      scene: 'drops', graph: 'dist', dropCount: 1, dropsAnimate: true,
      show: { droplets: true, primary: true, secondary: false },
    },
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
    title: 's8title', body: 's8body',
    apply: {
      scene: 'sky', view: 'orbit', sunElevation: 15,
      show: { cone: true, horizon: false, ground: false, antisolar: true, primary: true, secondary: false, renderedBow: false },
    },
    actions: [
      { labelKey: 'showCone', patch: { show: { cone: true } } },
      { labelKey: 'showHorizon', patch: { show: { horizon: true, ground: true } } },
      { labelKey: 'viewEye', patch: { view: 'eye' } },
    ],
  },
  {
    title: 's9title', body: 's9body',
    apply: {
      scene: 'droplet', graph: 'exit', wavelength: 'white', dispersion: 0, reflections: 1,
      show: { wavelengthLabels: true },
    },
    actions: [
      { label: '0 %', patch: { dispersion: 0 } },
      { label: '50 %', patch: { dispersion: 0.5 } },
      { label: '100 %', patch: { dispersion: 1 } },
    ],
  },
  {
    title: 's10title', body: 's10body',
    apply: {
      scene: 'sky', view: 'eye', dispersion: 1, wavelength: 'white', reflections: 2,
      families: { 0: false, 1: true, 2: true, 3: false },
      show: {
        primary: true, secondary: true, alexander: true, horizon: true, ground: true,
        renderedBow: true, cone: false, wavelengthLabels: true,
      },
    },
    actions: [
      { labelKey: 'showRenderedBow', patch: { show: { renderedBow: true } } },
      { labelKey: 'showAlexander', patch: { show: { alexander: true } } },
      { labelKey: 'showCone', patch: { show: { cone: true } } },
    ],
    note: 'explAlexander',
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
          el('button', { class: 'chip', type: 'button', onclick: () => set(a.patch) },
            a.labelKey ? t(a.labelKey) : a.label)
        ))
    );
  }
  if (s.showRay) nodes.push(...rayInfoNodes({ compact: true }));
  if (s.note) nodes.push(el('p', { class: 'note' }, t(s.note)));

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
    el('div', { class: `classification cls-${cls}` }, t(CLASS_KEY[cls] || 'classNonCaustic')),
  ];
  if (CLASS_EXPLAIN[cls]) nodes.push(el('p', { class: 'note' }, t(CLASS_EXPLAIN[cls])));
  if (cls === 'nonCaustic' && k === 1) {
    nodes.push(el('p', { class: 'note' }, t('explNotOneReflection')));
  }
  if (!opts.compact) nodes.push(el('p', { class: 'hint' }, t('rayInfoHint')));
  return nodes.filter(Boolean);
}

const renderRayInfo = () => rayInfoNodes();

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
