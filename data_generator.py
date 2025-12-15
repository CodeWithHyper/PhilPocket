import pandas as pd
import random

# Config
POPULATION_SIZE = 150
OUTPUT_FILE = 'ph_healthcare_data.csv'

# Sources: PhilHealth Circular 2024-0037, PSA 2024 Health Stats, Maxicare/Medicard Rate Sheets

SERVICE_TYPES = {
    'Surgery/Procedures': {
        # Appendectomy / Cholecystectomy
        'base': 120000, 
        'variance': 50000,
        'ph_rate': 24000  
    },
    'Emergency Room': {
        # Acute Gastroenteritis / Trauma / High Fever
        'base': 15000, 
        'variance': 8000,
        'ph_rate': 6000   
    },
    'Inpatient Care': {
        # Pneumonia, Dengue, Stroke (Common Admissions), etc.
        'base': 65000, 
        'variance': 40000,
        'ph_rate': 15000  
    },
    'Inpatient Care (Critical)': {
        # ICU, Stroke, Heart Attack, etc.
        'base': 350000, 
        'variance': 150000,
        'ph_rate': 38000  
    },
    'Diagnostics/Lab': {
        # CT Scans, MRI, Biopsy (Outpatient), etc.
        'base': 8500, 
        'variance': 4000,
        'ph_rate': 0      
    },
    'Pharmacy/Meds': {
        # Maintenance Meds (Hypertension/Diabetes) - 3 month supply
        'base': 4500, 
        'variance': 2000,
        'ph_rate': 0     
    },
    'Consultations': {
        # Specialist Fee
        'base': 1000, 
        'variance': 500,
        'ph_rate': 500    
    },
    'Hemodialysis': {
        # SPECIAL 2024 CASE: PhilHealth increased coverage to P6,350/session
        'base': 8000,
        'variance': 1000,
        'ph_rate': 6350   # New 2024 Rate
    }
}

# REAL HMO LIMITS (Maximum Benefit Limit - MBL)
# Based on Silver/Gold plans of Maxicare, Intellicare, Medicard
HMO_LIMITS = {
    'Maxicare': 200000,     # Typical Gold Plan MBL
    'Intellicare': 150000,  # Typical Plan MBL
    'Medicard': 100000,     # Typical Silver Plan MBL
    'PhilHealth Only': 0,
    'None (Cash)': 0
}

INSURANCE_PLANS = ['PhilHealth Only', 'Maxicare', 'Intellicare', 'Medicard', 'None (Cash)']

def generate_patient(id):
    # Select a random condition type
    service_cat = random.choice(list(SERVICE_TYPES.keys()))
    profile = SERVICE_TYPES[service_cat]
    
    # 1. Calculate Real Bill (Base + Random Variance)
    bill_amount = int(profile['base'] + (random.random() * profile['variance']))
    
    # 2. Assign Insurance Plan
    plan = random.choices(
        ['PhilHealth Only', 'Maxicare', 'Intellicare', 'Medicard', 'None (Cash)'], 
        weights=[45, 15, 15, 10, 15] 
    )[0]
    
    # 3. Calculate Coverage Logic (The "PhilPocket" Core Algorithm)
    insurance_cover = 0
    
    # A. PhilHealth Calculation (Fixed Case Rate Logic)
    # PhilHealth pays the Case Rate OR the Total Bill (whichever is lower)
    # They never pay more than the bill.
    ph_coverage = min(bill_amount, profile['ph_rate'])
    
    if plan != 'None (Cash)':
        insurance_cover += ph_coverage

    # B. HMO Calculation (Balance Billing Logic)
    # HMOs cover the *balance* after PhilHealth, up to their MBL (Limit).
    if plan in ['Maxicare', 'Intellicare', 'Medicard']:
        remaining_balance = bill_amount - insurance_cover
        mbl_limit = HMO_LIMITS[plan]
        
        # HMO covers the balance, but cannot exceed their MBL
        hmo_coverage = min(remaining_balance, mbl_limit)
        insurance_cover += hmo_coverage

    insurance_cover = int(insurance_cover)
    
    # 4. Out of Pocket (The Financial Burden)
    oop = bill_amount - insurance_cover
    
    display_cat = service_cat if "Critical" not in service_cat else "Inpatient Care"

    return {
        "Patient_ID": f"PT-{1000+id}",
        "Service_Category": display_cat,
        "Insurance_Plan": plan,
        "Total_Bill": bill_amount,
        "Insurance_Cover": insurance_cover,
        "Out_Of_Pocket": oop
    }

# Generate Population
data = [generate_patient(i) for i in range(POPULATION_SIZE)]

# Save to CSV
df = pd.DataFrame(data)
df.to_csv(OUTPUT_FILE, index=False)

print(f"Generated {POPULATION_SIZE} records with Service Categories & Insurance Plans.")