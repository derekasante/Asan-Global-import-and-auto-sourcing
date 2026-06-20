# BlackboxAI Upgrade TODO

## Phase 1 — Core design system + main pages
- [x] Inspect `dashboard2.html` fully (style references + structure)

- [x] Create/upgrade global design system in `style.css` (tokens, base styles, components)
- [x] Refactor `index.html` to remove absolute image paths (replace with relative placeholders)

- [x] Upgrade login styling to match design system: `login.css`

- [x] Fix `dashboard2.html` stylesheet link (use root `style.css` or correct path) and align dashboard layout styling
- [x] Quick visual sanity check by opening `index.html`, `login.html`, `dashboard2.html`

## Phase 2 — Apply to remaining pages
- [ ] Identify which `index*.html` pages are used/important
- [ ] For each selected page: update HTML classes/structure + link the design system CSS
- [ ] Remove references to missing/incorrect CSS files
- [ ] Sanity check responsiveness on mobile widths

