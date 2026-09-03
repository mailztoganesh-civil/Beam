# Beam Solver

A mobile-friendly, offline-capable calculator for the 32 standard beam and
loading conditions in the American Wood Council's **Design Aid No. 6 –
Beam Design Formulas with Shear and Moment Diagrams** (2005/2007).

Select a beam and loading configuration, enter the span/length and load
values, and get reactions, maximum shear, maximum moment, and (where a
closed-form expression exists) maximum deflection — plus shear and moment
diagrams drawn to scale from the actual formulas.

No build step, no dependencies, no server. It's three static files.

## Files

- `index.html` — page structure and styling
- `beams.js` — the 32 beam formula definitions
- `app.js` — UI wiring, numeric solver, and diagram rendering

## Run it locally

Just open `index.html` in a browser. Nothing to install.

## Put it on GitHub Pages (so it works as a mobile "app")

1. Create a new repository on GitHub (e.g. `beam-solver`).
2. Upload `index.html`, `beams.js`, and `app.js` to the repository root
   (drag-and-drop on the GitHub web UI works fine, or `git push`).
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Pick the `main` branch and `/ (root)` folder, then **Save**.
6. GitHub gives you a URL like `https://<your-username>.github.io/beam-solver/`
   — open that on your phone.
7. On iOS Safari or Android Chrome, use **Share → Add to Home Screen** to get
   an app-like icon that opens straight to the calculator.

Any time you edit a file and push the change, the live site updates within
a minute or two.

## Units

The app doesn't force a unit system — enter length, load, E and I in any
consistent set (e.g. N & mm, kN & m, or lb & in) and the outputs come back
in the matching force/length units. A note in the input section repeats
this.

## Scope and accuracy

Formulas are transcribed directly from Design Aid No. 6. Reactions,
maximum shear, and maximum moment are checked by static-equilibrium and
moment-continuity tests for every configuration. Deflection is only shown
where the source gives a direct closed-form maximum-deflection expression
for that specific loading case.

This tool is for quick checks and preliminary sizing. Verify all results
independently — against hand calculation or STAAD.Pro — before using them
in a stamped design.
