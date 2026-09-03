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
- `manifest.json` — web app manifest (name, icons, colors) so it can be installed
- `sw.js` — service worker for offline caching
- `icons/` — app icons used by the manifest

## Run it locally

Just open `index.html` in a browser. Nothing to install.

## Put it on GitHub Pages (so it works as a mobile "app")

1. Create a new repository on GitHub (e.g. `beam-solver`).
2. Upload **all the files, including the `icons` folder**, to the repository root
   (drag-and-drop on the GitHub web UI works fine — it accepts folders — or `git push`).
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Pick the `main` branch and `/ (root)` folder, then **Save**.
6. GitHub gives you a URL like `https://<your-username>.github.io/beam-solver/`
   — open that on your phone.
7. On iOS Safari or Android Chrome, use **Share → Add to Home Screen** to get
   an app-like icon that opens straight to the calculator.

Any time you edit a file and push the change, the live site updates within
a minute or two.

## Package it as a real Android app with PWABuilder

Once the site is live on GitHub Pages (step above — PWABuilder needs a public
URL, it can't package local files):

1. Go to **pwabuilder.com** on a desktop browser.
2. Paste your GitHub Pages URL (e.g. `https://<your-username>.github.io/beam-solver/`)
   and click **Start**.
3. PWABuilder scans the site and reads `manifest.json` — it should report the
   name, icons, and colors already filled in. If it flags anything as
   missing, it's usually fine to continue with the defaults.
4. Click **Package for Stores → Android**.
5. Leave the defaults (package ID, signing key) unless you specifically need
   to change them — PWABuilder can generate a signing key for you if you
   don't have one yet. **Save that keystore file somewhere safe** if you
   ever want to publish an update later; you'll need the same key.
6. Download the generated package — you'll get an `.apk` (installs directly)
   and/or `.aab` (for uploading to the Play Store).
7. To install the `.apk` directly on your phone: transfer it to the phone
   (email, Drive, USB), tap it, and allow "install unknown apps" for that
   source when prompted. It then installs and runs like any other app,
   using the beam icon and opening full-screen (no browser address bar).

Publishing the `.aab` to the Play Store is a separate step (needs a Google
Play Developer account) — the `.apk` is enough for installing it on your own
device.

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
