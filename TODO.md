# TODO: Redesign Attrition Risk Assessment Card

## Tasks
- [x] Modify the Attrition Risk Assessment card in frontend/src/App.jsx to use a 2-column layout (40% left for gauge, 60% right for context)
- [x] Keep semi-circular gauge as-is, center percentage text inside arc
- [x] Below gauge: Display Risk Level and Model used
- [x] Right section: Add Risk Comparison block (Employee Risk, Department/Company averages if available) - Skipped as backend doesn't provide averages
- [x] Right section: Add Risk Band Explanation (short sentence based on risk level)
- [x] Right section: Add Top Risk Drivers Summary (Top 2 from key_drivers)
- [x] Add subtle hover elevation to the card (already present)
- [x] Ensure responsive stacking on smaller screens (gauge on top, context below)
- [x] If comparison data unavailable, gracefully hide the subsection
