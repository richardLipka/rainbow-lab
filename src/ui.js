/**
 * ui.js -- tiny DOM helpers and reusable, language-agnostic controls.
 * Controls are given translation KEYS, never literal text.
 */
import { t } from './i18n.js';

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style') node.setAttribute('style', v);
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const clear = (node) => {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
};

/** A titled, collapsible group of controls. */
export function group(titleKey, ...children) {
  const body = el('div', { class: 'group-body' }, ...children);
  const head = el(
    'button',
    {
      class: 'group-head',
      type: 'button',
      onclick: () => {
        const open = body.classList.toggle('collapsed');
        head.classList.toggle('closed', open);
      },
    },
    el('span', { class: 'group-caret' }),
    el('span', {}, t(titleKey))
  );
  return el('section', { class: 'group' }, head, body);
}

/**
 * Every control carries a `.sync()` that pushes the current state back into
 * the DOM element. That way a tutorial step (or any programmatic change) can
 * update the controls without rebuilding them -- rebuilding would interrupt a
 * drag in progress and lose keyboard focus.
 */
export function collectSyncers(root, out = []) {
  if (root.sync) out.push(root.sync);
  for (const child of root.children) collectSyncers(child, out);
  return out;
}

/**
 * Slider with a live value readout.
 *   opts: { labelKey, min, max, step, get, format, onInput, hintKey }
 */
export function slider(opts) {
  const out = el('output', { class: 'ctl-value' }, opts.format(opts.get()));
  const input = el('input', {
    type: 'range',
    min: opts.min,
    max: opts.max,
    step: opts.step,
    value: opts.get(),
    oninput: (e) => {
      const v = parseFloat(e.target.value);
      out.textContent = opts.format(v);
      opts.onInput(v);
    },
  });
  const node = el(
    'label',
    { class: 'ctl' },
    el('span', { class: 'ctl-label' }, el('span', {}, t(opts.labelKey)), out),
    input,
    opts.hintKey ? el('small', { class: 'ctl-hint' }, t(opts.hintKey)) : null
  );
  node.sync = () => {
    const v = opts.get();
    if (document.activeElement !== input) input.value = String(v);
    out.textContent = opts.format(v);
  };
  return node;
}

/** Checkbox bound to a boolean getter. */
export function toggle(labelKey, get, onChange, opts = {}) {
  const input = el('input', {
    type: 'checkbox',
    checked: get(),
    onchange: (e) => onChange(e.target.checked),
  });
  const node = el(
    'label',
    { class: 'ctl ctl-toggle' + (opts.strong ? ' strong' : '') },
    input,
    el('span', {}, t(labelKey)),
    opts.swatch ? el('i', { class: 'swatch', style: `background:${opts.swatch}` }) : null
  );
  node.sync = () => {
    input.checked = !!get();
  };
  return node;
}

/**
 * Segmented radio group. options: [{value, labelKey, label, color}]
 * `get` may be a function or a plain value (for one-shot renders).
 */
export function segmented(options, get, onChange, opts = {}) {
  const read = typeof get === 'function' ? get : () => get;
  const buttons = options.map((o) =>
    el(
      'button',
      {
        type: 'button',
        class: 'seg',
        style: o.color ? `--seg-accent:${o.color}` : null,
        onclick: () => onChange(o.value),
      },
      o.labelKey ? t(o.labelKey) : o.label
    )
  );
  const node = el('div', { class: 'segmented' + (opts.wrap ? ' wrap' : '') }, buttons);
  node.sync = () => {
    const v = read();
    options.forEach((o, i) => buttons[i].classList.toggle('active', o.value === v));
  };
  node.sync();
  return node;
}

/** Labelled <select> bound to a getter. */
export function select(labelKey, options, get, onChange) {
  const read = typeof get === 'function' ? get : () => get;
  const sel = el(
    'select',
    { onchange: (e) => onChange(e.target.value) },
    options.map((o) =>
      el('option', { value: o.value }, o.labelKey ? t(o.labelKey) : o.label)
    )
  );
  const node = el('label', { class: 'ctl' }, el('span', { class: 'ctl-label' }, t(labelKey)), sel);
  node.sync = () => {
    sel.value = String(read());
  };
  node.sync();
  return node;
}

/** A key/value row for the readout panels. */
export function row(labelKey, value, opts = {}) {
  return el(
    'div',
    { class: 'row' + (opts.wide ? ' wide' : '') },
    el('span', { class: 'row-key' }, t(labelKey)),
    el('span', { class: 'row-val' + (opts.mono === false ? '' : ' mono'), style: opts.color ? `color:${opts.color}` : null }, value)
  );
}

/** Canvas that keeps its backing store matched to the CSS size and DPR. */
export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height, dpr };
}

/** Stroke a polyline given as [{x,y}, ...] in screen coordinates. */
export function strokePath(ctx, pts, style, width = 1.5, dash = null) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.stroke();
  ctx.restore();
}

export function label(ctx, text, x, y, opts = {}) {
  ctx.save();
  ctx.font = opts.font || '11px "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = opts.baseline || 'middle';
  const m = ctx.measureText(text);
  if (opts.bg !== false) {
    const padX = 4;
    const padY = 3;
    const w = m.width + padX * 2;
    const h = 15;
    let bx = x - padX;
    if ((opts.align || 'left') === 'center') bx = x - w / 2;
    if (opts.align === 'right') bx = x - w + padX;
    ctx.fillStyle = opts.bgColor || 'rgba(9,12,20,0.78)';
    ctx.beginPath();
    ctx.roundRect(bx, y - h / 2, w, h, 3);
    ctx.fill();
  }
  ctx.fillStyle = opts.color || '#dfe6f5';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Arrow head at `to`, pointing along (to - from). */
export function arrowHead(ctx, from, to, color, size = 7) {
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(a - 0.4), to.y - size * Math.sin(a - 0.4));
  ctx.lineTo(to.x - size * Math.cos(a + 0.4), to.y - size * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Angular arc marker between two directions around a vertex. */
export function angleArc(ctx, cx, cy, r, a0, a1, color, text) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a1, a1 < a0);
  ctx.stroke();
  if (text) {
    const mid = (a0 + a1) / 2;
    label(ctx, text, cx + Math.cos(mid) * (r + 12), cy + Math.sin(mid) * (r + 12), {
      align: 'center',
      color,
      font: '10px "IBM Plex Mono", ui-monospace, monospace',
    });
  }
  ctx.restore();
}
