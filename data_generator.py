import pandas as pd
import random
from datetime import datetime, timedelta
from pathlib import Path
import csv

POPULATION_SIZE = 300
OUTPUT_FILE = 'ph_healthcare_data.csv'

DISEASE_DISTRIBUTION = {
    'Ischaemic Heart Disease': {'weight': 0.198, 'critical': True, 'service': 'Inpatient Care (Critical)'},
    'Neoplasms (Cancer)': {'weight': 0.111, 'critical': True, 'service': 'Inpatient Care (Critical)'},
    'Cerebrovascular/Stroke': {'weight': 0.100, 'critical': True, 'service': 'Inpatient Care (Critical)'},
    'Pneumonia': {'weight': 0.065, 'critical': False, 'service': 'Inpatient Care'},
    'Diabetes Complications': {'weight': 0.063, 'critical': False, 'service': 'Inpatient Care'},
    'Hypertension': {'weight': 0.050, 'critical': False, 'service': 'Inpatient Care'},
    'Kidney Disease (Dialysis)': {'weight': 0.035, 'critical': False, 'service': 'Hemodialysis'},
    'COPD/Respiratory': {'weight': 0.040, 'critical': False, 'service': 'Inpatient Care'},
    'Appendicitis': {'weight': 0.080, 'critical': False, 'service': 'Surgery/Procedures'},
    'Cholecystectomy': {'weight': 0.060, 'critical': False, 'service': 'Surgery/Procedures'},
    'Trauma/Accidents': {'weight': 0.070, 'critical': False, 'service': 'Emergency Room'},
    'Acute Gastroenteritis': {'weight': 0.050, 'critical': False, 'service': 'Emergency Room'},
    'Diagnostic Imaging': {'weight': 0.058, 'critical': False, 'service': 'Diagnostics/Lab'},
    'Routine Checkup': {'weight': 0.020, 'critical': False, 'service': 'Consultations'},
}

SERVICE_TYPES = {
    'Surgery/Procedures': {
        'base': 120000, 
        'variance': 50000,
        'ph_rate': 24000  
    },
    'Emergency Room': {
        'base': 15000, 
        'variance': 8000,
        'ph_rate': 6000   
    },
    'Inpatient Care': {
        'base': 65000, 
        'variance': 40000,
        'ph_rate': 15000  
    },
    'Inpatient Care (Critical)': {
        'base': 350000, 
        'variance': 150000,
        'ph_rate': 38000  
    },
    'Diagnostics/Lab': {
        'base': 8500, 
        'variance': 4000,
        'ph_rate': 0      
    },
    'Pharmacy/Meds': {
        'base': 4500, 
        'variance': 2000,
        'ph_rate': 0     
    },
    'Consultations': {
        'base': 1000, 
        'variance': 500,
        'ph_rate': 500    
    },
    'Hemodialysis': {
        'base': 8000,
        'variance': 1000,
        'ph_rate': 6350
    }
}

HMO_LIMITS = {
    'Maxicare': 200000,
    'Intellicare': 150000,
    'Medicard': 100000,
    'PhilHealth Only': 0,
    'None (Cash)': 0
}

INSURANCE_PLANS = ['PhilHealth Only', 'Maxicare', 'Intellicare', 'Medicard', 'None (Cash)']

GHED_TIDY_FILE = Path('docs') / 'ghed_tidy.csv'


def load_latest_ghed_oop_share(country: str = 'Philippines') -> float | None:
    """Return latest WHO GHED out-of-pocket share (oops_che) as a fraction (0-1)."""
    if not GHED_TIDY_FILE.exists():
        return None
    latest_year = None
    latest_value = None
    with GHED_TIDY_FILE.open('r', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if (row.get('location') or '').strip() != country:
                continue
            if (row.get('metric') or '').strip() != 'oops_che':
                continue
            try:
                year = int(float((row.get('year') or '').strip()))
                value = float((row.get('value') or '').strip())
            except ValueError:
                continue
            if value <= 0:
                continue
            if latest_year is None or year > latest_year:
                latest_year = year
                latest_value = value
    if latest_value is None:
        return None
    return latest_value / 100.0

REGIONS = ['NCR', 'IV-A (Calabarzon)', 'III (Central Luzon)', 'VII (Central Visayas)', 'XI (Davao)']
REGION_WEIGHTS = [0.50, 0.20, 0.15, 0.10, 0.05]

# Load Real Hospital Data
try:
    HOSPITALS_DF = pd.read_csv('ph_hospitals.csv')
except FileNotFoundError:
    print("Warning: ph_hospitals.csv not found. Using mock hospital data.")
    HOSPITALS_DF = pd.DataFrame({
        'Facility_Name': ['Philippine General Hospital', 'St. Luke\'s Medical Center'],
        'Region': ['NCR', 'NCR'],
        'Level': [3, 3],
        'Type': ['Government', 'Private']
    })

def get_hospital_for_region(region):
    """Get a random hospital from the specified region"""
    region_hospitals = HOSPITALS_DF[HOSPITALS_DF['Region'] == region]
    if len(region_hospitals) == 0:
        region_hospitals = HOSPITALS_DF[HOSPITALS_DF['Region'] == 'NCR']
    hospital = region_hospitals.sample(1).iloc[0]
    return hospital['Facility_Name'], hospital['Type']

def generate_patient(id):
    diseases = list(DISEASE_DISTRIBUTION.keys())
    weights = [DISEASE_DISTRIBUTION[d]['weight'] for d in diseases]
    disease = random.choices(diseases, weights=weights)[0]
    
    service_cat = DISEASE_DISTRIBUTION[disease]['service']
    profile = SERVICE_TYPES[service_cat]
    
    age = int(random.choices(
        [random.randint(1, 18), random.randint(19, 40), random.randint(41, 59), random.randint(60, 90)],
        weights=[0.10, 0.20, 0.30, 0.40]
    )[0])
    
    region = random.choices(REGIONS, weights=REGION_WEIGHTS)[0]
    hospital_name, hospital_type = get_hospital_for_region(region)
    
    bill_amount = int(profile['base'] + (random.random() * profile['variance']))
    
    if hospital_type == 'Private':
        bill_amount = int(bill_amount * 1.30)
    
    if region != 'NCR':
        bill_amount = int(bill_amount * 0.85)
    
    plan = random.choices(
        ['PhilHealth Only', 'Maxicare', 'Intellicare', 'Medicard', 'None (Cash)'], 
        weights=[45, 15, 15, 10, 15] 
    )[0]
    
    insurance_cover = 0
    ph_coverage = min(bill_amount, profile['ph_rate'])
    
    if plan != 'None (Cash)':
        insurance_cover += ph_coverage

    if plan in ['Maxicare', 'Intellicare', 'Medicard']:
        remaining_balance = bill_amount - insurance_cover
        mbl_limit = HMO_LIMITS[plan]
        hmo_coverage = min(remaining_balance, mbl_limit)
        insurance_cover += hmo_coverage

    insurance_cover = int(insurance_cover)
    oop = bill_amount - insurance_cover

    start_date = datetime(2024, 1, 1)
    admission_date = start_date + timedelta(days=random.randint(0, 364))
    
    display_cat = service_cat if "Critical" not in service_cat else "Inpatient Care"

    return {
        "Patient_ID": f"PT-{1000+id}",
        "Date_Admitted": admission_date.strftime("%Y-%m-%d"),
        "Age": age,
        "Region": region,
        "Hospital_Name": hospital_name,
        "Hospital_Type": hospital_type,
        "Disease": disease,
        "Service_Category": display_cat,
        "Insurance_Plan": plan,
        "Total_Bill": bill_amount,
        "Insurance_Cover": insurance_cover,
        "Out_Of_Pocket": oop
    }

data = [generate_patient(i) for i in range(POPULATION_SIZE)]
df = pd.DataFrame(data)

target_oop_share = load_latest_ghed_oop_share('Philippines')
if target_oop_share is not None and target_oop_share > 0:
    total_bill = float(df['Total_Bill'].sum())
    target_total_oop = total_bill * float(target_oop_share)

    cash_mask = df['Insurance_Plan'] == 'None (Cash)'
    fixed_oop = float(df.loc[cash_mask, 'Total_Bill'].sum())
    adjustable_mask = ~cash_mask
    adjustable_oop = float(df.loc[adjustable_mask, 'Out_Of_Pocket'].sum())

    if adjustable_oop > 0:
        numerator = target_total_oop - fixed_oop
        factor = max(0.0, numerator / adjustable_oop)
        factor = min(max(factor, 0.25), 3.0)

        df.loc[adjustable_mask, 'Out_Of_Pocket'] = (df.loc[adjustable_mask, 'Out_Of_Pocket'] * factor).round().astype(int)

        df.loc[cash_mask, 'Out_Of_Pocket'] = df.loc[cash_mask, 'Total_Bill']
        df.loc[cash_mask, 'Insurance_Cover'] = 0

        df['Out_Of_Pocket'] = df[['Out_Of_Pocket', 'Total_Bill']].min(axis=1)
        df['Out_Of_Pocket'] = df['Out_Of_Pocket'].clip(lower=0)
        df['Insurance_Cover'] = (df['Total_Bill'] - df['Out_Of_Pocket']).astype(int)
df.to_csv(OUTPUT_FILE, index=False)

print(f"✓ Generated {POPULATION_SIZE} patient records")
print(f"✓ Using REAL PSA 2024 Disease Distribution")
print(f"✓ Using REAL PhilHealth Accredited Hospitals ({len(HOSPITALS_DF)} facilities)")
print(f"✓ Saved to: {OUTPUT_FILE}")
if target_oop_share is not None:
    try:
        realized_share = df['Out_Of_Pocket'].sum() / df['Total_Bill'].sum()
        print(f"✓ Calibrated OOP share to WHO GHED: target={target_oop_share*100:.1f}% realized={realized_share*100:.1f}%")
    except Exception:
        pass
print(f"\nTop Diseases in Dataset:")
disease_counts = df['Disease'].value_counts().head(5)
for disease, count in disease_counts.items():
    print(f"  - {disease}: {count} cases ({count/POPULATION_SIZE*100:.1f}%)")