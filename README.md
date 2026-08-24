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

After changing a logo in `assets/`, regenerate the inlined copies:

```bash
node tools-make-assets.mjs
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
| `src/dropsView.js` | Mode B — one droplet to ten thousand, plus the per-droplet inspector. |
| `src/skyView.js` | Mode C — 3-D cone, horizon, observer's eye view. |
| `src/panels.js` | Tutorial, ray readout, mathematics, questions. |
| `src/app.js` | Shell, controls, render loop. |
| `src/assets.js` | Generated — logos inlined as data: URIs. |
| `test/optics.test.mjs` | 45 tests over the engine. |

The control column is filtered per scene: every control declares which
scenes read its state, and groups left empty are dropped. Tutorial steps
declare the controls they need, which are highlighted — and a step naming a
control its own scene doesn't offer is reported to the console rather than
leaving a reader hunting for it.

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

### Standing somewhere else on purpose

The eye can also be **placed by hand**: drag it, or use the observer-angle
slider. The angle is φ, measured at the observer between the line of sight
back to the droplet and the antisolar direction, and it is drawn there as an
arc so that "the observer is at 42°" and "the ray leaves at φ = 42°" are
visibly one statement about one angle rather than two coincidental numbers.

In this mode a ray is emphasised when it genuinely comes out where the eye
is standing, rather than by its classification — so the emphasis is a
consequence of where you put the eye, and the ray tally becomes a
measurement. Sweep it and the count reports the caustic: with a 45-ray fan,
**2 rays** reach an eye at 20–30°, **8** at 42.4°, and **none** at all past
50°, because no once-reflected ray leaves at a larger angle. The caption
prints the distance to the bow (`Δ +4.4° → 42.4°`) and flips to
"✓ exactly on the bow" when the eye is within the caustic tolerance. At the
rainbow angle the hand-placed eye lands on the auto-placed one to fifteen
decimal places — same code path, one substituted number.

### Zooming out

At the default zoom the eye sits close enough that six wavelengths' worth of
dispersion is a few pixels wide — visually indistinguishable from one ray.
The **zoom-out slider** (up to 40×, on a log scale) shrinks the droplet,
lengthens the drawn rays to match, and slides the droplet away from the eye's
direction so the droplet-to-eye baseline uses as much of the canvas as it
can. The angular spread between red and violet is fixed at 1.72° and no
amount of zooming changes it — so what actually grows is the fan's size
*relative to the droplet*, which is the honest version of the effect:

| zoom | droplet radius | fan width | ratio |
| --- | --- | --- | --- |
| 1× | 164 px | 10.0 px | 0.06 |
| 9× | 55 px | 13.3 px | 0.24 |
| 40× | 26 px | 13.3 px | 0.51 |

(measured at 864×562; it scales with the canvas). Turn on white light and
full dispersion, then zoom out, to watch a single white ray become a plainly
rainbow-coloured band on its way to the eye.

## The observer, in the many-droplets view

The observer can be **moved through the rain** — dragged, or placed with the
forward/back and up/down sliders. Not one droplet moves when you do; only
the angles change, and a completely different set of droplets lights up.
That is the whole claim of the scene made checkable: moving forward by 0.45
scene units shifts the contributing droplets' centroid by 146 px and changes
how many of them qualify at all. You cannot walk up to a rainbow, and no two
observers see theirs on the same droplets.

The Sun icon and the sun–antisolar axis travel with the observer, since the
Sun being behind you is the precondition for seeing a bow at all. The ground
stays where it is: it is a fixed plane, and rising above it is what puts rain
below eye level.

## Asking one droplet what it is doing

Click any droplet in that scene and it is taken apart: the sunlight arriving
along the one direction all sunlight arrives from, and then, for one, two and
three internal reflections, the directions that droplet concentrates light
into. The angle it is seen at (φ) is drawn as an arc **at the eye**, because
that is where φ is measured; the angle the droplet turns the light through
(Θ = 180° − φ) is drawn as an arc **at the droplet**, because that is where
Θ is measured. The readout panel carries the same numbers as a table —
θᵢ, the φ range from red to violet, Θ, and how far each order misses your eye
by — and both come from the same function, so the picture and the table
cannot drift apart.

Three internal reflections are included precisely because you can never see
them: that light leaves at φ ≈ 137.5°, which is about 42° *from the Sun* —
forward into the rain, away from you. The tertiary bow is not missing from
the sky opposite the Sun because the simulation stops at two bounces; it is
missing because it goes the other way, and the same engine that puts the
primary at 42.4° says so.

### What the grey rays are

Every droplet in the scene is lit, and every droplet concentrates that light
into exactly the same two directions — the sunlight is parallel and the
droplets are identical spheres, so nothing distinguishes one from another
except where it happens to sit. The faint grey rays leaving the grey droplets
are those directions, drawn from `rainbowGeometry` just like the coloured
ones. They are parallel to the coloured rays reaching the eye, and that is
the whole point: a grey droplet's light is not missing or weaker, it is aimed
somewhere else. A droplet is green when one of those two fixed directions
happens to end at your eye.

(Earlier versions drew the grey rays continuing straight on through the
droplet, undeviated. That was a stylised "and the light goes on", and it
corresponded to no ray the engine actually traces — the only fabricated
geometry left in the app. It is gone.)

## Interaction map

The control column shows only what the current scene actually reads, so a
control that is on screen always does something when you move it.

- **Single droplet** — drag vertically in the canvas, or use the impact
  parameter slider, to move the incoming ray. Scroll to pull the view back
  from the droplet. Click any ray to classify it.
  Watch the eye: it lights up brass exactly when the current ray reaches it.
  Drag the eye itself to stand somewhere else and hunt for the angle where
  the rays pile up.
- **Exit-angle graph** — click anywhere to set the impact parameter; the marker
  in the droplet follows, and vice versa.
- **Ray distribution** — raise the ray count and watch the caustic peak build
  from 10 rays to 100 000.
- **Many droplets** — green droplets are the ones sending light to the
  observer. They sit at every distance, which is the point. Drag the
  observer and a different set of droplets takes over. Click any droplet —
  green or grey — to see every ray it sends out and every angle involved;
  click empty sky to let it go.
- **Sky 3-D** — drag to orbit, scroll to zoom. Switch to the observer's eye to
  see the circle cut by the horizon. The cursor changes over a bow; click it
  to trace that beam back to the droplet it came from.

## Tracing one beam through the sky

Click any point on a bow in the 3-D scene and that beam is traced: the
sunlight arriving at a droplet in that direction, the ray that carries it
back to your eye, and — from the *same droplet* — where the other reflection
orders go instead. They miss, by exactly the angular gap between the bows,
and they carry on past you into the sky behind.

That is the point. A droplet contributes to exactly one bow for a given
observer, because order k concentrates its light onto a cone of half-angle
Θ_k about the incoming sunlight and only one of those cones has an element
ending at your eye. So the secondary bow you see is not the same rain as the
primary — it is made of entirely different droplets. The readout lists φ, Θ
and the miss angle for each order, and the trace stays on its bow when you
move the Sun, because what is stored is the position *around the circle*, not
a direction in space.

## The plots at the bottom

Two plots sit under the scene, **closed by default** — the scene is the way
in, and axes labelled `b/R` mean nothing until you have watched a ray go
through a droplet. Open them from the bar at the bottom of the page, and the
tutorial opens them itself at the three steps that talk about them. Each
carries a paragraph saying what it shows and how it relates to the bow:

- **Exit angle vs. impact parameter** — each incoming ray is labelled by
  where it hits the droplet (0 = dead centre, 1 = grazing the edge), and the
  curve gives the direction it leaves in. Near its turning point the curve is
  almost flat, so a whole band of impact parameters exits at nearly the same
  angle. That pile-up is the rainbow, and the angle it happens at is the
  bow's angular radius. One curve per wavelength, each turning over slightly
  differently — which is where the colours come from.
- **Ray distribution** — rays fired at random across the droplet's whole
  face, counted by the direction they leave in. This is brightness against
  angle, the same thing an eye measures sweeping across the sky, so the spike
  *is* the bow. Raise the ray count and it sharpens out of the noise on its
  own.

Both the scene and the graph have a **Save PNG** button that writes the
figure at triple resolution with a credit line baked in, so a figure pasted
into a slide keeps its provenance. PNG rather than SVG on purpose: the whole
app renders through Canvas 2-D, and a vector export would mean a second
drawing path per view that would have to agree with the first about every
angle.

The rendered bow is **off by default**. The intended path is to reconstruct it:
individual rays → distribution of exit angles → caustic → many droplets →
3-D cone → circular bow → horizon → visible arc.

---

© 2026 [lipka@fav.zcu.cz](https://home.zcu.cz/~lipka/) — Faculty of Applied
Sciences, University of West Bohemia. FAV marks used per the faculty
[visual style guide](https://www.fav.zcu.cz/cs/Faculty/Important-documents/fav-visual-style.html).
