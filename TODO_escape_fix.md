# Escape-Function Fix — Analytics Module

## Root cause
`xmlEscape` / `escapeHtml` in analytics.js were replaced with no-op bodies:

```js
.replace(/</g, '<')   // "<" -> "<" (does nothing)
.replace(/>/g, '>')   // ">" -> ">" (does nothing)
.replace(/"/g, '"')   // '"' -> '"' (does nothing)
```

This neutralized escaping in the Excel (.xls) and PDF/HTML report exports.
The helper script `_fix_escapes.js` contained the same broken templates and
would re-corrupt the file if re-run.

## Steps
- [x] 1. Correct `xmlEscape` in analytics.js to real XML entities (`<`, `>`, `"`).
- [x] 2. Correct `escapeHtml` in analytics.js to real HTML entities (`<`, `>`, `"`).
- [x] 3. Harden `_fix_escapes.js` — correct entities, brace-safe replacement, `node --check` validation. Now also fixes `esc()`.
- [x] 4. Run the fix; validate analytics.js passes `node --check`.
- [x] 5. Behavioral unit test confirms all three functions produce correct entities.
- [x] 6. Report root cause, files modified, validation results, regressions.

