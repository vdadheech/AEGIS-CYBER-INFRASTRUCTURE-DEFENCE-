import pandas as pd
import numpy as np
import logging
import joblib
from pathlib import Path
from sklearn.ensemble import IsolationForest

# Setup logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

MODEL_PATH = "data/processed/isolation_forest.joblib"

class AEGISThreatModel:
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

    @staticmethod
    def load_model():
        """Loads the pre-trained model from disk."""
        if not Path(MODEL_PATH).exists():
            raise FileNotFoundError("AEGIS Threat Model not found. Please train it first.")
        return joblib.load(MODEL_PATH)

    @classmethod
    def predict_anomalies(cls, df: pd.DataFrame) -> np.ndarray:
        """
        Runs inference across a temporal slice of telemetry.
        Returns a boolean mask: True if anomaly is detected, False if healthy.
        """
        model = cls.load_model()
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
