from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

DATA_FILE = 'ph_healthcare_data.csv'

# Cache for storing loaded data
_cache = {
    'data': None,
    'last_modified': None
}

def get_cached_data():
    """Load data from CSV with caching based on file modification time."""
    current_mtime = os.path.getmtime(DATA_FILE)
    
    # Return cached data if file hasn't changed
    if _cache['data'] is not None and _cache['last_modified'] == current_mtime:
        return _cache['data']
    
    # Load and cache new data
    df = pd.read_csv(DATA_FILE)
    raw_data = df.to_dict(orient='records')
    
    _cache['data'] = raw_data
    _cache['last_modified'] = current_mtime
    
    return raw_data

@app.route('/api/stats')
def get_dashboard_data():
    try:
        raw_data = get_cached_data()
        return jsonify(raw_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)