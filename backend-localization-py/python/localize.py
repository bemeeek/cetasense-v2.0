import pandas as pd
from functools import lru_cache
import os
import joblib
import cloudpickle
import logging
from typing import Dict

logger = logging.getLogger(__name__)

@lru_cache(maxsize=8)
def load_model(path: str):
    """Load model dengan support cloudpickle dan joblib"""
    try:
        logger.info(f"🔍 Loading model from: {path}")
        
        # Deteksi secara sederhana: nama file bundling cloudpickle pakai suffix '_cloud.pkl'
        if path.endswith("_cloud.pkl"):
            logger.info(f"📦 Using cloudpickle for: {path}")
            with open(path, "rb") as f:
                model = cloudpickle.load(f)
        else:
            logger.info(f"📦 Using joblib for: {path}")
            model = joblib.load(path)
        
        logger.info(f"✅ Model loaded successfully from: {path}")
        logger.info(f"📋 Model type: {type(model).__name__}")
        
        return model
        
    except Exception as e:
        logger.error(f"❌ Error loading model from {path}: {e}")
        raise ImportError(f"Cannot load model from {path}: {e}")

def run_localization(data_path: str, model_path: str) -> Dict[str, float]:
    """
    Run localization dengan support cloudpickle dan joblib
    
    Args:
        data_path: Path ke file CSV data
        model_path: Path ke file model (.pkl atau _cloud.pkl)
    
    Returns:
        Dict dengan keys 'x' dan 'y'
    """
    try:
        logger.info(f"🚀 Starting localization with data: {data_path}, model: {model_path}")
        
        # Baca CSV
        logger.info(f"📊 Reading CSV data from: {data_path}")
        df = pd.read_csv(data_path)
        data = df.values
        T = data.shape[0]
        H_series = data.reshape(T, 3, 30).transpose(1, 2, 0)
        logger.info(f"📈 Data shape: {H_series.shape} (T={T})")

        # Ambil (atau load & cache) model
        model = load_model(model_path)

        # Predict—return x,y
        logger.info("🔮 Running prediction...")
        x, y = model.predict(H_series)
        
        result = {"x": float(x), "y": float(y)}
        logger.info(f"✅ Localization completed: {result}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Localization failed: {e}")
        logger.error(f"📍 Data path: {data_path}")
        logger.error(f"🤖 Model path: {model_path}")
        raise RuntimeError(f"Localization failed: {e}")

# Tambahan: Function untuk test model loading
def test_model_loading(model_path: str) -> bool:
    """Test apakah model bisa di-load dengan benar"""
    try:
        model = load_model(model_path)
        logger.info(f"✅ Model test successful: {type(model).__name__}")
        
        # Test apakah model punya method predict
        if hasattr(model, 'predict'):
            logger.info("✅ Model has predict method")
        else:
            logger.warning("⚠️  Model doesn't have predict method")
            
        return True
    except Exception as e:
        logger.error(f"❌ Model test failed: {e}")
        return False

# Tambahan: Function untuk clear cache jika diperlukan
def clear_model_cache():
    """Clear model cache"""
    load_model.cache_clear()
    logger.info("🧹 Model cache cleared")
