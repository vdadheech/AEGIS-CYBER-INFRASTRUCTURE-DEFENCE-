import pandas as pd
import numpy as np
import logging
import joblib
from pathlib import Path
from sklearn.ensemble import IsolationForest
from typing import Optional
from backend.config import Config

# Setup logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

MODEL_PATH = Config.MODEL_PATH

class AEGISThreatModel:
    # Class-level model cache to prevent repeated disk I/O
    _cached_model: Optional[IsolationForest] = None
    _model_loaded: bool = False

    def __init__(self, contamination=0.03):
        """
        Initialize the Unsupervised Isolation Forest.
        Contamination implies we expect roughly ~3% of Nexus City traffic to be compromised.
        """
        self.model = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42
        )
        self.features = ['response_time_ms', 'system_load', 'http_response_code']

    def train(self, df: pd.DataFrame):
        """
        Trains the Isolation Forest on the baseline telemetry to map the 'normal' bounds of town activity.
        """
        logger.info("Initializing Machine Learning Core: Training Isolation Forest...")

        # Clean data for training
        X = df[self.features].copy()

        # Address any straggling NaNs inherited from previous pipeline phases
        X.fillna(X.median(), inplace=True)

        # Train
        self.model.fit(X)

        # Persist model
        Path(MODEL_PATH).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        logger.info(f"SUCCESS: AEGIS Threat Model successfully persisted at {MODEL_PATH}")

        # Update cache
        AEGISThreatModel._cached_model = self.model
        AEGISThreatModel._model_loaded = True

    @classmethod
    def preload_model(cls) -> None:
        """
        Preload the model into memory during application startup.
        This prevents blocking the event loop during inference.
        """
        if cls._model_loaded and cls._cached_model is not None:
            logger.info("✅ ML model already cached in memory")
            return

        try:
            if not Path(MODEL_PATH).exists():
                logger.warning(f"⚠️ ML model not found at {MODEL_PATH}. Will train on first use.")
                cls._model_loaded = False
                return

            cls._cached_model = joblib.load(MODEL_PATH)
            cls._model_loaded = True
            logger.info(f"✅ ML model preloaded successfully from {MODEL_PATH}")
        except (OSError, ValueError, EOFError) as e:
            logger.error(f"❌ Failed to preload ML model: {e}")
            cls._model_loaded = False

    @staticmethod
    def load_model() -> IsolationForest:
        """
        Loads the pre-trained model from cache or disk.
        Uses cached model if available to avoid blocking I/O.
        """
        # Return cached model if available
        if AEGISThreatModel._model_loaded and AEGISThreatModel._cached_model is not None:
            return AEGISThreatModel._cached_model

        # Fallback to loading from disk
        if not Path(MODEL_PATH).exists():
            raise FileNotFoundError("AEGIS Threat Model not found. Please train it first.")

        model = joblib.load(MODEL_PATH)
        # Cache for future use
        AEGISThreatModel._cached_model = model
        AEGISThreatModel._model_loaded = True
        return model

    @classmethod
    def predict_anomalies(cls, df: pd.DataFrame) -> np.ndarray:
        """
        Runs inference across a temporal slice of telemetry.
        Returns a boolean mask: True if anomaly is detected, False if healthy.
        Uses cached model for non-blocking inference.
        """
        try:
            model = cls.load_model()
        except FileNotFoundError as e:
            logger.warning(f"Model not found during inference: {e}")
            return np.zeros(len(df), dtype=bool)

        features = ['response_time_ms', 'system_load', 'http_response_code']
        X = df[features].copy()
        X.fillna(X.median(), inplace=True)

        # Isolation Forest returns -1 for outliers and 1 for inliers.
        predictions = model.predict(X)

        return predictions == -1

if __name__ == "__main__":
    # If run standalone, train the model
    ledger_in = "data/processed/master_ledger.csv"
    try:
        master_df = pd.read_csv(ledger_in)
        ai = AEGISThreatModel(contamination=0.05)
        ai.train(master_df)
    except FileNotFoundError:
        logger.error(f"Cannot train model: {ledger_in} not found. Ensure pipeline Phase 1 & 2 are complete.")
