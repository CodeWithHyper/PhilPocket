from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
CORS(app)

DATA_FILE = 'ph_healthcare_data.csv'

@app.route('/api/stats')
def get_dashboard_data():
    try:
        # Load the Data
        df = pd.read_csv(DATA_FILE)

        raw_data = df.to_dict(orient='records')
        
        return jsonify(raw_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)