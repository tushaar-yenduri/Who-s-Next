from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import joblib
import os
import numpy as np

app = FastAPI(title="TalentGuard API")

# 1. Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Load Models & Data
BASE_DIR = os.getcwd()
csv_path = os.path.join(BASE_DIR, "WA_Fn-UseC_-HR-Employee-Attrition.csv")

try:
    # Load Models
    models = {
        "Logistic Regression": joblib.load(os.path.join(BASE_DIR, "model_logreg_best.joblib")),
        "Random Forest": joblib.load(os.path.join(BASE_DIR, "model_rf_best.joblib")),
        "Gradient Boosting": joblib.load(os.path.join(BASE_DIR, "model_gb_best.joblib")),
    }
    feature_cols = joblib.load(os.path.join(BASE_DIR, "model_feature_columns.joblib"))
    
    # Load Dataset (for Employee ID lookup & Stats)
    if os.path.exists(csv_path):
        df_full = pd.read_csv(csv_path)
        # Ensure exact column matching for ID
        if 'EmployeeNumber' not in df_full.columns:
             # Fallback if your CSV doesn't have EmployeeNumber
            df_full['EmployeeNumber'] = df_full.index + 1
    else:
        df_full = pd.DataFrame()
        print("WARNING: CSV file not found. Employee ID lookup will fail.")

except Exception as e:
    print(f"CRITICAL: Failed to load assets. {e}")
    models = {}
    feature_cols = []
    df_full = pd.DataFrame()

# 3. Data Models
class EmployeeData(BaseModel):
    Age: int
    DailyRate: int = 800
    DistanceFromHome: int
    Education: int
    EnvironmentSatisfaction: int
    HourlyRate: int = 80
    JobInvolvement: int
    JobLevel: int = 2
    JobSatisfaction: int
    MonthlyIncome: int
    NumCompaniesWorked: int
    PercentSalaryHike: int = 15
    PerformanceRating: int
    RelationshipSatisfaction: int = 3
    StockOptionLevel: int = 0
    TotalWorkingYears: int
    TrainingTimesLastYear: int = 2
    WorkLifeBalance: int = 3
    YearsAtCompany: int
    YearsInCurrentRole: int
    YearsSinceLastPromotion: int = 1
    YearsWithCurrManager: int = 2
    
    # Categorical
    BusinessTravel: str = "Travel_Rarely"
    Department: str
    EducationField: str = "Life Sciences"
    Gender: str = "Male"
    JobRole: str = "Research Scientist"
    MaritalStatus: str = "Single"
    OverTime: str

class StatsFilter(BaseModel):
    departments: List[str] = []
    job_roles: List[str] = []
    x_axis: str = "YearsAtCompany" # Default X
    y_axis: str = "MonthlyIncome"  # Default Y

# --- ENDPOINTS ---

@app.get("/")
def read_root():
    return {"status": "TalentGuard API is running", "version": "2.0"}

@app.get("/init")
def get_filter_options():
    """Returns unique Departments and Roles for the frontend filters"""
    if df_full.empty:
        return {"departments": [], "roles": []}
    return {
        "departments": sorted(df_full['Department'].unique().tolist()),
        "roles": sorted(df_full['JobRole'].unique().tolist())
    }

@app.post("/stats")
def get_company_stats(filters: StatsFilter):
    """Calculates aggregated metrics based on selected filters"""
    if df_full.empty:
        return {}
    
    # 1. Apply Filters (Dept & Role)
    filtered_df = df_full.copy()
    if filters.departments:
        filtered_df = filtered_df[filtered_df['Department'].isin(filters.departments)]
    if filters.job_roles:
        filtered_df = filtered_df[filtered_df['JobRole'].isin(filters.job_roles)]

    # 2. KPI Metrics
    total_emp = len(filtered_df)
    attrition_count = len(filtered_df[filtered_df['Attrition'] == 'Yes'])
    attrition_rate = (attrition_count / total_emp * 100) if total_emp > 0 else 0
    avg_sat = filtered_df['JobSatisfaction'].mean() if total_emp > 0 else 0
    avg_inc = filtered_df['MonthlyIncome'].mean() if total_emp > 0 else 0

    # 3. Chart: Attrition by Department
    dept_att = filtered_df[filtered_df['Attrition'] == 'Yes']['Department'].value_counts().reset_index()
    dept_att.columns = ['name', 'value']
    dept_chart_data = dept_att.to_dict('records')

    # 4. Chart: Dynamic Scatter Plot (Feature vs Feature)
    # Validate columns exist to prevent crashes
    valid_cols = df_full.select_dtypes(include=np.number).columns
    x_col = filters.x_axis if filters.x_axis in valid_cols else "YearsAtCompany"
    y_col = filters.y_axis if filters.y_axis in valid_cols else "MonthlyIncome"

    # Sample up to 500 points for performance
    scatter_df = filtered_df.sample(min(500, len(filtered_df)))[[x_col, y_col, 'Attrition']]
    scatter_data = []
    for _, row in scatter_df.iterrows():
        scatter_data.append({
            "x": row[x_col],
            "y": row[y_col],
            "z": 1, 
            "attrition": row['Attrition']
        })

    return {
        "kpi": {
            "total_employees": int(total_emp),
            "attrition_rate": float(attrition_rate),
            "avg_satisfaction": float(avg_sat),
            "avg_income": float(avg_inc)
        },
        "dept_chart": dept_chart_data,
        "scatter_chart": scatter_data
    }

@app.get("/employee/{emp_id}")
def get_employee(emp_id: int):
    if df_full.empty:
        raise HTTPException(status_code=500, detail="Database not loaded")
    
    # Find row
    emp = df_full[df_full['EmployeeNumber'] == emp_id]
    if emp.empty:
        raise HTTPException(status_code=404, detail="Employee ID not found")
    
    # Convert to dict and handle NaN
    data = emp.iloc[0].to_dict()
    # Clean up numpy types for JSON serialization
    clean_data = {k: (v.item() if hasattr(v, 'item') else v) for k, v in data.items()}
    
    return clean_data

# --- PREDICTION ENDPOINT ---
@app.post("/predict/{model_name}")
def predict_attrition(model_name: str, employee: EmployeeData):
    # 1. Process Input
    input_df = pd.DataFrame([employee.dict()])
    
    # One-Hot Encoding
    cat_cols = ['BusinessTravel', 'Department', 'EducationField', 'Gender', 'JobRole', 'MaritalStatus', 'OverTime']
    df_enc = pd.get_dummies(input_df, columns=cat_cols)
    
    # Align columns to match training features
    for col in feature_cols:
        if col not in df_enc.columns:
            df_enc[col] = 0
    X = df_enc[feature_cols]
    
    # 2. Prediction Logic
    probability = 0.0
    
    print(f"--- Request for Model: {model_name} ---") # Debug Print

    # A. Check if it's the special Ensemble request
    if model_name == "Ensemble (All Models)":
        probs = []
        for m_name, m in models.items():
            try:
                # Get probability from each loaded model
                p = float(m.predict_proba(X)[0, 1])
                probs.append(p)
                print(f"Model {m_name}: {p:.4f}") 
            except Exception as e:
                print(f"Error predicting with {m_name}: {e}")
        
        # Calculate Average
        if probs:
            probability = float(np.mean(probs))
            print(f" >> Ensemble Average: {probability:.4f}")
        else:
            raise HTTPException(status_code=500, detail="Ensemble calculation failed")

    # B. Check if it's a standard single model
    elif model_name in models:
        model = models[model_name]
        probability = float(model.predict_proba(X)[0, 1])
        print(f" >> Single Model Result: {probability:.4f}")
        
    # C. If neither, throw error
    else:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
    
    # 3. Generate Explanations (Why?)
    drivers = []
    
    if employee.OverTime == "Yes":
        drivers.append({"name": "Overtime", "impact": "High", "desc": "Working overtime significantly increases burnout risk."})
    
    if employee.MonthlyIncome < 3000:
        drivers.append({"name": "Income", "impact": "High", "desc": "Income is in the lower 25th percentile."})
    
    if employee.YearsAtCompany < 2 and employee.TotalWorkingYears > 5:
        drivers.append({"name": "Job Hopping", "impact": "Medium", "desc": "History of short tenure suggests flight risk."})
        
    if employee.EnvironmentSatisfaction < 2 or employee.JobSatisfaction < 2:
        drivers.append({"name": "Satisfaction", "impact": "Critical", "desc": "Low reported satisfaction scores."})

    if employee.DistanceFromHome > 20:
        drivers.append({"name": "Commute", "impact": "Medium", "desc": "Long commute distance (>20 miles)."})

    return {
        "model": model_name,
        "attrition_probability": float(probability),
        "risk_level": "CRITICAL" if probability > 0.6 else "MEDIUM" if probability > 0.4 else "LOW",
        "drivers": drivers
    }