from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd

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
# REQUEST MODEL
# --------------------------------------------------
class StatsFilter(BaseModel):
    departments: Optional[List[str]] = None
    job_roles: Optional[List[str]] = None

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
        "avg_income": round(filtered_df["MonthlyIncome"].mean(), 0),
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
# FILTER OPTIONS (FOR UI DROPDOWNS)
# --------------------------------------------------
@app.get("/filters")
def get_filter_options():
    return {
        "departments": sorted(df["Department"].unique().tolist()),
        "job_roles": sorted(df["JobRole"].unique().tolist()),
    }
