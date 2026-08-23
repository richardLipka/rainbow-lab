# Rainbow Lab — Jak vzniká duha / How a rainbow forms

A bilingual (Czech / English) interactive simulation of how a rainbow is formed.
The goal is not a pretty picture of a rainbow: it is to let the ~42° angle, the
circular shape, the colour order and the secondary bow **emerge from a ray
simulation** that the user can inspect and disagree with.

Nothing in the visualisation is a hard-coded arc. Every angle drawn on screen
comes out of `src/optics.js`, and the unit tests check those angles against
independent derivations.

Working on the code? See [`CLAUDE.md`](CLAUDE.md) for the angle conventions,
the reactive-update pipeline, and a list of real bugs already found and
fixed here — worth reading before touching any angle-related code, so they
don't get reintroduced.

---

## Running it

```bash
node server.mjs
```

Then open <http://localhost:5178>. Any static file server works — the app has
no build step for development and no runtime dependencies.

Run the tests:

```bash
node --test test/optics.test.mjs
```

Build the single-file version:

```bash
node build.mjs
```

This writes `dist/rainbow-lab.html` (a complete standalone page, no external
requests) and `dist/artifact.html` (the same page without the document
skeleton, for hosts that supply their own).

---

## Architecture

The dependency arrow points one way only. The optical engine knows nothing
about the DOM and is fully testable in Node.

```
optics.js      pure maths: vectors, Snell, Fresnel, ray-sphere, deviation,
               extremum, angular distribution, sky geometry
   |
rays.js        turns the control state into traced rays + classification
   |
i18n.js        the single translation dictionary (cs / en)
state.js       one observable store
ui.js          DOM helpers; every control carries a sync()
   |
dropletView.js  graphView.js  dropsView.js  skyView.js   panels.js
   |
app.js         assembly + render loop
```

| File | Responsibility |
| --- | --- |
| `src/optics.js` | The physics. No DOM, no globals. |
| `src/i18n.js` | Every user-facing string, in both languages. |
| `src/state.js` | Application state + subscription. |
| `src/ui.js` | `el()`, controls, canvas fitting, drawing primitives. |
| `src/rays.js` | Builds the current ray set; display colour policy. |
| `src/dropletView.js` | Mode A — cross-section of one droplet, plus the observer eye(s). |
| `src/graphView.js` | Exit-angle plot and angular-distribution plot. |
| `src/dropsView.js` | Mode B — one droplet to ten thousand. |
| `src/skyView.js` | Mode C — 3-D cone, horizon, observer's eye view. |
| `src/panels.js` | Tutorial, ray readout, mathematics, questions. |
| `src/app.js` | Shell, controls, render loop. |
| `test/optics.test.mjs` | 42 tests over the engine. |

---

## Angle conventions

Four different angles are routinely confused in descriptions of rainbows. This
project fixes them once, in the header of `optics.js`, and the UI always states
which one it is plotting.

| Symbol | Meaning |
| --- | --- |
| `θᵢ` | Angle of incidence at the first air→water surface. `sin θᵢ = b/R`. |
| `θᵣ` | Angle of refraction inside the droplet. `sin θᵢ = n · sin θᵣ`. |
| `D` | **Total deviation** — how far the ray direction has turned over the whole path, *not* folded into 0–180°. ≈138° for the primary. |
| `Θ` | **Scattering angle** — between the outgoing and the original direction, folded into 0–180°. |
| `φ` | `180° − Θ`, the **angle from the antisolar direction** — the angular radius of the bow in the sky. ≈42° for the primary. |

For `k` internal reflections:

```
D_k(θᵢ) = 2 (θᵢ − θᵣ) + k (180° − 2 θᵣ)
```

Setting `dD/dθᵢ = 0` gives the extremum that produces the bow:

```
cos²θᵢ = (n² − 1) / ((k+1)² − 1)
```

The tests locate the same extremum numerically by golden-section search and
require the two to agree, so 42° is never asserted — it is derived twice.

---

## Values the engine produces

With the tabulated indices below and full dispersion:

| Colour | λ (nm) | n | θᵢ | φ, k=1 | φ, k=2 |
| --- | --- | --- | --- | --- | --- |
| red | 650 | 1.331 | 59.53° | **42.370°** | **50.365°** |
| orange | 610 | 1.333 | 59.41° | 42.078° | 50.891° |
| yellow | 580 | 1.335 | 59.29° | 41.788° | 51.414° |
| green | 540 | 1.337 | 59.18° | 41.500° | 51.934° |
| blue | 480 | 1.340 | 59.00° | 41.071° | 52.709° |
| violet | 420 | 1.343 | 58.83° | **40.646°** | **53.478°** |

Red is the outer edge of the primary and the inner edge of the secondary — the
reversal is a result, not a drawing instruction. Alexander's band falls out as
the 42.37°–50.37° gap that receives no once- or twice-reflected light at all.

The refractive indices are **approximate values chosen for a teaching
simulation**, not exact values for all temperatures and wavelengths. They live
in `NAMED_COLORS` and are configurable. For the continuous spectrum used to
paint the bow, a Cauchy relation `n = A + B/λ²` is least-squares fitted to the
same six points (A ≈ 1.32385, B ≈ 0.003535 µm²), which reproduces the table to
better than 0.002.

---

## Documented simplifications

This is **geometric optics only**. The simulation deliberately does not model:

- interference, and therefore no supernumerary bows;
- diffraction, and therefore no dependence of sharpness on droplet size;
- Mie scattering — very small droplets genuinely require wave optics;
- polarisation (Fresnel coefficients are used unpolarised);
- multiple scattering between droplets, or atmospheric extinction.

Brightness is an educational approximation: rays are sampled in proportion to
area (`b·db`), weighted by the unpolarised Fresnel factors `(1−R)²·Rᵏ`, binned
by φ, and divided by `sin φ` to convert energy into radiance. In the ideal
geometric limit the caustic peak is infinitely sharp; on screen it is broadened
only by the finite bin width. It is not a claim about the true photometric
brightness of a real rainbow.

Alexander's band is drawn darker because no `k=1` or `k=2` light reaches it —
not because it is truly black. Higher orders, external reflection and ordinary
skylight all put some light there.

Observer height is treated honestly: raising the observer changes the horizon
dip by ~0.04° at eye level and only ~1° at a kilometre, so height alone never
reveals a full circular bow. The full circle needs droplets *below* eye level,
which is what the "rain below the observer" toggle represents.

---

## The observer, in the single-droplet view

A droplet diagram with rays but no observer leaves the central question
unanswered: rays go *somewhere*, but which ones reach an eye? The single-
droplet view answers this directly.

For every active reflection order that has an extremum (`k ≥ 1`), an eye
icon is placed exactly along the direction that order's canonical rainbow
ray exits — found by tracing a ray at `O.rainbowGeometry`'s own impact
parameter, the same tested code path as every other ray on screen, not a
hand-derived angle. One eye per active order, because a real observer sees
the primary and secondary bows *simultaneously*, at different angular radii
— exactly what the sky view already draws as two concentric circles.
Drawing only one shared eye when comparing two families would leave a
reaching secondary ray glowing next to an eye it doesn't actually point at.

Every ray's prominence — **hue**, opacity, width, arrowhead size, and a
brass glow along its exit segment — is driven by its own `classification`
(`primary`/`secondary`/`higherOrder` vs. `nonCaustic`/`noReflection`), the
identical test the ray-info panel and the unit tests use. A fan ray that
happens to land near the extremum is emphasised exactly like the main ray
would be; an off-caustic main ray is dimmed exactly like an ordinary
scattered fan ray. For `k = 0` there is no extremum at all, so the eye is
still shown (captioned accordingly) but nothing ever emphasises — which is
itself the correct lesson, not a missing feature.

With a whole fan on screen, hue does the heavy lifting: rays that miss the
observer are drawn heavily desaturated towards grey — the same "grey means
it does not reach *this* observer" convention the many-droplets view uses —
because at the thin line widths a 60-ray fan needs, a difference in opacity
alone is invisible. They stay clearly present rather than being hidden:
that *most* rays do not make a rainbow is the whole point. Contributing
rays are also drawn last, on top, so they are never buried under the ones
being played down. A tally in the top-right corner counts them (`5 / 26`,
`23 / 126` …) with a two-row key, and under white light that key's
"forms the rainbow" swatch is itself a miniature spectrum rather than a
single red line.

The exit-point angle readout shows `Θ = … → φ = …` rather than just `φ`,
because the arc it draws (from the forward/antisolar reference to the
actual outgoing ray) geometrically sweeps Θ, the scattering angle — showing
that arc's size next to a `φ` number alone would silently mismatch.

At the default zoom the eye sits close enough that six wavelengths' worth of
dispersion is barely a few pixels wide — visually indistinguishable from one
ray. The **zoom-out slider** pulls the (dampened, `1/√zoom`) droplet down in
size while pushing the observer proportionally farther away and lengthening
the drawn rays to match, so the same angular dispersion becomes an
increasingly wide, clearly rainbow-coloured band by the time it reaches the
eye. The ratio of that band's width to the droplet's own size grows roughly
linearly with the zoom setting (measured: ~0.1 at 1×, ~0.8 at 9×) — turn on
white light and full dispersion, then zoom out, to watch it happen.

## Interaction map

- **Single droplet** — drag vertically in the canvas, or use the impact
  parameter slider, to move the incoming ray. Click any ray to classify it.
  Watch the eye: it lights up brass exactly when the current ray reaches it.
- **Exit-angle graph** — click anywhere to set the impact parameter; the marker
  in the droplet follows, and vice versa.
- **Ray distribution** — raise the ray count and watch the caustic peak build
  from 10 rays to 100 000.
- **Many droplets** — green droplets are the ones sending light to the
  observer. They sit at every distance, which is the point.
- **Sky 3-D** — drag to orbit, scroll to zoom. Switch to the observer's eye to
  see the circle cut by the horizon.

The rendered bow is **off by default**. The intended path is to reconstruct it:
individual rays → distribution of exit angles → caustic → many droplets →
3-D cone → circular bow → horizon → visible arc.
