import pandas as pd
import logging
from pathlib import Path

# Set up professional logging to track our data pipeline
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def clean_system_logs(df: pd.DataFrame) -> pd.DataFrame:
    initial_rows = len(df)
    
    required_columns = ['log_id', 'node_id', 'http_response_code']
    missing_cols = [col for col in required_columns if col not in df.columns]
    if missing_cols:
        raise ValueError(f"CRITICAL ERROR: System logs are missing essential columns: {missing_cols}")

    for col in required_columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    df = df.dropna(subset=required_columns)

    df['log_id'] = df['log_id'].astype(int)
    df['node_id'] = df['node_id'].astype(int)
    df['http_response_code'] = df['http_response_code'].astype(int)

    df = df.sort_values(by='log_id', ascending=True)

    # Deduplication with warning
    duplicates = df.duplicated(subset=['log_id']).sum()
    if duplicates > 0:
        logger.warning(f"Dropped {duplicates} duplicate log entries.")
        
    df = df.drop_duplicates(subset=['log_id'], keep='first')
    df = df.reset_index(drop=True)

    final_rows = len(df)
    fatal_errors = initial_rows - final_rows - duplicates
    logger.info(f"System Logs cleaned: Processed {initial_rows} rows. Dropped {fatal_errors} corrupted rows and {duplicates} duplicates. Final count: {final_rows}.")
    
    return df

def load_all_data(data_dir: str = "data") -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    base_path = Path(data_dir)
    logs_path = base_path / "system_logs.csv"
    registry_path = base_path / "node_registry.csv"
    schema_path = base_path / "schema_config.csv"

    for path in [logs_path, registry_path, schema_path]:
        if not path.exists():
            raise FileNotFoundError(f"PIPELINE HALTED: Could not find required intelligence asset at {path.absolute()}")

    logger.info("Ingesting raw CSV files...")
    try:
        raw_logs = pd.read_csv(logs_path)
        registry = pd.read_csv(registry_path)
        schemas = pd.read_csv(schema_path)
    except Exception as e:
        raise RuntimeError(f"Failed to read CSV files. Error: {str(e)}")

    clean_logs = clean_system_logs(raw_logs)
    return clean_logs, registry, schemas

if __name__ == "__main__":
    try:
        # 1. Run the pipeline (loads all 3, cleans the logs)
        logs, nodes, schema = load_all_data(data_dir="data")
        
        # 2. Create a folder for the clean data
        processed_dir = Path("data/processed")
        processed_dir.mkdir(parents=True, exist_ok=True)
        
        # 3. Export ALL artifacts so Phase 2 has everything in one place
        logs.to_csv(processed_dir / "clean_system_logs.csv", index=False)
        nodes.to_csv(processed_dir / "validated_node_registry.csv", index=False)
        schema.to_csv(processed_dir / "validated_schema_config.csv", index=False)
        
        logger.info("SUCCESS: All datasets exported to data/processed/")
        print("\n✅ Phase 1 Complete. All 3 Artifacts generated.")
        
    except Exception as e:
        logger.error(str(e))