import pandas as pd
import base64
import logging
import re
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def decode_node_registry(registry_df: pd.DataFrame) -> pd.DataFrame:
    """
    Extracts and Base64-decodes the hidden hardware serial numbers from the user_agent column.
    """
    df = registry_df.copy()
    
    def extract_and_decode(agent_string):
        try:
            # The Base64 string is always at the end after a space. 
            # Regex to grab the last word made of Base64 characters
            match = re.search(r'\s([A-Za-z0-9+/=]+)$', str(agent_string))
            if match:
                encoded_str = match.group(1)
                decoded_bytes = base64.b64decode(encoded_str)
                return decoded_bytes.decode('utf-8')
            return "UNKNOWN_NODE"
        except Exception:
            return "DECODE_ERROR"

    # Apply the decoder to create the true identity column
    df['hardware_serial'] = df['user_agent'].apply(extract_and_decode)
    
    # Drop the now-useless deceptive user_agent column
    df = df.drop(columns=['user_agent'])
    
    logger.info("Node Registry decoded: Base64 hardware serials extracted successfully.")
    return df

def collapse_schema(logs_df: pd.DataFrame, schema_df: pd.DataFrame) -> pd.DataFrame:
    """
    Dynamically maps the schema keys based on the 10-minute rotation config.
    """
    df = logs_df.copy()
    
    # Sort schema so we process chronologically
    schema_df = schema_df.sort_values(by='time_start')
    
    # Initialize canonical column
    df['system_load'] = None
    
    # Process each schema window based on log_id rotation timestamp
    for i in range(len(schema_df)):
        current = schema_df.iloc[i]
        start_log = current['time_start']
        active_col = current['active_column']
        
        if i + 1 < len(schema_df):
            end_log = schema_df.iloc[i+1]['time_start']
            mask = (df['log_id'] >= start_log) & (df['log_id'] < end_log)
        else:
            mask = df['log_id'] >= start_log
            
        if active_col in df.columns:
            df.loc[mask, 'system_load'] = df.loc[mask, active_col]
        else:
            logger.warning(f"Schema conflict: Expected column '{active_col}' not found.")
            
    # Drop the old fragmented columns mathematically defined in the schema
    cols_to_drop = [c for c in schema_df['active_column'].unique() if c in df.columns]
    df = df.drop(columns=cols_to_drop)
    
    logger.info("Schema Normalized: Temporal rotation paths successfully collapsed into 'system_load'.")
    return df

def build_master_ledger(clean_logs_path: str, validated_registry_path: str, validated_schema_path: str, output_path: str):
    """
    The orchestrator for Phase 2. Loads the clean data, applies translations, 
    and merges them into a single Master Ledger for Phase 3 threat detection.
    """
    try:
        # 1. Load the PROCESSED artifacts
        logs_df = pd.read_csv(clean_logs_path)
        registry_df = pd.read_csv(validated_registry_path)
        schema_df = pd.read_csv(validated_schema_path)
        
        # 2. Translate and Normalize
        decoded_registry = decode_node_registry(registry_df)
        normalized_logs = collapse_schema(logs_df, schema_df)
        
        # 3. The Grand Merge: Join logs to physical nodes using a Left Join
        master_ledger = pd.merge(
            normalized_logs, 
            decoded_registry, 
            left_on='node_id', 
            right_on='node_uuid', 
            how='left'
        )
        
        # 4. Clean up redundant columns after merge
        if 'node_uuid' in master_ledger.columns:
            master_ledger = master_ledger.drop(columns=['node_uuid'])
        
        # 5. Export Artifact
        master_ledger.to_csv(output_path, index=False)
        logger.info(f"SUCCESS: Phase 2 Master Ledger generated at {output_path}")
        
        return master_ledger

    except Exception as e:
        logger.error(f"Phase 2 Failed: {str(e)}")
        raise

if __name__ == "__main__":
    # STRICTLY USING PROCESSED ARTIFACTS ONLY
    logs_in = "data/processed/clean_system_logs.csv"
    registry_in = "data/processed/validated_node_registry.csv" 
    schema_in = "data/processed/validated_schema_config.csv"
    ledger_out = "data/processed/master_ledger.csv"
    
    build_master_ledger(logs_in, registry_in, schema_in, ledger_out)
    print("\n✅ Phase 2 Translation Complete. The Master Ledger is ready for Threat Detection.")