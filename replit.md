# Asan Global — Import & Auto Sourcing Website

## Overview
A static, multi-page marketing/logistics website for "Asan Global" (vehicle import & auto sourcing). No backend or build step — plain HTML, CSS, and vanilla JS files served as-is. Key pages include the homepage (`index.html`), shipment tracking (`tracking.html`), client dashboard (`dashboard.html`), finance (`finance.html`), admin panel (`Admin.html`), login (`login.html`), pricing (`price.html`), and a client agreement form.

This project was imported from a zip upload as-is; its existing file layout was intentionally left untouched (including older numbered draft files like `index1.html`–`index28.html` and `style2.css`–`style20.css`) at the user's request not to remove anything.

## Running the project
- `npm run start` serves the whole project as static files on port 5000 via the `serve` package (see `package.json`).
- This is bound to the "Start application" workflow, which auto-starts the preview.
- No environment variables or secrets are required to run the site itself.

## Notes
- No `package.json` existed before setup; one was created solely to add the `serve` dev-dependency and `start` script.
- There's a leftover `zipFile.zip` (the original import archive) in the project root — left in place per user request.
- `TODO.md`, `TODO_AI_CHAT.md`, `TODO_AI_WIDGET_REFACTOR.md`, and `TODO_PRO_STYLE.md` document known pending cleanup/refactor ideas from the original author (e.g. tracking page has duplicated logic between inline script and `tracking.js`).

## User preferences
- Do not delete, restructure, or "clean up" existing files (including old draft/numbered files) without explicit permission.
