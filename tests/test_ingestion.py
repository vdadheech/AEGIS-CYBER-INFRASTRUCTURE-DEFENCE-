import pandas as pd
import pytest
from backend.engine.ingestion import clean_system_logs

def test_clean_system_logs():
    # 1. Create a "Shadow Controller" corrupted mock dataset
    mock_data = {
        'log_id': [2, 1, 1, 3, "garbage_text", 4],  # Unsorted, duplicates, and text corruption
        'node_id': [100, 101, 101, None, 103, 104], # Missing node_id (None/NaN)
        'http_response_code': [200, 200, 200, 500, 404, 200],
        'json_status': ['OPERATIONAL'] * 6,
        'load_val': [0.85, 0.45, 0.45, 0.99, 0.12, pd.NA], # Sparse column 1
        'L_V1': [pd.NA, pd.NA, pd.NA, pd.NA, pd.NA, 0.77]  # Sparse column 2 (Active later)
    }
    
    raw_df = pd.DataFrame(mock_data)
    
    # 2. Run the ingestion engine
    clean_df = clean_system_logs(raw_df)
    
    # 3. Assertions (The Mathematical Proofs)
    
    # PROOF 1: Length check. Started with 6 rows. 
    # - Row index 2 (duplicate log_id 1) should be dropped.
    # - Row index 3 (missing node_id) should be dropped.
    # - Row index 4 (garbage_text log_id) should be dropped.
    # Expected final rows: 3
    assert len(clean_df) == 3, f"Expected 3 rows, got {len(clean_df)}"
    
    # PROOF 2: Sequence Standardization. Are they perfectly sorted?
    assert clean_df['log_id'].iloc[0] == 1, "First log_id should be 1"
    assert clean_df['log_id'].iloc[1] == 2, "Second log_id should be 2"
    assert clean_df['log_id'].iloc[2] == 4, "Third log_id should be 4"
    
    # PROOF 3: Sparse Schema Preservation. 
    # Did log_id 4 survive even though it has NaN in load_val?
    assert pd.isna(clean_df.loc[clean_df['log_id'] == 4, 'load_val'].values[0]), "Sparse schema was incorrectly deleted"
    assert clean_df.loc[clean_df['log_id'] == 4, 'L_V1'].values[0] == 0.77, "Sparse schema data was lost"

    # PROOF 4: Type Integrity
    assert pd.api.types.is_integer_dtype(clean_df['log_id']), "log_id failed to cast to strict integer"
    assert pd.api.types.is_integer_dtype(clean_df['node_id']), "node_id failed to cast to strict integer"

    print("✅ All ingestion engine tests passed.")