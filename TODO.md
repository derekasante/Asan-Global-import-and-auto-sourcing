# Analytics & Reporting Module — Enhancement Plan

## Objective
Enhance the existing analytics module (non-breaking) to add demo data seeding, a documented
data-adapter layer, functional Excel/PDF exports, chart tooltips, and real trend indicators
for every KPI — while keeping all existing IDs, APIs, and navigation intact.

## Steps

- [x] 1. Review existing analytics.html / analytics.js / analytics.css, design-system.css,
         sidebar.js, payments.js, admin-dashboard.html, and backend/server.js.

- [ ] 2. analytics.js — Add `seedDemoData()` (only seeds if stores are empty).
- [ ] 3. analytics.js — Add documented data-adapter layer (`DATA_SOURCES`) for future backend analytics APIs.
- [ ] 4. analytics.js — Make CSV export fully functional (already works; verify + polish).
- [ ] 5. analytics.js — Make Excel export generate a real `.xls` file (SpreadsheetML).
- [ ] 6. analytics.js — Make PDF export functional via a print-friendly popup window.
- [ ] 7. analytics.js — Add bar-chart hover tooltips.
- [ ] 8. analytics.js — Compute real period-over-period trends for every KPI card.
- [ ] 9. analytics.css — Add tooltip styles, print styles, and export UX polish.
- [ ] 10. analytics.html — Update export button labels + expand future-backend-API docs.
- [ ] 11. Test charts, filters, CSV/Excel/PDF/Print; verify backward compatibility.
- [ ] 12. Report files modified, performance improvements, future backend integration points.
