from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Union
import pandas as pd
import numpy as np
import joblib

# --------------------------------------------------
# APP SETUP
# --------------------------------------------------
app = FastAPI(title="Employee Attrition Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# LOAD DATA
# --------------------------------------------------
df = pd.read_csv("WA_Fn-UseC_-HR-Employee-Attrition.csv")

# --------------------------------------------------
# LOAD ML MODELS
# --------------------------------------------------
models = {
    "logistic_regression": joblib.load("model_logreg_best.joblib"),
    "random_forest": joblib.load("model_rf_best.joblib"),
    "gradient_boosting": joblib.load("model_gb_best.joblib"),
}
feature_columns = joblib.load("model_feature_columns.joblib")

# --------------------------------------------------
# JOB ROLE MAPPING BY DEPARTMENT
# --------------------------------------------------
JOB_ROLE_BY_DEPARTMENT = {
    "Research & Development": [
        "Laboratory Technician",
        "Research Scientist",
        "Manufacturing Director",
        "Healthcare Representative",
        "Research Director"
    ],
    "Sales": [
        "Sales Executive",
        "Sales Representative",
        "Manager"
    ],
    "Human Resources": [
        "Human Resources"
    ]
}

# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------
class StatsFilter(BaseModel):
    departments: Optional[List[str]] = None
    job_roles: Optional[List[str]] = None

class PredictRequest(BaseModel):
    employee_id: int
    model_name: str = "random_forest"
    what_if: Optional[Dict[str, Union[str, int]]] = {}

# --------------------------------------------------
# HELPER FUNCTIONS
# --------------------------------------------------
def attrition_agg(data: pd.DataFrame, col: str):
    """Returns attrition count grouped by a column"""
    return (
        data[data["Attrition"] == "Yes"][col]
        .value_counts()
        .reset_index()
        .rename(columns={"index": "name", col: "value"})
        .to_dict("records")
    )

def build_feature_vector(row: pd.Series):
    X = pd.DataFrame([row])
    X = pd.get_dummies(X)
    X = X.reindex(columns=feature_columns, fill_value=0)
    return X

# --------------------------------------------------
# MAIN DASHBOARD ENDPOINT
# --------------------------------------------------
@app.post("/stats")
def get_dashboard_stats(filters: StatsFilter):

    filtered_df = df.copy()

    # Apply filters
    if filters.departments:
        filtered_df = filtered_df[filtered_df["Department"].isin(filters.departments)]

    if filters.job_roles:
        filtered_df = filtered_df[filtered_df["JobRole"].isin(filters.job_roles)]

    total_employees = len(filtered_df)
    attrition_count = len(filtered_df[filtered_df["Attrition"] == "Yes"])

    # --------------------------------------------------
    # KPI CARDS
    # --------------------------------------------------
    kpis = {
        "total_employees": total_employees,
        "attrition_rate": round((attrition_count / total_employees) * 100, 2) if total_employees else 0,
        "avg_satisfaction": round(filtered_df["EnvironmentSatisfaction"].mean(), 2),
        "high_risk_employees": attrition_count,
    }

    # --------------------------------------------------
    # FEATURE ENGINEERING FOR BINS
    # --------------------------------------------------
    filtered_df["TenureBand"] = pd.cut(
        filtered_df["YearsAtCompany"],
        bins=[0, 2, 5, 10, 40],
        labels=["0–2", "2–5", "5–10", "10+"]
    )

    filtered_df["IncomeBand"] = pd.qcut(
        filtered_df["MonthlyIncome"],
        q=4,
        labels=["Low", "Medium", "High", "Very High"]
    )

    # --------------------------------------------------
    # CHART DATA (ATTRITION VS X)
    # --------------------------------------------------
    return {
        "kpis": kpis,

        "attrition_by_department": attrition_agg(filtered_df, "Department"),
        "attrition_by_job_role": attrition_agg(filtered_df, "JobRole"),
        "attrition_by_job_level": attrition_agg(filtered_df, "JobLevel"),
        "attrition_by_overtime": attrition_agg(filtered_df, "OverTime"),
        "attrition_by_job_satisfaction": attrition_agg(filtered_df, "JobSatisfaction"),
        "attrition_by_worklife_balance": attrition_agg(filtered_df, "WorkLifeBalance"),
        "attrition_by_tenure": attrition_agg(filtered_df, "TenureBand"),
        "attrition_by_income_band": attrition_agg(filtered_df, "IncomeBand"),
    }

# --------------------------------------------------
# EMPLOYEE LIST
# --------------------------------------------------
@app.get("/employees")
def get_employees():
    return (
        df[["EmployeeNumber", "Department", "JobRole"]]
        .drop_duplicates()
        .rename(columns={"EmployeeNumber": "employee_id", "Department": "department", "JobRole": "job_role"})
        .to_dict("records")
    )

# --------------------------------------------------
# SINGLE EMPLOYEE DETAILS
# --------------------------------------------------
@app.get("/employee/{employee_id}")
def get_employee(employee_id: int):
    emp = df[df["EmployeeNumber"] == employee_id]

    if emp.empty:
        return {"error": "Employee not found"}

    r = emp.iloc[0]

    return {
        "employee_id": employee_id,
        "department": r["Department"],
        "job_role": r["JobRole"],
        "job_level": int(r["JobLevel"]),
        "years_at_company": int(r["YearsAtCompany"]),
        "years_with_manager": int(r["YearsWithCurrManager"]),
        "monthly_income": float(r["MonthlyIncome"]),
        "job_satisfaction": int(r["JobSatisfaction"]),
        "work_life_balance": int(r["WorkLifeBalance"]),
        "overtime": r["OverTime"],
    }

# --------------------------------------------------
# FILTER OPTIONS (FOR UI DROPDOWNS)
# --------------------------------------------------
@app.get("/filters")
def get_filter_options(departments: str = Query("")):
    if departments:
        dept_list = departments.split(',')
        job_roles = []
        for dept in dept_list:
            if dept in JOB_ROLE_BY_DEPARTMENT:
                job_roles.extend(JOB_ROLE_BY_DEPARTMENT[dept])
        job_roles = sorted(list(set(job_roles)))  # Remove duplicates and sort
    else:
        # If no departments selected, return no job roles
        job_roles = []
    return {
        "departments": sorted(JOB_ROLE_BY_DEPARTMENT.keys()),
        "job_roles": job_roles,
    }

# --------------------------------------------------
# ML PREDICTION (REAL)
# --------------------------------------------------
@app.post("/predict")
def predict_attrition(req: PredictRequest):

    emp = df[df["EmployeeNumber"] == req.employee_id]
    if emp.empty:
        return {"error": "Employee not found"}

    row = emp.iloc[0].copy()

    # Apply what-if toggles
    for feature, value in req.what_if.items():
        if feature in row:
            row[feature] = value

    X = build_feature_vector(row)

    # Handle different models
    if req.model_name == "ensemble":
        # Average predictions from all three models
        probs = []
        for model in models.values():
            prob = model.predict_proba(X)[0][1]
            probs.append(prob)
        risk_prob = np.mean(probs)
    else:
        model_key = req.model_name.lower().replace(" ", "_")
        if model_key not in models:
            return {"error": f"Model {req.model_name} not found"}
        risk_prob = models[model_key].predict_proba(X)[0][1]

    if risk_prob >= 0.7:
        risk_level = "High"
    elif risk_prob >= 0.4:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return {
        "employee_id": req.employee_id,
        "risk_probability": round(float(risk_prob) * 100, 2),
        "risk_level": risk_level,
        "model_used": req.model_name,
    }
