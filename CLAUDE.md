# CLAUDE.md

Guidance for Claude Code (or any future agent) working in this repository.

## What this is

A bilingual (cs/en) interactive geometric-optics simulation of how a rainbow
forms. The design goal, stated in the original brief and worth re-reading
before touching anything: **the answer must emerge from the ray simulation,
never be drawn as a decorative arc.** Every angle shown anywhere in the UI —
42°, 51°, the colour order, the shape of the bow — is computed by
`src/optics.js` and nothing else. If you ever find yourself hand-deriving an
angle inside a view file instead of calling into `optics.js`, stop: that is
almost certainly how a bug gets in (see "Lessons from bugs found" below).

## Commands

```bash
node server.mjs        # dev server on :5178 (or next free port)
node --test test/optics.test.mjs   # 42 unit tests over the engine
node build.mjs          # writes dist/rainbow-lab.html and dist/artifact.html
```

There is no bundler in dev mode — `index.html` loads `src/app.js` as native
ES modules directly. `build.mjs` is a small hand-rolled bundler (strips
`import`/`export`, concatenates in dependency order) used only to produce the
two `dist/` artifacts; it is not needed for local development.

Run the unit tests after touching `src/optics.js`. Run a browser regression
pass (see "How to verify changes" below) after touching any view file —
the tests do not cover rendering.

## Architecture

Strict one-way dependency arrow. `optics.js` knows nothing about the DOM and
is fully unit-tested; everything downstream only reads from it.

```
optics.js      pure maths: vectors, Snell, Fresnel, ray-sphere, deviation,
               extremum, angular distribution, sky geometry
   |
rays.js        turns control state into traced rays + classification
   |
i18n.js        the single translation dictionary (cs / en)
state.js       one observable store (state, set(), subscribe(), activeOrders())
ui.js          DOM helpers; every control carries its own sync()
   |
dropletView.js  graphView.js  dropsView.js  skyView.js   panels.js
   |
app.js         assembly + render loop
```

| File | Responsibility |
| --- | --- |
| `src/optics.js` | The physics. No DOM, no globals. Header comment defines θᵢ/θᵣ/D/Θ/φ precisely — read it before touching any angle math. |
| `src/i18n.js` | Every user-facing string, cs and en. No component may contain a literal string. |
| `src/state.js` | Application state, `set()`/`subscribe()`, `activeOrders()` (which reflection orders are currently traced). |
| `src/ui.js` | `el()`, `slider()`/`toggle()`/`segmented()`/`select()` controls, canvas-fitting, drawing primitives. |
| `src/rays.js` | `buildRays()` turns state into the current ray set; `colorFor()` is the wavelength→colour policy. |
| `src/dropletView.js` | Mode A — single droplet cross-section, the observer eye(s), ray prominence. |
| `src/graphView.js` | Exit-angle and angular-distribution plots. |
| `src/dropsView.js` | Mode B — one droplet to ten thousand, observer-centred. |
| `src/skyView.js` | Mode C — 3-D cone/circle/horizon, orbit and eye camera. |
| `src/panels.js` | Tutorial script, ray readout, mathematics panel, questions. |
| `src/app.js` | Shell, controls, the reactive update pipeline (see below), render loop. |
| `test/optics.test.mjs` | 42 tests over the engine — ray-sphere, Snell, extremum vs. numeric search, classification, sky geometry. |

## Angle conventions — read this before changing any angle-related code

Four angles are defined once, in the header of `optics.js`, and must never be
mixed anywhere else in the codebase:

- **θᵢ** — angle of incidence at the first surface. `sin θᵢ = b/R`.
- **θᵣ** — angle of refraction inside the droplet. `sin θᵢ = n·sin θᵣ`.
- **D** — total deviation, unfolded (can exceed 180°). `D_k = 2(θᵢ−θᵣ) + k(180°−2θᵣ)`.
- **Θ** (scattering angle) — angle between the outgoing and the *original*
  direction of travel, folded into [0°,180°]. `Θ = fold(D)`.
- **φ** (antisolar angle) — `180° − Θ`. This is the one number the UI treats
  as "the rainbow angle" everywhere else (~42° primary, ~51° secondary).

`φ` and `Θ` are **not** interchangeable, and a diagram that draws one while
labelling it the other is a real bug (see below) — it happened once already.
If you add a new angle indicator anywhere, work out analytically which of
these four it actually sweeps before wiring up the label text.

## Ray classification is the source of truth for "does this reach the observer"

`optics.js`'s `classifyRay()` already answers the pedagogically central
question — "is this specific ray part of the bright rainbow family, or just
an ordinary scattered ray?" — by checking whether the ray's exit angle lands
within `CAUSTIC_TOLERANCE_DEG` of the analytic extremum for its own `k`. Any
UI element that needs to decide "is this ray special" (glow, emphasis,
which one gets the detail overlay) should read `ray.classification` rather
than re-deriving the same test from `role` or from ad-hoc angle comparisons.

## The observer, and why it's per-family

`dropletView.js`'s `computeObservers()` returns **one entry per active
reflection order that has a valid extremum**, not a single shared observer.
A real observer sees the primary and secondary bows simultaneously, at
different angular radii — the sky view already draws this as two concentric
circles, so the droplet view has to be consistent with it. Drawing only one
eye when two families are being compared side by side means a ray from the
non-referenced family can be classified as "reaching" (glowing, thick) while
visibly pointing nowhere near the one eye on screen — actively misleading.
If you touch this function, keep it plural, and keep computing each entry
by literally tracing a ray at `O.rainbowGeometry`'s own impact parameter
(`traceOne(650, n, k, geo.impactParameter)`) rather than reconstructing the
direction from `phi`/`theta` trig by hand — the two are easy to get
subtly wrong (see below), and tracing reuses code already covered by the
unit tests.

## Lessons from bugs found in this codebase (don't reintroduce these)

- **`notify()`'s debounce had no fallback.** `state.js`'s `notify()` used to
  schedule its DOM-sync flush purely via `requestAnimationFrame`, with a
  `queued` guard that only reset inside that callback. If rAF is ever
  starved — confirmed directly: this project's own browser-automation
  sandbox never composites a hidden pane, so native rAF genuinely never
  fires there — the guard latches `true` forever and every future `set()`
  silently stops reaching the DOM, even though `state` itself keeps
  updating correctly underneath. Fixed by racing rAF against a bounded
  `setTimeout` fallback. If you touch `notify()`, keep that fallback.
- **A control's `sync()` has to be in the collected `syncers` list, not just
  called once at build time.** The scene-tab segmented control was built
  once and its active-highlight never updated again, because it wasn't
  included in the syncers `app.js` recollects on every store tick. Any new
  top-level control container needs to be added to `collectAllSyncers()`.
- **Two controls that both claim to set "how many reflections" but only one
  is read per mode is a bug waiting to happen.** `activeOrders()` used to
  branch on `state.mode` and read a *different* control in each branch —
  whichever one the current mode ignored looked completely broken (visibly
  updated its own state/checkbox, never touched the scene). Fixed by making
  `activeOrders()` a single rule, read identically in both modes, with the
  segmented "Vnitřní odrazy" control now solo-selecting the matching
  checkbox rather than writing to a value nothing reads.
- **An angle arc's visual sweep and its text label must describe the same
  quantity.** `drawExitAngle()` drew an arc from the forward (+x,
  antisolar-direction) reference to the actual outgoing ray — which
  geometrically sweeps Θ, the scattering angle — but labelled it `φ`. For
  the primary ray that's a 137.6°-wide arc captioned "42.4°". Verify any
  angle-arc's sweep against the labelled value with real numbers, not by
  eye — the mismatch is not obvious at a glance once dispersion or a
  different `k` changes the numbers.

## How to verify changes

`optics.js` changes: run the unit tests. They check ray-sphere intersection,
Snell's law (scalar and vector forms agree), Fresnel limits, the analytic
extremum against an independent numeric (golden-section) search, the
headline 42°/51° values, classification for every ray family, sky/horizon
geometry, and more — 42 tests, all should stay green.

View/rendering changes: there is no visual regression suite, so verify by
driving the actual app:
1. Start the dev server and open it in the Browser tool.
2. Exercise the change with **real DOM events** (`.click()`, pointer events
   on canvases) — not just calling `state.set()` directly — because several
   real bugs here only reproduced through the actual click → `notify()` →
   subscribe pipeline, not through a direct state poke.
3. Cross-check any displayed angle against `window.RainbowLab.O` (the
   optics module is exposed on `window.RainbowLab` for exactly this) —
   e.g. `O.rainbowGeometry(O.makeIndexModel()(650), 1).antisolarDeg`.
4. For anything involving `requestAnimationFrame`, remember this specific
   browser-automation pane does not composite unless something forces a
   paint — plain `await` loops on rAF will hang. Front the tab first
   (`tabs_select`), and if you need deterministic frame pumping for a test,
   patch `window.requestAnimationFrame` to a `setTimeout`-based stand-in
   *after* navigating, then call the exposed `R.renderOnce()` in your own
   loop — the app's internal `loop()` already got a dead callback queued
   against the real (silent) rAF before you can patch it.
5. Full 10-step tutorial script + a few free-mode sweeps (impact parameter,
   all `k` values, white light, multi-family) with zero thrown errors is the
   practical regression bar this project has been held to so far.

## Style notes specific to this repo

- No comments explaining *what* code does — only *why*, when it's
  non-obvious (a physical convention, a past bug, a deliberate
  simplification). The codebase leans on this fairly heavily already;
  match it.
- Every user-facing string goes through `t('key')` from `i18n.js`, added to
  **both** `cs` and `en` blocks in the same edit.
- Colour policy: saturated colour means a wavelength, everywhere. UI chrome
  is cool blue-black; the only warm accent (brass, `--accent` / `#e0a83f`)
  is reserved for interactive/active state (a control's active segment, an
  observer eye that's currently receiving a ray). Don't add new saturated
  colours to chrome elements.
- The refractive-index table (`NAMED_COLORS` in `optics.js`) is explicitly
  documented as approximate, chosen for teaching clarity, not claimed to be
  exact for all conditions — keep that framing if you touch it.
