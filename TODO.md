# Employee Termination Risk - Add More Toggles for Attrition Factors

## Completed Tasks
- [x] Update riskFactors state in App.jsx to include additional attrition factors (lowMonthlyIncome, longTenure, lowYearsWithManager)
- [x] Modify the what_if object in the prediction call to include new factors (MonthlyIncome, YearsAtCompany, YearsWithCurrManager)
- [x] Update keyDrivers in predictionResult to reflect new factors (Monthly Income, Years at Company, Years with Manager, Recent Promotion)
- [x] Update recommendations to include suggestions for new factors (Increase monthly income, Address long tenure concerns, Improve manager-employee relationships)

## Summary
The employee profile page now includes 7 toggles for risk factors instead of the original 4. The backend already supported arbitrary what_if parameters, so no changes were needed there. The UI now displays all toggles, and the prediction results include updated key drivers and recommendations based on the toggled factors.
