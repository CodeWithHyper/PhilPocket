import pandas as pd
import random

# Config
POPULATION_SIZE = 150
OUTPUT_FILE = 'ph_healthcare_data.csv'

SERVICE_TYPES = {
    'Surgery/Procedures': {'base': 50000, 'variance': 40000}, # Appendicitis, C-Section
    'Emergency Room':     {'base': 15000, 'variance': 10000}, # Accidents, Acute pain
    'Inpatient Care':     {'base': 25000, 'variance': 15000}, # Dengue, Pneumonia
    'Diagnostics/Lab':    {'base': 5000,  'variance': 3000},  # MRI, Blood chem
    'Pharmacy/Meds':      {'base': 2500,  'variance': 2000},  # Maintenance meds
    'Consultations':      {'base': 1000,  'variance': 500}    # Checkups
}

INSURANCE_PLANS = ['PhilHealth Only', 'Maxicare', 'Intellicare', 'Medicard', 'None (Cash)']

def generate_patient(id):
    service_cat = random.choice(list(SERVICE_TYPES.keys()))
    profile = SERVICE_TYPES[service_cat]
    
    # 1. Calculate Bill
    bill_amount = int(profile['base'] + (random.random() * profile['variance']))
    
    # 2. Assign Insurance Plan
    plan = random.choices(INSURANCE_PLANS, weights=[40, 15, 15, 10, 20])[0]
    
    # 3. Calculate Coverage
    insurance_cover = 0
    
    if plan != 'None (Cash)':
        ph_share = bill_amount * random.uniform(0.2, 0.4)
        insurance_cover += ph_share

    if plan in ['Maxicare', 'Intellicare', 'Medicard']:
        balance = bill_amount - insurance_cover
        hmo_share = balance * random.uniform(0.8, 1.0) 
        insurance_cover += hmo_share

    insurance_cover = int(insurance_cover)
    
    # 4. Out of Pocket
    oop = bill_amount - insurance_cover
    if oop < 0: oop = 0

    return {
        "Patient_ID": f"PT-{1000+id}",
        "Service_Category": service_cat,
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

print(f"✅ Generated {POPULATION_SIZE} records with Service Categories & Insurance Plans.")