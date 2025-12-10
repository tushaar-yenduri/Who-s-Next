import streamlit as st
import pandas as pd
import joblib
import numpy as np
from pathlib import Path
import io

# ---- Paths ----
BASE_DIR = Path(__file__).parent
BACKEND = BASE_DIR / "backend"
FEATURES_PATH = BACKEND / "model_feature_columns.joblib"
MODEL_PATHS = {
    "GradientBoosting": BACKEND / "model_gb_best.joblib",
    "RandomForest": BACKEND / "model_rf_best.joblib",
    "LogisticRegression": BACKEND / "model_logreg_best.joblib",
}
SAMPLE_CSV = BACKEND / "WA_Fn-UseC_-HR-Employee-Attrition.csv"

# ---- Helpers ----
@st.cache_resource
def load_feature_columns(path):
    return joblib.load(path)

@st.cache_resource
def load_models(paths: dict):
    models = {}
    for name, p in paths.items():
        if p.exists():
            models[name] = joblib.load(p)
    return models

def prepare_input_df(raw_df: pd.DataFrame, feature_cols: list) -> pd.DataFrame:
    """
    Turn raw_df (with raw categorical columns) into the one-hot-encoded DataFrame
    aligned to feature_cols (filling missing cols with 0).
    """
    # simple one-hot encoding for object / category dtype
    df_encoded = pd.get_dummies(raw_df)
    # ensure all columns exist in final df
    final = pd.DataFrame(0, index=range(len(df_encoded)), columns=feature_cols)
    # for overlapping columns, copy values
    intersection = [c for c in df_encoded.columns if c in final.columns]
    final[intersection] = df_encoded[intersection].values
    return final

def infer_column_types_from_sample(sample_df: pd.DataFrame, feature_list: list):
    """
    Return dict of inferred types for features present in sample_df:
    'numeric' or 'categorical'
    """
    types = {}
    for col in feature_list:
        if col in sample_df.columns:
            if pd.api.types.is_numeric_dtype(sample_df[col]):
                types[col] = "numeric"
            else:
                types[col] = "categorical"
        else:
            # if not in sample, assume numeric by default
            types[col] = "numeric"
    return types

def build_single_input_form(raw_feature_names: list, sample_df: pd.DataFrame):
    """
    Build a form in Streamlit dynamically for raw features (not post-one-hot columns).
    raw_feature_names should be names before get_dummies (i.e., columns present in sample CSV).
    Returns a single-row DataFrame with the inputs.
    """
    st.write("### Enter input values")
    inputs = {}
    for col in raw_feature_names:
        if pd.api.types.is_numeric_dtype(sample_df[col]):
            default = float(sample_df[col].median()) if not sample_df[col].isnull().all() else 0.0
            val = st.number_input(label=col, value=float(default))
            inputs[col] = val
        else:
            # categorical
            unique_vals = sample_df[col].dropna().unique().tolist()
            if len(unique_vals) == 0:
                # fallback
                unique_vals = ["Yes", "No"]
            val = st.selectbox(label=col, options=unique_vals)
            inputs[col] = val
    return pd.DataFrame([inputs])

# ---- Load resources ----
st.set_page_config(page_title="Employee Termination Risk", layout="wide")
st.title("Employee Termination Risk — Streamlit UI")
st.caption("Single-sample and batch predictions (auto one-hot + reindexing to saved feature columns).")

try:
    feature_cols = load_feature_columns(FEATURES_PATH)
except Exception as e:
    st.error(f"Could not load feature columns from {FEATURES_PATH}. Error: {e}")
    st.stop()

models = load_models(MODEL_PATHS)
if not models:
    st.warning("No models loaded. Check your backend model files.")
    # but continue to let user inspect feature columns

# Load sample CSV (if exists) to use for defaults / infer raw columns
sample_df = None
if SAMPLE_CSV.exists():
    try:
        sample_df = pd.read_csv(SAMPLE_CSV)
    except Exception as e:
        st.warning(f"Could not load sample CSV: {e}")

# ---- Sidebar controls ----
st.sidebar.header("Prediction settings")
model_choice = st.sidebar.selectbox("Choose model", options=list(models.keys()) if models else ["No model"])
input_mode = st.sidebar.radio("Input mode", ("Single input", "Batch CSV upload"))

# ---- Main UI ----
if input_mode == "Single input":
    if sample_df is None:
        st.info("No sample CSV found in backend. You must upload a CSV or provide raw features manually.")
        # allow user to paste a comma-separated list of features (rare)
        raw_cols_txt = st.text_input("If you know the raw feature column names, paste comma-separated list here (optional):")
        if raw_cols_txt:
            raw_feature_names = [c.strip() for c in raw_cols_txt.split(",")]
            # create an empty sample_df with these columns (all strings)
            sample_df = pd.DataFrame(columns=raw_feature_names)
    else:
        # Use columns from sample CSV as raw inputs
        raw_feature_names = sample_df.columns.tolist()

    if sample_df is not None and len(raw_feature_names) > 0:
        input_df_raw = build_single_input_form(raw_feature_names, sample_df)
        if st.button("Predict"):
            # preprocess -> one-hot -> reindex
            final_df = prepare_input_df(input_df_raw, feature_cols)
            if model_choice not in models:
                st.error("Selected model not loaded.")
            else:
                model = models[model_choice]
                try:
                    proba = model.predict_proba(final_df) if hasattr(model, "predict_proba") else None
                    pred = model.predict(final_df)
                except Exception as e:
                    st.error(f"Prediction failed. This can happen if preprocessing assumptions differ from training. Error: {e}")
                else:
                    out = st.container()
                    out.subheader("Prediction result")
                    col1, col2 = out.columns(2)
                    col1.metric("Predicted class", str(pred[0]))
                    if proba is not None:
                        # if binary, show probability for positive class
                        if proba.shape[1] == 2:
                            col2.metric("Probability (positive class)", f"{proba[0,1]:.4f}")
                        else:
                            # show full probabilities top 3
                            probs = proba[0]
                            top_idx = np.argsort(probs)[::-1][:3]
                            for i in top_idx:
                                out.write(f"Class {i}: {probs[i]:.4f}")
                    st.write("### Raw input (you entered)")
                    st.dataframe(input_df_raw.T)
                    st.write("### Model-ready features (after get_dummies + reindex)")
                    st.dataframe(final_df.T)
    else:
        st.error("No feature information present to build the form. Upload a sample CSV or provide column names.")

else:  # Batch mode
    st.write("### Upload CSV for batch predictions")
    uploaded = st.file_uploader("Upload CSV file (raw features similar to training CSV)", type=["csv"])
    if uploaded is not None:
        try:
            batch_raw = pd.read_csv(uploaded)
        except Exception as e:
            st.error(f"Failed to read CSV: {e}")
        else:
            st.write("Preview of uploaded data (first 5 rows):")
            st.dataframe(batch_raw.head())
            if st.button("Run batch prediction"):
                final_batch = prepare_input_df(batch_raw, feature_cols)
                if model_choice not in models:
                    st.error("Selected model not loaded.")
                else:
                    model = models[model_choice]
                    try:
                        preds = model.predict(final_batch)
                        probs = model.predict_proba(final_batch) if hasattr(model, "predict_proba") else None
                    except Exception as e:
                        st.error(f"Prediction failed: {e}")
                    else:
                        results = batch_raw.copy()
                        results["predicted_class"] = preds
                        if probs is not None:
                            if probs.shape[1] == 2:
                                results["prob_positive"] = probs[:, 1]
                            else:
                                # store top probability
                                results["top_prob"] = probs.max(axis=1)
                        st.write("### Predictions (first 20 rows)")
                        st.dataframe(results.head(20))
                        # allow download
                        csv_bytes = results.to_csv(index=False).encode("utf-8")
                        st.download_button("Download predictions CSV", data=csv_bytes, file_name="predictions.csv", mime="text/csv")

# ---- Footer: show loaded models and feature column count ----
st.sidebar.write("---")
st.sidebar.write(f"Loaded feature columns: {len(feature_cols)}")
if models:
    st.sidebar.write("Loaded models:")
    for k in models:
        st.sidebar.write(f"- {k}")
else:
    st.sidebar.warning("No models loaded. Place your model joblib files in backend/ and restart.")
