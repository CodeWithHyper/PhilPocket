# PhilPocket: Out-of-Pocket Expenditure Analyzer
## Project Overview
PhilPocket was developed by me, a 3rd Year BSIT Student as a part of my IT Professional Elective 3 Project. It showcases a health informatics dashboard designed to visualize the Out-of-Pocket (OOP) expenditure of patients in the Philippine healthcare setting. It bridges the gap between total hospital bills and insurance coverage (PhilHealth + HMOs), highlighting the financial burden carried directly by patients.
## Objectives
- Visualize Financial Gaps: To clearly show the discrepancy between billed amounts and insurance coverage.
- Identify High-Risk Patients: To flag patients who are paying excessive amounts out-of-pocket, indicating potential catastrophic health expenditure.
- Compare Insurance Performance: To analyze which insurance plans (PhilHealth vs. Private HMOs) offer better financial protection for specific services.
- Analyze Service Cost Drivers: To determine which hospital departments (e.g., Surgery vs. Pharmacy) contribute most to patient financial liability.
## Data Methodology
The data used in this dashboard is synthetic but statistically modeled to reflect real-world Philippine healthcare scenarios:
- Population: 150 Simulated Patients (N=150).
- Sample Size: 100 Randomly Sampled Patients (n=100) for analysis
- Cost Basis: Based on approximate prevailing rates in Metro Manila private hospitals.
- Coverage Logic:
  - PhilHealth: Modeled as case-rate packages (approx. 20-40% of total bill).
  - HMOs: Modeled to cover remaining balances up to specific limits.
  - OOP: Calculated as Total Bill - (PhilHealth + HMO).
## Tech Stack
- Frontend: HTML5, CSS3, JavaScript (Vanilla).
- Visualization: Chart.js library for interactive graphs.
- Backend: Python (Flask) for statistical processing and API endpoints.
- Data Handling: Pandas library for CSV manipulation and sampling.
## Academic Context
This project was developed for the Health Informatics subject to demonstrate:
- Data Sampling Techniques: Implementing Slovin's formula logic via random sampling.
- Health Data Visualization: Converting raw ledger data into actionable insights.
- System Architecture: Understanding the decoupled relationship between a statistical backend (Python) and a user-facing frontend (Web).
