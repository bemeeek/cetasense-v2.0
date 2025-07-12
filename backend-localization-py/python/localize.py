import pandas as pd
from functools import lru_cache
import os
import joblib
import cloudpickle # type: ignore
import logging
from typing import Dict
import importlib.util
from importlib.abc import Loader
from importlib.machinery import ModuleSpec
import runpy

logger = logging.getLogger(__name__)

@lru_cache(maxsize=8)
def load_model(path: str):
    """
    Load model dengan support:
      - .pkl            → joblib.load (fallback ke cloudpickle jika error)
      - .py             → importlib + cloudpickle.load
      - *_cloud.pkl     → forced cloudpickle.load
    """
    logger.info(f"🔍 Loading model from: {path}")
    # —— Python script ——  
    if path.endswith(".py"):
        module_name = os.path.splitext(os.path.basename(path))[0]
        spec = importlib.util.spec_from_file_location(module_name, path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Cannot load Python module from {path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        if hasattr(module, "model"):
            return module.model
        if hasattr(module, "get_model"):
            return module.get_model()
        raise ImportError(f"No `model` or `get_model()` in {path}")

    # —— Pickle via cloudpickle ——  
    if path.endswith("_cloud.pkl"):
        with open(path, "rb") as f:
            return cloudpickle.load(f)

    # —— Standard .pkl ——  
    if path.endswith(".pkl"):
        try:
            return joblib.load(path)
        except Exception as ex:
            logger.warning(f"⚠️ joblib.load failed for {path}: {ex}, trying cloudpickle")
            with open(path, "rb") as f:
                return cloudpickle.load(f)

    # —— Fallback umum ——  
    try:
        return joblib.load(path)
    except Exception as ex:
        logger.warning(f"⚠️ joblib fallback failed for {path}: {ex}, trying cloudpickle")
        with open(path, "rb") as f:
            return cloudpickle.load(f)


def run_localization(data_path: str, model_path: str) -> Dict[str, float]:
    """
    Run localization dengan support file model:
      .pkl, *_cloud.pkl, atau .py
    """
    logger.info(f"🚀 Starting localization with data: {data_path}, model: {model_path}")
    df = pd.read_csv(data_path)
    arr = df.values
    T = arr.shape[0]
    H_series = arr.reshape(T, 3, 30).transpose(1, 2, 0)
    model = load_model(model_path)
    x, y = model.predict(H_series)
    return {"x": float(x), "y": float(y)}


def test_model_loading(model_path: str) -> bool:
    """Test apakah model (.pkl, .py) bisa di-load dengan benar."""
    try:
        m = load_model(model_path)
        logger.info(f"✅ Model loaded: {type(m).__name__}")
        if hasattr(m, "predict"):
            logger.info("✅ Model has predict()")
        else:
            logger.warning("⚠️ Model missing predict()")
        return True
    except Exception as e:
        logger.error(f"❌ Model test failed: {e}")
        return False


def clear_model_cache():
    """Clear cache load_model."""
    load_model.cache_clear()
    logger.info("🧹 Model cache cleared")