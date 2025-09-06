import pandas as pd
from functools import lru_cache
import os
import joblib
import cloudpickle 
import logging
from typing import Dict
import importlib.util

logger = logging.getLogger(__name__)

@lru_cache(maxsize=8)
def load_model(path: str):
    logger.info(f"🔍 Loading model from: {path}")
    if path.endswith(".py"):
        module_name = os.path.splitext(os.path.basename(path))[0]
        spec = importlib.util.spec_from_file_location(module_name, path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Cannot load Python module from {path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)  # type: ignore[attr-defined]
        if hasattr(module, "model"):
            return module.model
        if hasattr(module, "get_model"):
            return module.get_model()
        raise ImportError(f"No `model` or `get_model()` in {path}")

    if path.endswith("_cloud.pkl"):
        with open(path, "rb") as f:
            return cloudpickle.load(f)

    if path.endswith(".pkl"):
        try:
            return joblib.load(path)
        except Exception as ex:
            logger.warning(f"⚠️ joblib.load failed: {ex}, trying cloudpickle")
            with open(path, "rb") as f:
                return cloudpickle.load(f)

    try:
        return joblib.load(path)
    except Exception as ex:
        logger.warning(f"⚠️ joblib fallback failed: {ex}, trying cloudpickle")
        with open(path, "rb") as f:
            return cloudpickle.load(f)

def _pick_single_row(df: pd.DataFrame) -> pd.Series:
    if len(df) == 0:
        raise ValueError("Model tidak mengembalikan baris apa pun.")
    if len(df) == 1:
        return df.iloc[0]
    if "avg_neighbor_dist" in df.columns:
        s = pd.to_numeric(df["avg_neighbor_dist"], errors="coerce")
        return df.loc[int(s.idxmin())]  # type: ignore
    if "confidence" in df.columns:
        s = pd.to_numeric(df["confidence"], errors="coerce")
        return df.loc[int(s.idxmax())]  # type: ignore
    return df.iloc[0]

def run_localization(data_path: str, model_path: str) -> Dict[str, float]:
    """
    CSV fingerprint → model.predict_from_file(...) → {"x": float, "y": float}
    CSV WAJIB punya kolom: sample_id, anchor_id, rssi
    """
    logger.info(f"🚀 Starting localization with data: {data_path}, model: {model_path}")

    # Validasi CSV fingerprint
    df = pd.read_csv(data_path)
    need = {"sample_id", "anchor_id", "rssi"}
    if not need.issubset(df.columns):
        raise ValueError(f"CSV kurang kolom: {need - set(df.columns)}. Harus ada {need}")

    model = load_model(model_path)
    if not hasattr(model, "predict_from_file"):
        raise AttributeError("Model tidak punya predict_from_file(...). Pakai model fingerprint notebook-style.")
    
    try:
        out = model.predict_from_file(
            meas_csv_path=data_path,
            k=None,
            aggregate="auto",
            aggregate_fn="mean",
            out_csv_path=None
        )
    except TypeError as e:
        msg = str(e)
        if "unexpected keyword argument" in msg and "'k'" in msg:
            out = model.predict_from_file(
                meas_csv_path=data_path,
                aggregate="auto",
                aggregate_fn="mean",
                out_csv_path=None
            )
        else:
            raise


    if not {"est_x", "est_y"}.issubset(out.columns):
        raise ValueError("Output model tidak memiliki kolom est_x dan est_y.")

    row = _pick_single_row(out)
    x = float(row["est_x"])
    y = float(row["est_y"])
    return {"x": x, "y": y}

def test_model_loading(model_path: str) -> bool:
    try:
        m = load_model(model_path)
        logger.info(f"✅ Model loaded: {type(m).__name__}")
        if hasattr(m, "predict_from_file"):
            logger.info("✅ Model has predict_from_file()")
        else:
            logger.warning("⚠️ Model missing predict_from_file()")
        return True
    except Exception as e:
        logger.error(f"❌ Model test failed: {e}")
        return False

def clear_model_cache():
    load_model.cache_clear()
    logger.info("🧹 Model cache cleared")