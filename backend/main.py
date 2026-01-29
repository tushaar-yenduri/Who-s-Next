from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Union
import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import accuracy_score, recall_score, roc_auc_score

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
rf_model = joblib.load("model_rf_best.joblib")
feature_columns = joblib.load("model_feature_columns.joblib")
TOP_RISK_CACHE = None

# --------------------------------------------------
# COMPUTE MODEL METRICS
# --------------------------------------------------
def compute_model_metrics():
    # Prepare data
    X = pd.get_dummies(df.drop("Attrition", axis=1))
    X = X.reindex(columns=feature_columns, fill_value=0)
    y = df["Attrition"].map({"Yes": 1, "No": 0})

    metrics = {}
    for name, model in models.items():
        y_pred = model.predict(X)
        y_pred_proba = model.predict_proba(X)[:, 1]
        accuracy = accuracy_score(y, y_pred)
        recall = recall_score(y, y_pred, pos_label=1)
        auc = roc_auc_score(y, y_pred_proba)
        metrics[name] = {
            "accuracy": round(accuracy, 2),
            "recall": round(recall, 2),
            "auc": round(auc, 2)
        }
    # For ensemble, average the metrics
    ensemble_acc = np.mean([metrics[m]["accuracy"] for m in metrics])
    ensemble_recall = np.mean([metrics[m]["recall"] for m in metrics])
    ensemble_auc = np.mean([metrics[m]["auc"] for m in metrics])
    metrics["ensemble"] = {
        "accuracy": round(ensemble_acc, 2),
        "recall": round(ensemble_recall, 2),
        "auc": round(ensemble_auc, 2)
    }
    return metrics

MODEL_METRICS = compute_model_metrics()


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

def generate_recommendations(row: pd.Series, what_if: Dict[str, Union[str, int]]):
    recommendations = []
    key_drivers = []

    # Apply what_if to row for evaluation
    eval_row = row.copy()
    for feature, value in what_if.items():
        if feature in eval_row:
            eval_row[feature] = value

    # Overtime
    overtime = eval_row.get("OverTime", "No")
    if overtime == "Yes":
        recommendations.append("Reduce overtime hours to improve work-life balance.")
        impact = "High"
        contribution = 75
    else:
        impact = "Low"
        contribution = 25
    key_drivers.append({"factor": "Overtime", "impact": impact, "contribution": contribution})

    # Job Satisfaction
    job_sat = eval_row.get("JobSatisfaction", 3)
    if job_sat <= 2:
        recommendations.append(f"Improve job satisfaction from current level {job_sat} to at least 3 through engagement initiatives.")
        impact = "High" if job_sat == 1 else "Medium"
        contribution = 75 if impact == "High" else 50
    else:
        impact = "Low"
        contribution = 25
    key_drivers.append({"factor": "Job Satisfaction", "impact": impact, "contribution": contribution})

    # Work Life Balance
    wlb = eval_row.get("WorkLifeBalance", 3)
    if wlb <= 2:
        recommendations.append(f"Enhance work-life balance from current level {wlb} to at least 3 with flexible scheduling.")
        impact = "High" if wlb == 1 else "Medium"
        contribution = 75 if impact == "High" else 50
    else:
        impact = "Low"
        contribution = 25
    key_drivers.append({"factor": "Work-Life Balance", "impact": impact, "contribution": contribution})

    # Monthly Income
    income = eval_row.get("MonthlyIncome", 5000)
    if income < 4000:  # Assuming low threshold
        recommendations.append(f"Increase monthly income from ${income} to at least $4000 to boost retention.")
        impact = "High"
        contribution = 75
    else:
        impact = "Low"
        contribution = 25
    key_drivers.append({"factor": "Monthly Income", "impact": impact, "contribution": contribution})

    # Years at Company (Tenure)
    tenure = eval_row.get("YearsAtCompany", 5)
    if tenure > 10:
        recommendations.append(f"Address long tenure of {tenure} years with career development opportunities.")
        impact = "High"
        contribution = 75
    else:
        impact = "Low"
        contribution = 25
    key_drivers.append({"factor": "Years at Company", "impact": impact, "contribution": contribution})

    # Years with Manager
    years_mgr = eval_row.get("YearsWithCurrManager", 3)
    if years_mgr < 2:
        recommendations.append(f"Improve manager-employee relationship; current tenure with manager is {years_mgr} years.")
        impact = "High"
        contribution = 75
    else:
        impact = "Low"
        contribution = 25
    key_drivers.append({"factor": "Years with Manager", "impact": impact, "contribution": contribution})

    # Recent Promotion (assuming if YearsSinceLastPromotion > 5, it's an issue)
    years_last_promo = eval_row.get("YearsSinceLastPromotion", 2)
    if years_last_promo > 5:
        recommendations.append(f"Provide recent promotion opportunities; last promotion was {years_last_promo} years ago.")
        impact = "High"
        contribution = 75
    else:
        impact = "Low"
        contribution = 25
    key_drivers.append({"factor": "Recent Promotion", "impact": impact, "contribution": contribution})

    return recommendations, key_drivers




# --------------------------------------------------
# MAIN DASHBOARD ENDPOINT
# --------------------------------------------------
def compute_top_risk_employees(limit=5):
    risk_scores = []

    for _, row in df.iterrows():
        X = pd.DataFrame([row])
        X = pd.get_dummies(X)
        X = X.reindex(columns=feature_columns, fill_value=0)

        prob = rf_model.predict_proba(X)[0][1]

        risk_scores.append({
            "employee_id": int(row["EmployeeNumber"]),
            "department": row["Department"],
            "job_role": row["JobRole"],
            "job_level": int(row["JobLevel"]),
            "years_at_company": int(row["YearsAtCompany"]),
            "monthly_income": float(row["MonthlyIncome"]),
            "risk_probability": round(float(prob) * 100, 2),
            "risk_level": (
                "High" if prob >= 0.7 else
                "Medium" if prob >= 0.4 else
                "Low"
            )
        })

    risk_scores.sort(key=lambda x: x["risk_probability"], reverse=True)
    return risk_scores[:limit]
TOP_RISK_CACHE = None

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
# TOP RISK EMPLOYEES
# --------------------------------------------------
@app.get("/top_risk_employees")
def get_top_risk_employees(limit: int = 5):
    global TOP_RISK_CACHE

    if TOP_RISK_CACHE is None:
        TOP_RISK_CACHE = compute_top_risk_employees(limit)

    return TOP_RISK_CACHE


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

    # Generate recommendations and key drivers
    recommendations, key_drivers = generate_recommendations(row, req.what_if)

    metrics_key = req.model_name.lower().replace(" ", "_")
    selected_metrics = MODEL_METRICS.get(metrics_key, MODEL_METRICS["random_forest"])

    return {
        "employee_id": req.employee_id,
        "risk_probability": round(float(risk_prob) * 100, 2),
        "risk_level": risk_level,
        "model_used": req.model_name,
        "key_drivers": key_drivers,
        "recommendations": recommendations,
        "model_metrics": selected_metrics,
    }
