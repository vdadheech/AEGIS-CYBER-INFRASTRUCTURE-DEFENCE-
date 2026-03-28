import pandas as pd
from backend.engine.normalization import decode_node_registry, collapse_schema

def test_decode_node_registry():
    # 1. Mock Data: One valid Base64 string, one broken one
    # U04tOTI4MA== decodes to "SN-9280"
    mock_data = pd.DataFrame({
        'node_uuid': [0, 1],
        'user_agent': ['AEGIS-Node/2.0 (Linux) U04tOTI4MA==', 'AEGIS-Node/2.0 (Linux) INVALID_BASE64!']
    })
    
    # 2. Run Decoder
    decoded_df = decode_node_registry(mock_data)
    
    # 3. Assertions
    assert 'hardware_serial' in decoded_df.columns, "Failed to create hardware_serial column"
    assert 'user_agent' not in decoded_df.columns, "Failed to drop old user_agent column"
    assert decoded_df.loc[0, 'hardware_serial'] == 'SN-9280', "Base64 string was not decoded correctly"
    assert decoded_df.loc[1, 'hardware_serial'] == 'UNKNOWN_NODE', "Failed to handle corrupted Base64 strings safely"
    print("✅ Base64 Decoder Tests Passed.")

def test_collapse_schema():
    # 1. Mock Data: Simulating the rotating schema
    mock_data = pd.DataFrame({
        'log_id': [1, 2, 3],
        'load_val': [0.85, pd.NA, pd.NA],
        'L_V1': [pd.NA, 0.92, pd.NA]
    })
    
    # 2. Run Collapser
    collapsed_df = collapse_schema(mock_data)
    
    # 3. Assertions
    assert 'system_load' in collapsed_df.columns, "Canonical column 'system_load' not created"
    assert 'load_val' not in collapsed_df.columns, "Old schema column 'load_val' not dropped"
    assert collapsed_df.loc[0, 'system_load'] == 0.85, "Failed to capture data from load_val"
    assert collapsed_df.loc[1, 'system_load'] == 0.92, "Failed to capture data from L_V1"
    assert pd.isna(collapsed_df.loc[2, 'system_load']), "Failed to handle completely null rows properly"
    print("✅ Schema Collapser Tests Passed.")