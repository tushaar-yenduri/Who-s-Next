import streamlit as st
import pandas as pd
import numpy as np
import joblib
import os
import plotly.express as px
import plotly.graph_objects as go

# ---------------------------------------------------------
# 1. PAGE CONFIG & STYLING
# ---------------------------------------------------------
# Streamlit Page Config
st.set_page_config(
    page_title="Who's Next | HR Analytics",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS to match the React "Modern" look
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
        color: #1e293b;
        background-color: #f8fafc; /* Reverted to clean slate/white */
    }
    
    /* Main container background */
    .stApp {
        background-color: #f8fafc;
    }
    
    /* Header styling */
    h1, h2, h3 { font-weight: 700 !important; color: #0f172a; }
    
    /* Sidebar */
    [data-testid="stSidebar"] {
        background-color: #ffffff;
        border-right: 1px solid #e2e8f0;
    }
    
    /* Custom KPI Cards */
    .kpi-card {
        padding: 20px;
        border-radius: 16px;
        border: 1px solid rgba(0,0,0,0.05);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        transition: transform 0.2s;
        background-color: white;
    }
    .kpi-card:hover { transform: translateY(-2px); }
    
    .kpi-pink { background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%); border-color: #fecdd3; }
    .kpi-yellow { background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); border-color: #fde047; }
    .kpi-blue { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-color: #bfdbfe; }
    .kpi-purple { background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-color: #d8b4fe; }
    
    .kpi-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; margin-bottom: 0.5rem; }
    .kpi-value { font-size: 2rem; font-weight: 800; color: #1e293b; line-height: 1; }
    .kpi-sub { font-size: 0.8rem; margin-top: 0.5rem; font-weight: 500; opacity: 0.8; }
    
    /* Risk Banner */
    .risk-banner {
        padding: 24px;
        border-radius: 16px;
        margin-bottom: 24px;
        border: 1px solid;
    }
    
    /* Driver Card */
    .driver-card {
        background-color: white;
        padding: 12px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        margin-bottom: 8px;
    }
</style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------
# 2. LOAD ASSETS (Models & Data)
# ---------------------------------------------------------
@st.cache_resource
def load_assets():
    base_dir = os.getcwd()
    # Try 'backend' folder first, then root
    paths_to_check = [
        os.path.join(base_dir, "backend"),
        base_dir
    ]
    
    model_dir = None
    for p in paths_to_check:
        if os.path.exists(os.path.join(p, "model_logreg_best.joblib")):
            model_dir = p
            break
            
    # Default return values
    loaded_models = {}
    features = []
    df = pd.DataFrame()

    if not model_dir:
        st.error("Could not find model files. Ensure they are in 'backend/' or the root folder.")
        # Return empty/default to avoid immediate crash
        return loaded_models, features, df

    model_paths = {
        "Logistic Regression": os.path.join(model_dir, "model_logreg_best.joblib"),
        "Random Forest": os.path.join(model_dir, "model_rf_best.joblib"),
        "Gradient Boosting": os.path.join(model_dir, "model_gb_best.joblib"),
    }
    
    for name, path in model_paths.items():
        if os.path.exists(path):
            loaded_models[name] = joblib.load(path)
            
    cols_path = os.path.join(model_dir, "model_feature_columns.joblib")
    features = joblib.load(cols_path) if os.path.exists(cols_path) else []

    csv_path = os.path.join(model_dir, "WA_Fn-UseC_-HR-Employee-Attrition.csv")
    if os.path.exists(csv_path):
        try:
            df = pd.read_csv(csv_path)
            # Ensure EmployeeNumber exists
            if not df.empty and 'EmployeeNumber' not in df.columns:
                df['EmployeeNumber'] = df.index + 1
        except Exception as e:
            st.error(f"Error loading CSV: {e}")
            
    return loaded_models, features, df

models, feature_cols, df_full = load_assets()

# ---------------------------------------------------------
# 3. HELPER FUNCTIONS
# ---------------------------------------------------------
def prepare_input(data_dict, feature_cols):
    df_input = pd.DataFrame([data_dict])
    cat_cols = ['BusinessTravel', 'Department', 'EducationField', 'Gender', 'JobRole', 'MaritalStatus', 'OverTime']
    
    # Ensure all categorical columns exist
    for col in cat_cols:
        if col not in df_input.columns:
            df_input[col] = "Unknown" # Or handle appropriately

    df_enc = pd.get_dummies(df_input, columns=cat_cols)
    
    # Align columns
    if feature_cols:
        for col in feature_cols:
            if col not in df_enc.columns:
                df_enc[col] = 0
        return df_enc[feature_cols]
    return df_enc # Fallback if feature_cols not loaded

def predict(model_name, input_data):
    # Safety check
    if not feature_cols or not models:
        return 0.5 # Default probability if models missing
        
    X = prepare_input(input_data, feature_cols)
    prob = 0.0
    
    if model_name == "Ensemble (All Models)":
        probs = []
        for m in models.values():
            try:
                if hasattr(m, "predict_proba"):
                    probs.append(m.predict_proba(X)[0, 1])
                else:
                    # Fallback for models without predict_proba if any
                    pass
            except: pass
        if probs:
            prob = np.mean(probs)
    elif model_name in models:
        try:
            prob = models[model_name].predict_proba(X)[0, 1]
        except:
            prob = 0.5 # Error fallback
    
    return prob

def get_risk_drivers(data, prob):
    drivers = []
    if data.get('OverTime') == "Yes":
        drivers.append({"name": "Overtime", "impact": "High", "desc": "Working overtime significantly increases burnout risk."})
    if data.get('MonthlyIncome', 0) < 3000: # Example threshold
        drivers.append({"name": "Income", "impact": "High", "desc": "Income is in the lower percentile."})
    if data.get('YearsAtCompany', 0) < 2 and data.get('TotalWorkingYears', 0) > 5:
        drivers.append({"name": "Job Hopping", "impact": "Medium", "desc": "History of short tenure suggests flight risk."})
    if data.get('EnvironmentSatisfaction', 3) < 2 or data.get('JobSatisfaction', 3) < 2:
        drivers.append({"name": "Satisfaction", "impact": "Critical", "desc": "Low reported satisfaction scores."})
    if data.get('DistanceFromHome', 0) > 20:
        drivers.append({"name": "Commute", "impact": "Medium", "desc": "Long commute distance (>20 miles)."})
    return drivers

# ---------------------------------------------------------
# 4. SIDEBAR NAVIGATION
# ---------------------------------------------------------
with st.sidebar:
    st.title("⚡ Who's Next")
    st.caption("Attrition Prediction System")
    st.markdown("---")
    
    view_mode = st.radio("Dashboard Mode", ["Employee Profile", "Company Overview"], label_visibility="collapsed")
    
    st.markdown("---")
    
    if view_mode == "Employee Profile":
        st.subheader("Prediction Model")
        # Only show available models
        avail_options = ["Ensemble (All Models)"]
        if models:
            avail_options = list(models.keys()) + ["Ensemble (All Models)"]
            
        model_choice = st.radio("Select Model", 
            avail_options,
            label_visibility="collapsed"
        )
    
    elif view_mode == "Company Overview":
        st.subheader("Data Filters")
        
        # Cascading Filters - Safe check for empty df
        if not df_full.empty:
            all_depts = sorted(df_full['Department'].dropna().unique())
            sel_depts = st.multiselect("Departments", all_depts, default=all_depts)
            
            # Filter df first to get available roles
            mask = df_full['Department'].isin(sel_depts)
            avail_roles = sorted(df_full[mask]['JobRole'].dropna().unique())
            sel_roles = st.multiselect("Job Roles", avail_roles, default=avail_roles)
        else:
            sel_depts = []
            sel_roles = []
            st.warning("Data not loaded.")

# ---------------------------------------------------------
# 5. VIEW: EMPLOYEE PROFILE
# ---------------------------------------------------------
if view_mode == "Employee Profile":
    
    # Initialize Session State for Form
    if 'form_data' not in st.session_state:
        st.session_state.form_data = {
            'Age': 30, 'Department': 'Sales', 'MonthlyIncome': 5000, 'OverTime': 'No',
            'JobSatisfaction': 3, 'EnvironmentSatisfaction': 3, 'JobInvolvement': 3, 'PerformanceRating': 3,
            'YearsAtCompany': 5, 'TotalWorkingYears': 8, 'DistanceFromHome': 10,
            'NumCompaniesWorked': 1, 'Education': 3, 'WorkLifeBalance': 3, 'YearsInCurrentRole': 2, 'YearsSinceLastPromotion': 1, 'YearsWithCurrManager': 2
        }
    
    # Grid Layout
    col_left, col_right = st.columns([1, 2], gap="large")
    
    # --- LEFT COLUMN (Inputs) ---
    with col_left:
        # Search Box (Styled)
        with st.container():
            st.markdown("##### 🔍 Find Employee")
            c_search, c_btn = st.columns([3, 1])
            with c_search:
                search_id = st.number_input("ID", min_value=1, value=1, label_visibility="collapsed", placeholder="ID")
            with c_btn:
                search_click = st.button("Go", type="primary")
            
            if search_click and not df_full.empty:
                emp = df_full[df_full['EmployeeNumber'] == search_id]
                if not emp.empty:
                    row = emp.iloc[0]
                    # Update session state with found data
                    for k in st.session_state.form_data.keys():
                        if k in row:
                            val = row[k]
                            # Handle numpy types
                            if isinstance(val, (np.integer, np.floating)):
                                val = int(val) if k not in ['MonthlyIncome'] else float(val) # Keep income float if needed, mostly int
                            st.session_state.form_data[k] = val
                    st.success(f"Loaded ID {search_id}")
                else:
                    st.error("ID Not Found")

        st.markdown("---")
        
        # Edit Factors Form
        st.markdown("##### ⚙️ Edit Factors")
        
        current_data = st.session_state.form_data
        
        # Safe Department Index
        dept_options = ["Sales", "Research & Development", "Human Resources"]
        curr_dept = current_data['Department']
        dept_idx = dept_options.index(curr_dept) if curr_dept in dept_options else 0
        
        new_dept = st.selectbox("Department", dept_options, index=dept_idx)
        
        c1, c2 = st.columns(2)
        with c1:
            new_income = st.number_input("Income ($)", value=int(current_data['MonthlyIncome']))
        with c2:
            new_overtime = st.selectbox("Overtime", ["Yes", "No"], index=0 if current_data['OverTime'] == "Yes" else 1)
            
        new_js = st.slider("Job Satisfaction", 1, 4, int(current_data['JobSatisfaction']))
        new_es = st.slider("Env. Satisfaction", 1, 4, int(current_data['EnvironmentSatisfaction']))
        new_ji = st.slider("Job Involvement", 1, 4, int(current_data['JobInvolvement']))
        
        # Update Session State on Change (Simplification: Just gather for prediction)
        prediction_payload = current_data.copy()
        prediction_payload.update({
            'Department': new_dept, 'MonthlyIncome': new_income, 'OverTime': new_overtime,
            'JobSatisfaction': new_js, 'EnvironmentSatisfaction': new_es, 'JobInvolvement': new_ji
        })
        
        analyze = st.button("Analyze Risk", type="primary", use_container_width=True)
        
        c_reset, c_save = st.columns(2)
        with c_reset:
            if st.button("Reset Defaults"):
                pass
        with c_save:
            st.button("Save Report", disabled=True)

    # --- RIGHT COLUMN (Results) ---
    with col_right:
        if analyze:
            prob = predict(model_choice, prediction_payload)
            pct = prob * 100
            
            # 1. RISK BANNER
            if prob > 0.6:
                color_css = "background-color: #fef2f2; border-color: #fecaca; color: #991b1b;"
                level = "CRITICAL"
                icon = "⚠️"
            elif prob > 0.4:
                color_css = "background-color: #fff7ed; border-color: #fed7aa; color: #9a3412;"
                level = "MEDIUM"
                icon = "⚠️"
            else:
                color_css = "background-color: #f0fdf4; border-color: #bbf7d0; color: #166534;"
                level = "LOW"
                icon = "✅"
                
            st.markdown(f"""
            <div style="{color_css} padding: 24px; border-radius: 12px; border-width: 1px; border-style: solid; display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Attrition Probability</div>
                    <div style="font-size: 3.5rem; font-weight: 900; line-height: 1;">{pct:.1f}%</div>
                </div>
                <div style="font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                    <span>{icon}</span> {level} RISK
                </div>
            </div>
            """, unsafe_allow_html=True)
            
            # 2. STATUS OVERVIEW
            st.markdown(f"""
            <div style="margin-top: 20px; padding: 20px; background: white; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h4 style="margin-top: 0;">📄 Status Overview</h4>
                <p style="color: #475569; margin-bottom: 0;">
                    The employee is currently <strong>{level} RISK</strong>. 
                    {'Primary concerns include high overtime and salary discrepancy.' if prob > 0.4 else 'Retention probability is high. Continue monitoring satisfaction levels.'}
                    <br>Current Tenure: <strong>{prediction_payload['YearsAtCompany']} Years</strong>. Income: <strong>${prediction_payload['MonthlyIncome']}</strong>.
                </p>
            </div>
            """, unsafe_allow_html=True)
            
            # 3. PEER BENCHMARK (Bar Charts)
            st.markdown("#### 📊 Peer Benchmark")
            row_bench = st.columns(2)
            
            # Global Avgs - Safe calc
            avg_inc = df_full['MonthlyIncome'].mean() if not df_full.empty and 'MonthlyIncome' in df_full.columns else 6500
            avg_tenure = df_full['YearsAtCompany'].mean() if not df_full.empty and 'YearsAtCompany' in df_full.columns else 7
            
            with row_bench[0]:
                fig_inc = go.Figure(data=[
                    go.Bar(name='This Employee', x=['Income'], y=[new_income], marker_color='#6366f1'),
                    go.Bar(name='Company Avg', x=['Income'], y=[avg_inc], marker_color='#cbd5e1')
                ])
                fig_inc.update_layout(title_text="Monthly Income", barmode='group', height=200, margin=dict(l=20, r=20, t=30, b=20), paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
                st.plotly_chart(fig_inc, use_container_width=True)
                
            with row_bench[1]:
                fig_ten = go.Figure(data=[
                    go.Bar(name='This Employee', x=['Tenure'], y=[prediction_payload['YearsAtCompany']], marker_color='#10b981'),
                    go.Bar(name='Company Avg', x=['Tenure'], y=[avg_tenure], marker_color='#cbd5e1')
                ])
                fig_ten.update_layout(title_text="Tenure (Years)", barmode='group', height=200, margin=dict(l=20, r=20, t=30, b=20), paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
                st.plotly_chart(fig_ten, use_container_width=True)

            # 4. RADAR & DRIVERS
            col_radar, col_driver = st.columns(2)
            
            with col_radar:
                st.markdown("#### Engagement Profile")
                cats = ['Job Sat.', 'Env Sat.', 'Involvement', 'Performance']
                vals = [new_js, new_es, new_ji, 3]
                
                # FIXED SCATTERPOLAR SYNTAX
                fig_rad = go.Figure(data=go.Scatterpolar(
                    r=vals, theta=cats, fill='toself', 
                    line=dict(color='#6366f1'), fillcolor='rgba(99, 102, 241, 0.3)'
                ))
                fig_rad.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 4])), showlegend=False, height=250, margin=dict(t=20, b=20, l=40, r=40), paper_bgcolor='rgba(0,0,0,0)')
                st.plotly_chart(fig_rad, use_container_width=True)
                
            with col_driver:
                st.markdown("#### Key Risk Drivers")
                drivers = get_risk_drivers(prediction_payload, prob)
                
                if not drivers:
                    st.success("No major negative drivers detected.")
                else:
                    for d in drivers:
                        badge_color = "#fecaca" if d['impact'] in ['High', 'Critical'] else "#fed7aa"
                        text_color = "#991b1b" if d['impact'] in ['High', 'Critical'] else "#9a3412"
                        st.markdown(f"""
                        <div class="driver-card">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="font-weight: 700; font-size: 0.9rem;">{d['name']}</span>
                                <span style="background-color: {badge_color}; color: {text_color}; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 99px; text-transform: uppercase;">{d['impact']}</span>
                            </div>
                            <div style="font-size: 0.8rem; color: #64748b; line-height: 1.4;">{d['desc']}</div>
                        </div>
                        """, unsafe_allow_html=True)
                        
            # 5. AI RECOMMENDATION
            rec_box_color = "#eff6ff" if prob > 0.4 else "#f0fdf4"
            rec_border = "#dbeafe" if prob > 0.4 else "#bbf7d0"
            
            # Construct recommendations list in Python to ensure clean HTML rendering
            recommendations = []
            if prediction_payload['MonthlyIncome'] < 3000:
                recommendations.append("Consider <strong>market salary correction</strong> immediately.")
            if prediction_payload['OverTime'] == 'Yes':
                recommendations.append("Review workload distribution to reduce <strong>overtime</strong>.")
            if new_js < 3:
                recommendations.append("Schedule a 1-on-1 for <strong>role alignment</strong>.")
            recommendations.append('Conduct a standard "Stay Interview".')
            
            # Join list items
            rec_items_html = "".join([f"<li style='margin-bottom: 4px;'>{r}</li>" for r in recommendations])

            st.markdown(f"""
            <div style="background-color: {rec_box_color}; border: 1px solid {rec_border}; border-radius: 12px; padding: 20px; margin-top: 10px;">
                <h4 style="margin-top: 0; color: #1e293b;">🤖 AI Recommendation</h4>
                <ul style="font-size: 0.9rem; margin-bottom: 0; padding-left: 20px; color: #334155;">
                    {rec_items_html}
                </ul>
            </div>
            """, unsafe_allow_html=True)

        else:
            st.info("👈 Enter Employee ID or edit factors, then click 'Analyze Risk' to see predictions.")

# ---------------------------------------------------------
# 6. VIEW: COMPANY OVERVIEW
# ---------------------------------------------------------
elif view_mode == "Company Overview":
    
    # --- FILTERS LOGIC ---
    if df_full.empty:
        st.warning("Dataset not loaded. Please upload 'WA_Fn-UseC_-HR-Employee-Attrition.csv'.")
    else:
        # Apply filters to df_full
        filtered_df = df_full[
            (df_full['Department'].isin(sel_depts)) &
            (df_full['JobRole'].isin(sel_roles))
        ]
        
        # 0. Empty State
        if filtered_df.empty:
            st.warning("No data matches the selected filters.")
        else:
            # --- 1. KPI CARDS ---
            total = len(filtered_df)
            
            # Safety checks for columns
            if 'Attrition' in filtered_df.columns:
                att_count = len(filtered_df[filtered_df['Attrition'] == 'Yes'])
                att_rate = (att_count / total) * 100
            else:
                att_rate = 0.0
                
            if 'JobSatisfaction' in filtered_df.columns:
                avg_sat = filtered_df['JobSatisfaction'].mean()
            else:
                avg_sat = 0.0
                
            if 'MonthlyIncome' in filtered_df.columns:
                avg_inc_kpi = filtered_df['MonthlyIncome'].mean()
            else:
                avg_inc_kpi = 0.0
            
            # HTML Layout for cards
            kpi_html = f"""
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
                <div class="kpi-card kpi-pink">
                    <div class="kpi-label" style="color: #be185d;">Total Employees</div>
                    <div class="kpi-value">{total}</div>
                    <div class="kpi-sub" style="color: #be185d;">Active Workforce</div>
                </div>
                <div class="kpi-card kpi-yellow">
                    <div class="kpi-label" style="color: #a16207;">Attrition Rate</div>
                    <div class="kpi-value">{att_rate:.1f}%</div>
                    <div class="kpi-sub" style="color: #a16207;">Current Rate</div>
                </div>
                <div class="kpi-card kpi-blue">
                    <div class="kpi-label" style="color: #1d4ed8;">Avg Satisfaction</div>
                    <div class="kpi-value">{avg_sat:.1f}/4</div>
                    <div class="kpi-sub" style="color: #1d4ed8;">Environment Score</div>
                </div>
                <div class="kpi-card kpi-purple">
                    <div class="kpi-label" style="color: #7e22ce;">Avg Income</div>
                    <div class="kpi-value">${avg_inc_kpi:,.0f}</div>
                    <div class="kpi-sub" style="color: #7e22ce;">Monthly Base</div>
                </div>
            </div>
            """
            st.markdown(kpi_html, unsafe_allow_html=True)
            
            # --- 2. CHARTS ---
            c1, c2 = st.columns(2)
            
            with c1:
                st.markdown("##### Attrition by Department")
                if 'Attrition' in filtered_df.columns and 'Department' in filtered_df.columns:
                    # Prepare data
                    dept_counts = filtered_df[filtered_df['Attrition'] == 'Yes']['Department'].value_counts().reset_index()
                    dept_counts.columns = ['Department', 'Count']
                    
                    if not dept_counts.empty:
                        fig_bar = px.bar(dept_counts, x='Department', y='Count', color='Count', color_continuous_scale='Reds')
                        fig_bar.update_layout(xaxis_title=None, yaxis_title=None, coloraxis_showscale=False, height=350, margin=dict(l=0,r=0,t=0,b=0), paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
                        st.plotly_chart(fig_bar, use_container_width=True)
                    else:
                        st.success("No attrition in selected group.")
                else:
                    st.warning("Missing required columns for chart.")
                    
            with c2:
                st.markdown("##### Flight Risk: Tenure vs Income")
                if 'YearsAtCompany' in filtered_df.columns and 'MonthlyIncome' in filtered_df.columns and 'Attrition' in filtered_df.columns:
                    # Simple Scatter: No bubble size, clear colors
                    # Limit points for performance if dataset large
                    scatter_data = filtered_df.sample(min(500, len(filtered_df)))
                    
                    fig_scat = px.scatter(
                        scatter_data, 
                        x="YearsAtCompany", 
                        y="MonthlyIncome", 
                        color="Attrition",
                        color_discrete_map={"Yes": "#ef4444", "No": "#10b981"},
                        opacity=0.6,
                        hover_data=["JobRole"]
                    )
                    fig_scat.update_layout(
                        xaxis_title="Tenure (Years)", 
                        yaxis_title="Monthly Income", 
                        height=350,
                        margin=dict(l=0,r=0,t=0,b=0),
                        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
                        paper_bgcolor='rgba(0,0,0,0)', 
                        plot_bgcolor='rgba(0,0,0,0)'
                    )
                    st.plotly_chart(fig_scat, use_container_width=True)
                else:
                    st.warning("Missing required columns for chart.")