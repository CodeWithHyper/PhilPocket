# PhilPocket: Out-of-Pocket Expenditure Analyzer

## Project Overview
PhilPocket is a comprehensive health informatics dashboard designed to visualize Out-of-Pocket (OOP) healthcare expenditure in the Philippine setting. This project integrates **real government statistics** from PhilHealth, PSA, World Bank, WHO GHED, and calibrated simulated patient transactions based on validated case rates.

Developed by David Erwin Valdepeña (3rd Year BSIT) as part of IT Professional Elective 3.

## Key Features
✅ **WHO GHED Dataset** - Real internet data (150x5 CSV) for macro-level OOP analysis  
✅ **Real Disease Distribution** - Based on PSA 2025 mortality statistics  
✅ **Authentic Hospital Data** - PhilHealth-accredited facilities  
✅ **Historical Trends** - World Bank OOP expenditure data (1999-2022)  
✅ **Calibrated Simulations** - 300 patient records matched to WHO GHED targets  
✅ **Insurance Logic** - Accurate PhilHealth 2024 case rates  
✅ **Interactive Visualizations** - Chart.js dashboards with filters  
✅ **Economic Context** - PSA health inflation metrics (4.8%)

## Objectives
- **Visualize Financial Gaps:** Show the discrepancy between total bills and insurance coverage
- **Identify High-Risk Patients:** Flag excessive OOP expenditures indicating catastrophic health costs
- **Compare Insurance Performance:** Analyze PhilHealth vs. HMO coverage effectiveness
- **Analyze Service Costs:** Determine which services contribute most to patient financial burden
- **Track Historical Trends:** Monitor Philippines' OOP expenditure over time
- **Display Real Indicators:** Present WHO GHED and government statistics

## Data Architecture

### PRIMARY: WHO GHED Dataset (Real Internet Data) ⭐
- **File:** `docs/ghed_tidy.csv`
- **Size:** 5 columns × 193 rows (meets "150x5" requirement)
- **Source:** WHO Global Health Expenditure Database Export
- **URL:** https://apps.who.int/nha/database
- **Metrics:** Out-of-pocket expenditure as % of current health expenditure
- **Use:** Interactive country/metric filters and trend charts

### Real Government Data Sources:
1. **PhilHealth Statistics 2023**
   - Official membership data and benefit packages
   - Case rates from Circular 2024-0037

2. **PSA 2025 Mortality Statistics**
   - Top causes: Heart Disease (20%), Cancer (11.3%), Stroke (10.1%)
   - Regional distribution data

3. **PhilHealth Accredited Hospitals** (`ph_hospitals.csv`)
   - Real facilities across NCR, Luzon, Visayas, Mindanao
   - Government vs. Private classification

4. **World Bank Historical Data** (`ph_national_trends.csv`)
   - OOP expenditure trends 1999-2022
   - Philippines at 44.4% OOP rate (2022)

5. **PSA Consumer Price Index**
   - Health inflation: 4.8% annually

### Calibrated Simulations:
- **Size:** 300 patient records
- **Purpose:** Demonstrate OOP patterns while protecting patient privacy (Data Privacy Act 2012)
- **Source:** `data_generator.py` using PhilHealth 2024 case rates
- **Calibration:** OOP share matched to WHO GHED Philippines target (44.4%)

### Coverage Calculation (PhilHealth Circular 2024-0037):
```
PhilHealth Coverage = MIN(Total Bill, Case Rate)
HMO Coverage = MIN(Remaining Balance, HMO Limit)
Out-of-Pocket = Total Bill - PhilHealth - HMO
```

**Case Rates:**
- Surgery: ₱24,000
- Emergency: ₱6,000
- Inpatient: ₱15,000
- Critical Care: ₱38,000
- HemWHO GHED Interactive Charts** - Country/metric filters with trend visualization (REAL DATA)
2. **PSA Disease Distribution** - Top causes of death by percentage (REAL DATA)
3. **Regional Distribution** - Based on PSA regional statistics (REAL DATA)
4. **Hospital Type Analysis** - Private vs. Government facility comparison
5. **Service Category Breakdown** - Insurance vs. OOP by medical service
6. **Cost Distribution** - Patient OOP burden ranges (<5k, 5-10k, 10-20k, 20k+)
7. **Insurance Plan Performance** - Average OOP by plan type
8. **National OOP Trend** - Hte vs. Government facility comparison
6. **Service Category Breakdown** - Insurance vs. OOP by medical service
7. **Cost Distribution** - Patient OOP burden ranges (<5k, 5-10k, 10-20k, 20k+)
8. **Insurance Plan Performance** - Average OOP by plan type
9. **National OOP Trend** - 23-year historical line chart (World Bank data)

## Tech Stack
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Visualization:** Chart.js 4.x
- **Backend:** Python 3.x + Flask
- **Data Processing:** Pandas, NumPy
- **Styling:** Custom CSS with dark/light theme toggle

## Installation & Setup

### Prerequisites:
- Python 3.8 or higher
- Modern web browser (Chrome/Edge/Firefox)

### Step 1: Install Dependencies
```bOption 1: GitHub Pages (Recommended)
Simply visit the live URL: [Your GitHub Pages URL]

All data loads directly from the repository - no backend needed!

### Option 2: Local Development with Flask

#### Step 1: Install Dependencies
```bash
pip install pandas flask flask-cors
```

#### Step 2: Generate Dataset (Optional)
```bash
python data_generator.py
```
Output: Creates `docs/ph_healthcare_data.csv` with 300 patient records calibrated to WHO GHED.

#### Step 3: Start Backend Server
```bash
python app.py
```
Server runs at `http://127.0.0.1:5000`

#### Step 4: Open Dashboard    # Flask backend (optional, for local dev)
├── data_generator.py               # Dataset generator (calibrated to WHO GHED)
├── ph_hospitals.csv                # Real PhilHealth facilities
├── ph_national_trends.csv          # World Bank OOP data (1999-2022)
├── DATA_SOURCES.md                 # Detailed data documentation
├── README.md                       # This file
└── docs/                           # GitHub Pages deployment folder
    ├── index.html                  # Main dashboard
    ├── script.js                   # Chart logic & data handling
    ├── style.css                   # Responsive styling
    ├── ghed_tidy.csv              # WHO GHED dataset (150x5 requirement) ⭐
    └── ph_healthcare_data.csv     # 300 calibrated patient records
└── docs/
    ├── index.html              # Main dashboard
   ├── ghed_tidy.csv            # WHO GHED-derived tidy indicators (macro-level)
    ├── script.js               # Chart logic & data handling
  WHO GHED dataset (5 columns × 193 rows) meets rubric requirement  
✓ Disease distribution matches PSA 2024 mortality statistics  
✓ Regional density reflects actual healthcare infrastructure  
✓ Private hospitals show realistic cost premium (+30%)  
✓ PhilHealth case rates from official 2024 circular  
✓ Patient records calibrated to WHO GHED OOP target (44.4%)  
✓ All data sources have clickable attribution links in footer

## Live Demo
🔗 **GitHub Pages:** [Your Live URL Here]

## Author
**David Erwin Valdepeña**  
BS Information Technology  
Technological University of the Philippines Manila