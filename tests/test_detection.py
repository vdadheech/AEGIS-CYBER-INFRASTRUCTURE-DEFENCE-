import pandas as pd
from backend.engine.detection import detect_spoofing, detect_ddos, detect_malware

def test_detect_spoofing():
    # Mock: One normal, one spoofed, one honest error
    mock_data = pd.DataFrame({
        'json_status': ['OPERATIONAL', 'OPERATIONAL', 'ERROR'],
        'http_response_code': [200, 503, 500]
    })
    
    result = detect_spoofing(mock_data)
    
    assert result.loc[0, 'flag_spoofed'] == False, "Flagged a healthy node"
    assert result.loc[1, 'flag_spoofed'] == True, "Failed to catch the spoofed 503 status"
    assert result.loc[2, 'flag_spoofed'] == False, "Flagged an honest error as spoofing"
    print("✅ Spoofing Detection Test Passed.")

def test_detect_ddos():
    # Mock: Node 99 gets hit 10 times. Nodes 1, 2, 3, 4, and 5 get hit once.
    # This brings the normal median down to 1.
    mock_data = pd.DataFrame({
        'node_id': [99]*10 + [1, 2, 3, 4, 5]
    })
    
    # Set threshold low for the test
    result = detect_ddos(mock_data, threshold_multiplier=2.0)
    
    assert result[result['node_id'] == 99]['flag_ddos'].all() == True, "Failed to flag DDoS spike"
    assert result[result['node_id'] == 1]['flag_ddos'].all() == False, "Falsely flagged normal traffic"
    print("✅ DDoS Detection Test Passed.")

def test_detect_malware():
    # Mock: Normal response times vs one massive latency spike
    mock_data = pd.DataFrame({
        'response_time_ms': [100, 105, 110, 5000]
    })
    
    result = detect_malware(mock_data)
    
    assert result.loc[0, 'flag_malware'] == False, "Flagged normal latency"
    assert result.loc[3, 'flag_malware'] == True, "Failed to catch malware latency spike"
    print("✅ Malware Latency Test Passed.")