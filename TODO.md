# TODO — Asan Global Website Modernization

## Step 1 — Homepage polish (index + style)
- [ ] Move inline hero styles from `index.html` into `style.css` where practical.
- [ ] Add scroll-reveal animations (IntersectionObserver) with `prefers-reduced-motion` support.
- [ ] Upgrade forms UX (quote + contact + track redirect) without changing behavior.
- [ ] Replace `alert()` success messages with a reusable toast system.

## Step 2 — Code quality (index.js)
- [ ] Refactor `index.js` into small functions, remove dead code, keep same feature set.

## Step 3 — Tracking page conflict resolution
- [ ] Decide source of truth: either use inline script in `tracking.html` or move it fully into `tracking.js`.
- [ ] Remove duplicated intervals/simulation and guard against missing globals/elements.
- [ ] Ensure the map + timeline update correctly using one code path.

## Step 4 — Tracking UX improvements
- [ ] Improve timeline step updates (animate only changed steps).
- [ ] Reduce notification DOM thrash; avoid repeatedly injecting styles.
- [ ] Ensure chat UI works without polluting localStorage keys.

## Step 5 — Finance page consistency
- [ ] Align finance HTML IDs/classes with `finance.js` logic (or remove unused script).

## Step 6 — Accessibility + visual consistency
- [ ] Add `:focus-visible` styles across pages.
- [ ] Standardize button/card shadows and border radii.

## Step 7 — Final QA
- [ ] Smoke test: homepage navigation, quote/contact/track flows.
- [ ] Smoke test: tracking page with a demo ref.
- [ ] Check console for errors and remove duplicates.

