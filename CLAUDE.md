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

Two rules follow from that, both easy to break by accident:

- **Rays that reach the observer must be drawn LAST.** `dropletView.js`
  sorts on `reaches` first and only uses `role` to break ties. Sorting by
  role alone (as it once did) buries the emphasis: a contributing fan ray
  gets painted before a dim, non-contributing *main* ray and is then
  covered by it, so the rays the scene is trying to highlight end up
  underneath the ones it is trying to play down.
- **Emphasis is carried by hue, not just opacity.** `colorFor()` takes a
  `greyMix` that blends towards the neutral chrome grey; a ray that misses
  the observer is drawn heavily desaturated. This matches the
  many-droplets view, where grey already means "this droplet's light does
  not reach *this* observer", so the two scenes teach the same colour
  convention. Opacity alone is not enough — at the thin line widths a
  60-ray fan needs, a low-alpha ray and a mid-alpha ray look identical.
  Non-reaching rays are still kept clearly visible: they are the
  pedagogical point ("most rays do *not* make a rainbow"), not clutter to
  hide.

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

### Auto vs. manual placement, and why the reach test differs between them

`state.observerMode` picks between two placements of the same per-family
eyes:

- `'auto'` — each eye sits on its own family's rainbow direction (the
  traced canonical ray, as above).
- `'manual'` — each eye keeps its family and its **side of the axis**, but
  sits at `state.observerPhi`. The side has to come from that family's own
  canonical ray (`Math.sign(canonical.path.dirOut.y)`), because the exit
  side flips with every internal reflection: k=1 leaves below the axis for
  b > 0, k=2 above. An eye placed on the wrong side is mirrored away from
  the light and can never light up.

Only one number is substituted between the two branches, so they cannot
drift apart. Verified: reconstructing the manual direction at the rainbow
angle reproduces the traced auto direction to 1.1e-15.

`reachesEye()` deliberately asks a **different question in each mode**, and
this is not an inconsistency:

- Auto mode reads `ray.classification`, which measures the ray against the
  extremum computed from *that ray's own* refractive index. A geometric
  test would be subtly wrong here: the eyes are positioned with `n(650)`,
  so a violet primary ray — dead on its own caustic, 1.7° away from red's —
  would stop counting as reaching, and the dispersion lesson would break.
- Manual mode compares the ray's own `path.antisolar` against the eye's
  angle, because that is the question the user is now steering: does this
  ray come out where the eye is standing? Answering it geometrically is
  what makes the caustic *discoverable* — sweeping the eye through the
  rainbow angle makes the ray tally spike, and nothing had to assert it.

Both use `CAUSTIC_TOLERANCE_DEG`, so at the rainbow angle the two modes
agree ray for ray. Measured on tutorial step 6 (k=1, 45-ray fan, single
wavelength): 2/46 rays reach an eye at 20–30°, **8/46** at 42.4°, 0/46 at
50°. The peak is the caustic, counted rather than claimed.

φ is drawn as an arc **at the eye**, between the line of sight back to the
droplet and the antisolar direction (+x on screen). Sweeping that arc at
the droplet centre instead would sweep Θ, not φ — the exact confusion the
exit-angle readout had to be fixed for once already. The arc carries only
the symbol; the value is in the caption a few pixels away, and printing it
in both places put the two labels on top of each other whenever the caption
flipped up past the arc.

### Zoom, and the three formulas that have to move together

`state.dropletZoom` (1 … 40, on a log slider) controls how far away the
observer is drawn, in droplet radii. Three things scale with it, and if you
change one you must change the others the same way or the control stops
doing what it is for:

- `draw()` derives the droplet's pixel scale as
  `max(16, baseS / sqrt(zoom))` — dampened so it stays legible, floored
  because below ~16 px it stops reading as a sphere with a traceable path
  inside it.
- `buildRays()` scales the drawn ray length as `6 * zoom`.
- `drawObserver()`'s eye distance scales as `3.3 * sqrt(zoom)` on that same
  shrinking pixel scale, then clamps to the canvas.

The clamp is load-bearing, not a safety net: the unclamped distance already
exceeds the canvas at zoom 1, so **the baseline is canvas-limited at every
zoom**. That is why `draw()` also slides the droplet *against* the mean eye
direction as the zoom rises (`meanScreenDir()`, ramped over zoom 1 → 7).
Centring the droplet wastes half the canvas when there is essentially one
exit direction in play; the lean buys a 34% longer baseline (331 → 443 px
at 864×562), and the drawn width of the dispersion fan is proportional to
exactly that baseline.

Beyond the point where the baseline saturates, the gain comes purely from
the droplet shrinking — which is the honest mechanism, since the angular
spread between red and violet is fixed at 1.72° and no amount of zooming
changes it. Measured fan width ÷ droplet radius at 864×562:

| zoom | droplet radius | baseline | fan | ratio |
| --- | --- | --- | --- | --- |
| 1 | 164 px | 331 px | 10.0 px | 0.061 |
| 9 | 55 px | 443 px | 13.3 px | 0.244 |
| 40 | 26 px | 443 px | 13.3 px | 0.514 |

Resolution-dependent, so re-measure rather than trusting these numbers
after a layout change.

## The observer in the many-droplets scene

`state.dropsObserverX` / `dropsObserverY` place the observer inside the rain,
in the same world units the droplet field uses (+x away from the Sun, +y up).
The rain does not move; the observer does. This is the whole point of that
scene — the bow is an *angle*, not a place — and it is the one claim the
previously fixed observer could only make in a caption.

Everything angular in `dropsView.js` is measured from that position: the
per-droplet test (`rel = d - obs`), the rays drawn to the eye, the bow
direction guides, the sun-antisolar axis, and the Sun icon's clamp anchor.
Adding a new angular quantity means anchoring it there too. Verified: moving
from the origin to +0.45 forward moves the contributing-droplet centroid by
146 px and changes how many droplets qualify (7201 → 4600 lit pixels), so a
genuinely different set of droplets delivers the bow.

`OBS_RANGE` (exported, so the sliders and the drag clamp cannot disagree)
allows only a little downward travel. The ground is a **fixed plane** in
world coordinates whose shallowest setting sits 0.128 world units below the
origin, so anything lower would put the observer underground. Do not be
tempted to anchor the ground to the observer instead: that was tried, and it
made the ground ride upwards with them, burying the very thing rising is
supposed to reveal — rain below eye level.

## The control column is scene-filtered, and the scene lists are assertions

`app.js` builds the column from entries of the form
`c(scenes, () => control, when?)`, where `scenes` lists the scenes that
actually **read** that piece of state. `sceneGroup()` drops any group left
with no visible children, so a scene never shows an empty or single-orphan
group.

Those lists are not cosmetic. Showing every control in every scene meant a
reader in the 3-D sky scrolled past the impact parameter, the fan count and
the zoom-out slider — none of which that scene reads — to reach the horizon
toggle, and moving any of them did nothing at all. A control that visibly
does nothing teaches that the simulation is decorative, which is the exact
opposite of this project's point. So when you add state:

- Add its control with the scene list matching where the view code reads it.
  Grep for `state.<field>` and `state.show.<field>` across the view files;
  the current split was derived that way, not guessed.
- If a scene stops reading something, remove that scene from the list.

`controlsKey()` is what makes this live: the column is rebuilt whenever the
scene, the sky view mode (the look/FOV sliders exist only in the eye view),
the observer mode, or the tutorial position changes. Adding a new condition
to a `when` predicate means adding its state to `controlsKey()`, or the
column will not rebuild when it changes.

### Tutorial steps declare which controls they need

Each `TUTORIAL` entry carries `focus: [...]` — control ids, which are just
the translation keys, stamped onto the DOM as `data-ctl` by `slider()`,
`toggle()`, `select()` and the hand-built `.ctl` wrappers. `applyFocus()`
highlights them and **warns to the console when a focused control is not
present in the scene that step selected**.

That warning is the point of the mechanism, not a nicety: it turns "this
step tells you to turn a knob this scene hides" from a dead end a reader
discovers into a loud failure a developer sees. After any change to a
step's `apply.scene` or to a control's scene list, walk all steps and
confirm the console stays silent (see *How to verify changes*).

A step's `actions` chip may carry a **function** instead of a patch object,
for values that have to come out of the engine — the "snap to the bow" chip
computes the angle from `O.rainbowGeometry` rather than carrying 42.4 as a
literal, which is the same no-hard-coded-angles rule the rest of the app
follows.

## Exporting figures, and the two download paths

Both toolbars carry a "Save PNG" button. The export re-renders the canvas at
`EXPORT_SCALE` (3) device pixels per CSS pixel via `setRenderScale()` and then
puts the scale back in a `finally` — leaving it raised would render the whole
session at 3×. Every view already draws in CSS pixels and lets the canvas
transform do the rest, so this costs one redraw and yields a real
high-resolution figure rather than an upscaled screen grab.

**PNG, not SVG, deliberately.** Canvas 2-D is the only renderer here; an SVG
export would mean a second drawing path for every view, and two paths that
have to agree about every angle is the exact class of thing this project
exists to avoid. (`svg` is also in the artifact host's *extended* download
allowlist, which may not be enabled; `png` is in the base set.)

There are two ways to hand over the file and they are feature-detected, not
built separately:

- Inside the claude.ai artifact viewer a page cannot start a download itself.
  `await window.claude.use('downloads')` returns a namespace whose
  `save({filename, data})` asks the viewer to confirm. If that namespace
  exists, a refusal from it is the answer — do **not** fall through to an
  anchor the sandbox ignores anyway.
- Everywhere else (GitHub Pages, `dist/rainbow-lab.html`, `file://`) an
  object-URL `<a download>` is the only thing that works.

Publishing the artifact therefore needs `capabilities: {downloads: true}`, or
the button is present and inert for viewers.

Encoding a ~2600 px PNG takes most of a second, which is why the button
disables itself and shows a "saving…" status. Any browser test that clicks it
must wait well past that before reading the result — a 260 ms wait made this
look like a silent failure once already.

## Inlined assets

`src/assets.js` is **generated** by `tools-make-assets.mjs` from the files in
`assets/`; edit those and re-run rather than editing the generated file. The
logos are inlined as data: URIs because the built page must run from
`file://` and inside a CSP that blocks every external request, and they are
used through `<img src>` rather than inline `<svg>` so the logo's own styles
and ids cannot collide with the page's. `assets.js` has no dependencies and
sits second in `build.mjs`'s `ORDER`.

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
- **A label placed relative to something the optics position will collide
  with fixed furniture.** The single-droplet eye lands on the bottom margin
  at every zoom for k=1, so its three-line caption landed exactly on the
  bottom hint row. Captions near optics-driven elements need a flip (or a
  reserved band), and the threshold has to count the *whole* stack, not one
  line. Same class of bug: the many-droplets antisolar label was drawn 1.2
  world units along the antisolar direction and was off the right edge at
  every observer position, including the default.
- **A second control for a quantity that already has one will fight it.**
  Making the many-droplets ground follow the observer looked self-consistent
  ("the ground stays the same distance under their feet") and was still
  wrong: raising the observer raised the ground with them, hiding the rain
  below eye level that rising is supposed to reveal. Ask what the control is
  *for* before making it locally consistent.
- **A label centred on an optics-placed element needs a horizontal clamp,
  not just a vertical one.** The single-droplet eye sits hard against the
  left margin whenever there is no extremum (k=0), and the longest caption
  — "no reflection, so no concentrated direction" — lost its first several
  characters. Only visible in an exported figure, which is a good argument
  for exporting one while checking layout work.
- **`setPointerCapture()` throws for a pointer id the element cannot
  claim,** and it is called before the drag state is set up, so an
  unguarded throw takes the whole gesture with it. Use `capture()` from
  `ui.js`.

## How to verify changes

**Check `location.href` before trusting any browser test result.** This
project has both a live dev page (`index.html`, source files) and a static
built snapshot (`dist/rainbow-lab.html`) that a prior verification pass may
have navigated to and left the tab sitting on. `location.reload()` reloads
*whatever URL the tab currently has* — if that's the dist snapshot, you will
reload a frozen-in-time build and every test against it silently exercises
old code, often with no errors at all (setting a state field the loaded
code doesn't yet read just adds a harmless extra property). This already
produced one fully-chased false bug report in this project — a "reset
button doesn't reset the new field" investigation that consumed several
tool calls before the real cause turned out to be the tab sitting on a
stale `dist/` build from an earlier session. Confirm `location.href` points
at `index.html` (or explicitly navigate there) before drawing any
conclusion from a failing browser check, especially after a `dist/` build
was verified earlier in the same session.

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
5. **The canvas never sizes itself in that pane.** `fitCanvas()` runs inside
   the rAF loop, so with no compositing the backing store stays at the
   default 300×150 and every capture and pixel measurement is garbage. Call
   `R.renderOnce()` once first; the canvas then reports its real size.
   Screenshots via `computer{action:"screenshot"}` fail outright there —
   capture `canvas.toDataURL('image/jpeg', 0.7)` instead, let the oversized
   tool result auto-save to a file, and decode that file to an image.
6. **Prefer exact computation to pixel-scanning** when checking geometry.
   Replicating a formula against `window.RainbowLab.O` gives an answer to
   15 digits; pixel heuristics have already produced noise here. Pixel
   counting is still the right tool for "did the *set* of highlighted things
   change" questions — count saturated pixels and compare centroids.
7. Full 12-step tutorial script in **both languages** + free-mode sweeps
   (every scene, sky orbit and eye view, zoom extremes, reset) with zero
   thrown errors **and zero console warnings** is the practical regression
   bar. The warnings matter: `applyFocus()` reports tutorial steps whose
   focused controls the current scene does not offer, so a silent console is
   part of the pass, not just an absence of crashes.
8. Interactions worth driving with synthetic pointer events after any change
   to them: dragging the single-droplet eye (must switch to manual mode and
   set φ from the pointer angle), clicking elsewhere on that canvas (must
   still steer the impact parameter and leave φ alone), and dragging the
   many-droplets observer (must move only from the glyph, and clamp to
   `OBS_RANGE`).

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
