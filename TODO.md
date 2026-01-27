# Employee Termination Risk - Update Recommendations

## Completed Tasks
- [x] Analyze user task: Update Improvement recommendations to be dynamic and statistic specific, defining what actually needs to improve, and no comments for low impact factors.
- [x] Search for relevant files containing "recommendation" or "improvement" terms.
- [x] Read and understand the current implementation in frontend/src/App.jsx and backend/main.py.
- [x] Brainstorm plan: Move recommendation logic to backend for dynamic generation based on employee data and what-if scenarios.
- [x] Implement generate_recommendations function in backend/main.py to create dynamic recommendations based on key factors (Overtime, Job Satisfaction, Work-Life Balance, Monthly Income, Years at Company, Years with Manager, Recent Promotion).
- [x] Update predict endpoint in backend to include key_drivers and recommendations in response.
- [x] Update frontend to use backend response for keyDrivers and recommendations instead of hardcoded values.
- [x] Ensure only high and medium impact factors generate recommendations, excluding low impact ones.

## Summary
The recommendations are now dynamic and statistic-specific:
- Generated based on actual employee data and what-if toggles.
- Include specific values (e.g., current job satisfaction level, income amount).
- Only show recommendations for high and medium impact factors.
- No recommendations for low impact factors.
