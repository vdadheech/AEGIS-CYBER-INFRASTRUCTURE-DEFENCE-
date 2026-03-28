import pandas as pd
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def detect_spoofing(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detects deception: JSON claims 'OPERATIONAL' but HTTP protocol reveals an error (400+).
    """
    # Create a boolean flag column: True if spoofed, False if normal
    df['flag_spoofed'] = (df['json_status'] == 'OPERATIONAL') & (df['http_response_code'] >= 400)
    
    spoofed_count = df['flag_spoofed'].sum()
    logger.info(f"Spoofing Detection: Found {spoofed_count} deceptive logs (JSON Operational but HTTP Error).")
    return df

def detect_ddos(df: pd.DataFrame, threshold_multiplier: float = 3.0) -> pd.DataFrame:
    """
    Detects DDoS attacks by finding nodes with unnaturally high request volumes.
    """
    # Count how many times each node appears in the logs
    request_counts = df['node_id'].value_counts()
    
    # Define an anomaly threshold (e.g., > 3x the median traffic)
    median_requests = request_counts.median()
    ddos_threshold = median_requests * threshold_multiplier
    
    # Find nodes that exceed the threshold
    ddos_nodes = request_counts[request_counts > ddos_threshold].index
    
    # Flag any log belonging to a DDoS'd node
    df['flag_ddos'] = df['node_id'].isin(ddos_nodes)
    
    logger.info(f"DDoS Detection: Flagged {len(ddos_nodes)} nodes experiencing unnatural traffic spikes.")
    return df

from backend.engine.threat_model import AEGISThreatModel

def detect_malware(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detects Sleeper Malware anomalies using an Unsupervised Machine Learning Model (Isolation Forest).
    Falls back to static heuristic latency degradation if the model matrix is missing.
    """
    try:
        # Run ML Inference to detect multi-variate anomalies natively
        logger.info("Engaging Machine Learning Core for inference...")
        anomalies = AEGISThreatModel.predict_anomalies(df)
        df['flag_malware'] = anomalies
    except FileNotFoundError:
        logger.warning("ML Model matrix missing. Falling back to static heuristic rule.")
        median_time = df['response_time_ms'].median()
        malware_threshold = median_time * 3 
        df['flag_malware'] = df['response_time_ms'] > malware_threshold
    
    malware_count = df['flag_malware'].sum()
    logger.info(f"Sleeper Malware ML Engine: ML flagged {malware_count} anomalous logs.")
    return df

def run_threat_detection(ledger_path: str, output_path: str):
    """
    The orchestrator for Phase 3. Runs all detection modules and calculates a threat score.
    """
    try:
        df = pd.read_csv(ledger_path)
        
        # Run the gauntlet
        df = detect_spoofing(df)
        df = detect_ddos(df)
        df = detect_malware(df)
        
        # Calculate a combined Threat Score (0 to 3) for easy Dashboard visualization later
        df['threat_score'] = df[['flag_spoofed', 'flag_ddos', 'flag_malware']].sum(axis=1)
        
        df.to_csv(output_path, index=False)
        logger.info(f"SUCCESS: Threat Analysis complete. Analyzed ledger saved to {output_path}")
        return df
        
    except Exception as e:
        logger.error(f"Threat Detection Failed: {str(e)}")
        raise

if __name__ == "__main__":
    ledger_in = "data/processed/master_ledger.csv"
    analyzed_out = "data/processed/analyzed_ledger.csv"
    
    run_threat_detection(ledger_in, analyzed_out)
    print("\n✅ Phase 3 Threat Detection Complete. The system has identified the Shadow Controller's anomalies.")