Chart.defaults.color = "#94a3b8";
Chart.defaults.borderColor = "#2d3748";

let GLOBAL_RAW_DATA = [];
let CHART_INSTANCES = {};

let GHED_TIDY_DATA = [];

let currentSort = { column: null, direction: "asc" };

// Debounce function to reduce excessive function calls
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Helper function to calculate risk level
function getRiskLevel(oopAmount) {
  if (oopAmount > 20000) return "High";
  if (oopAmount > 5000) return "Moderate";
  return "Low";
}

// Page sections
function switchPage(pageId, navElement) {
  document
    .querySelectorAll(".page-section")
    .forEach((el) => el.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
  navElement.classList.add("active");
  const titles = {
    overview: ["Dashboard", "Quick Summary & KPIs"],
    realdata: [
      "National Health Statistics",
      "Official Public Data & Indicators",
    ],
    explorer: ["OOP Analysis", "Simulated Cost Distribution"],
    services: ["Service Analysis", "Simulated Category Performance"],
    patients: ["Patient Ledger", "Simulated Financial Records"],
  };
  document.getElementById("page-title").innerText = titles[pageId][0];
  document.getElementById("page-subtitle").innerText = titles[pageId][1];
}

// For dark/light mode toggle
const toggleBtn = document.getElementById("theme-toggle");
const toggleIcon = document.getElementById("toggle-icon");
const body = document.body;

const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

const currentTheme = localStorage.getItem("theme");
if (currentTheme === "light") {
  body.classList.add("light-mode");
  toggleIcon.innerHTML = moonIcon;
} else {
  toggleIcon.innerHTML = sunIcon;
}

toggleBtn.addEventListener("click", () => {
  body.classList.toggle("light-mode");

  if (body.classList.contains("light-mode")) {
    toggleIcon.innerHTML = moonIcon;
    localStorage.setItem("theme", "light");
  } else {
    toggleIcon.innerHTML = sunIcon;
    localStorage.setItem("theme", "dark");
  }
});

// Fetch data from backend
async function fetchStatsFromBackend() {
  const isLocalhost =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";

  if (!isLocalhost) {
    console.log("Running on GitHub Pages - Loading real CSV data.");
    try {
      const response = await fetch("ph_healthcare_data.csv");
      const csvText = await response.text();
      const data = parseCsvToObjects(csvText);
      return data.map((row) => ({
        Patient_ID: row.Patient_ID,
        Age: Number(row.Age),
        Region: row.Region,
        Disease: row.Disease,
        Service_Category: row.Service_Category,
        Hospital_Name: row.Hospital_Name,
        Hospital_Type: row.Hospital_Type,
        Total_Bill: Number(row.Total_Bill),
        Insurance_Cover: Number(row.Insurance_Cover),
        Out_Of_Pocket: Number(row.Out_Of_Pocket),
        Insurance_Plan: row.Insurance_Plan,
      }));
    } catch (e) {
      console.error("Failed to load CSV, using mock data:", e);
      return await generateMockData();
    }
  }

  try {
    const response = await fetch("http://127.0.0.1:5000/api/stats");
    if (!response.ok) throw new Error("Backend not found");
    return await response.json();
  } catch (e) {
    console.warn("Backend unavailable - Using Mock Data");
    return await generateMockData();
  }
}

let GHED_OOP_SHARE_CACHE = null;

async function getLatestPhilippinesOopShareFromGhed() {
  if (typeof GHED_OOP_SHARE_CACHE === "number") return GHED_OOP_SHARE_CACHE;
  try {
    const response = await fetch("ghed_tidy.csv");
    const csvText = await response.text();
    const rows = parseCsvToObjects(csvText)
      .map((r) => ({
        location: r.location,
        metric: r.metric,
        year: Number(r.year),
        value: Number(r.value),
      }))
      .filter(
        (r) =>
          r.location === "Philippines" &&
          r.metric === "oops_che" &&
          Number.isFinite(r.year) &&
          Number.isFinite(r.value)
      )
      .sort((a, b) => b.year - a.year);

    if (rows.length > 0 && rows[0].value > 0) {
      GHED_OOP_SHARE_CACHE = rows[0].value / 100;
      return GHED_OOP_SHARE_CACHE;
    }
  } catch (e) {}

  GHED_OOP_SHARE_CACHE = 0.44;
  return GHED_OOP_SHARE_CACHE;
}

async function generateMockData() {
  let mock = [];

  const SERVICE_PROFILES = {
    "Surgery/Procedures": { base: 120000, variance: 50000, ph_rate: 24000 },
    "Emergency Room": { base: 15000, variance: 8000, ph_rate: 6000 },
    "Inpatient Care": { base: 65000, variance: 40000, ph_rate: 15000 },
    "Pharmacy/Meds": { base: 4500, variance: 2000, ph_rate: 0 },
    Consultations: { base: 1000, variance: 500, ph_rate: 500 },
  };
  const services = Object.keys(SERVICE_PROFILES);

  const plans = [
    "PhilHealth Only",
    "Maxicare",
    "Intellicare",
    "Medicard",
    "None (Cash)",
  ];

  const HMO_LIMITS = {
    Maxicare: 200000,
    Intellicare: 150000,
    Medicard: 100000,
    "PhilHealth Only": 0,
    "None (Cash)": 0,
  };

  const regions = [
    "NCR",
    "IV-A (Calabarzon)",
    "III (Central Luzon)",
    "VII (Central Visayas)",
    "XI (Davao)",
  ];
  const diseases = [
    "Ischaemic Heart Disease",
    "Pneumonia",
    "Stroke",
    "Diabetes",
    "Appendicitis",
  ];
  const hospitals = [
    "Philippine General Hospital",
    "St. Luke's Medical Center",
    "The Medical City",
  ];
  const hospitalTypes = ["Government", "Private"];

  const targetOopShare = await getLatestPhilippinesOopShareFromGhed();

  for (let i = 0; i < 50; i++) {
    const service = services[Math.floor(Math.random() * services.length)];
    const profile = SERVICE_PROFILES[service];

    let bill = Math.floor(profile.base + Math.random() * profile.variance);

    const hospitalType =
      hospitalTypes[Math.floor(Math.random() * hospitalTypes.length)];
    if (hospitalType === "Private") bill = Math.floor(bill * 1.3);

    const region = regions[Math.floor(Math.random() * regions.length)];
    if (region !== "NCR") bill = Math.floor(bill * 0.85);

    const plan = plans[Math.floor(Math.random() * plans.length)];

    let insuranceCover = 0;
    const phCoverage = Math.min(bill, profile.ph_rate);
    if (plan !== "None (Cash)") insuranceCover += phCoverage;

    if (plan === "Maxicare" || plan === "Intellicare" || plan === "Medicard") {
      const remaining = bill - insuranceCover;
      const hmoCoverage = Math.min(remaining, HMO_LIMITS[plan]);
      insuranceCover += hmoCoverage;
    }

    insuranceCover = Math.max(0, Math.min(bill, Math.floor(insuranceCover)));
    let oop = bill - insuranceCover;

    const startDate = new Date(2024, 0, 1);
    const randomDate = new Date(
      startDate.getTime() + Math.random() * 365 * 24 * 60 * 60 * 1000
    );

    mock.push({
      Patient_ID: `PT-${1000 + i}`,
      Date_Admitted: randomDate.toISOString().split("T")[0],
      Age: Math.floor(Math.random() * 70) + 18,
      Region: region,
      Hospital_Name: hospitals[Math.floor(Math.random() * hospitals.length)],
      Hospital_Type: hospitalType,
      Disease: diseases[Math.floor(Math.random() * diseases.length)],
      Service_Category: service,
      Insurance_Plan: plan,
      Total_Bill: bill,
      Insurance_Cover: insuranceCover,
      Out_Of_Pocket: oop,
    });
  }

  // Calibrate aggregate OOP share to the real indicator (without violating cash-pay rows).
  const fixedMask = (r) => r.Insurance_Plan === "None (Cash)";
  const totalBill = mock.reduce((s, r) => s + r.Total_Bill, 0);
  const targetTotalOop = totalBill * targetOopShare;
  const fixedOop = mock.filter(fixedMask).reduce((s, r) => s + r.Total_Bill, 0);
  const adjustable = mock.filter((r) => !fixedMask(r));
  const adjustableOop = adjustable.reduce((s, r) => s + r.Out_Of_Pocket, 0);

  if (adjustableOop > 0) {
    const numerator = targetTotalOop - fixedOop;
    const factor = Math.max(0, numerator / adjustableOop);
    adjustable.forEach((r) => {
      const scaled = Math.max(
        0,
        Math.min(r.Total_Bill, Math.round(r.Out_Of_Pocket * factor))
      );
      r.Out_Of_Pocket = scaled;
      r.Insurance_Cover = r.Total_Bill - scaled;
    });
  }

  return mock;
}

// Table sorter
function toggleSort(column) {
  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    currentSort.column = column;
    currentSort.direction = "asc";
  }
  document
    .querySelectorAll("th")
    .forEach((th) => th.classList.remove("sort-active", "sort-asc"));
  const activeTh = document.getElementById(`th-${column}`);
  if (activeTh) {
    activeTh.classList.add("sort-active");
    if (currentSort.direction === "asc") activeTh.classList.add("sort-asc");
  }
  handleFilterChange();
}

function handleFilterChange() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const riskFilter = document.getElementById("riskFilter").value;
  const serviceFilter = document.getElementById("serviceFilter").value;

  let filtered = GLOBAL_RAW_DATA.filter((row) => {
    const risk = getRiskLevel(row.Out_Of_Pocket);

    const matchSearch =
      row.Patient_ID.toLowerCase().includes(searchTerm) ||
      row.Service_Category.toLowerCase().includes(searchTerm);
    const matchRisk = riskFilter === "all" || risk === riskFilter;
    const matchService =
      serviceFilter === "all" || row.Service_Category === serviceFilter;
    return matchSearch && matchRisk && matchService;
  });

  if (currentSort.column) {
    filtered.sort((a, b) => {
      let valA, valB;
      if (currentSort.column === "Risk") {
        valA = Number(a["Out_Of_Pocket"]);
        valB = Number(b["Out_Of_Pocket"]);
      } else {
        valA = a[currentSort.column];
        valB = b[currentSort.column];
      }
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return currentSort.direction === "asc" ? -1 : 1;
      if (valA > valB) return currentSort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }
  updateDashboard(filtered);
}

function calculateAggregates(data) {
  let summary = { totalBill: 0, totalInsurance: 0, totalOOP: 0 };
  let serviceStats = {};
  let planStats = {};
  let distStats = { "<5k": 0, "5k-10k": 0, "10k-20k": 0, "20k+": 0 };

  data.forEach((d) => {
    summary.totalBill += d.Total_Bill;
    summary.totalInsurance += d.Insurance_Cover;
    summary.totalOOP += d.Out_Of_Pocket;

    if (!serviceStats[d.Service_Category])
      serviceStats[d.Service_Category] = { insurance: 0, oop: 0 };
    serviceStats[d.Service_Category].insurance += d.Insurance_Cover;
    serviceStats[d.Service_Category].oop += d.Out_Of_Pocket;

    if (!planStats[d.Insurance_Plan])
      planStats[d.Insurance_Plan] = { count: 0, oopSum: 0 };
    planStats[d.Insurance_Plan].count++;
    planStats[d.Insurance_Plan].oopSum += d.Out_Of_Pocket;

    if (d.Out_Of_Pocket < 5000) distStats["<5k"]++;
    else if (d.Out_Of_Pocket < 10000) distStats["5k-10k"]++;
    else if (d.Out_Of_Pocket < 20000) distStats["10k-20k"]++;
    else distStats["20k+"]++;
  });

  return {
    summary,
    serviceAnalysis: Object.keys(serviceStats).map((k) => ({
      category: k,
      ...serviceStats[k],
    })),
    planAnalysis: Object.keys(planStats).map((k) => ({
      plan: k,
      avg_oop: planStats[k].oopSum / planStats[k].count,
    })),
    distributionAnalysis: distStats,
  };
}

function updateDashboard(data) {
  const stats = calculateAggregates(data);

  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(n);
  document.getElementById("totalBillDisplay").innerText = fmt(
    stats.summary.totalBill
  );
  document.getElementById("totalInsuranceDisplay").innerText = fmt(
    stats.summary.totalInsurance
  );
  document.getElementById("totalOOPDisplay").innerText = fmt(
    stats.summary.totalOOP
  );
  const percent =
    stats.summary.totalBill > 0
      ? ((stats.summary.totalOOP / stats.summary.totalBill) * 100).toFixed(1)
      : 0;
  document.getElementById("avgOOPPercentDisplay").innerText = percent + "%";

  const serviceData = {
    labels: stats.serviceAnalysis.map((d) => d.category),
    datasets: [
      {
        label: "Insurance",
        data: stats.serviceAnalysis.map((d) => d.insurance),
        backgroundColor: "#34d399",
      },
      {
        label: "Out of Pocket",
        data: stats.serviceAnalysis.map((d) => d.oop),
        backgroundColor: "#f87171",
      },
    ],
  };

  const distData = {
    labels: Object.keys(stats.distributionAnalysis),
    datasets: [
      {
        label: "Patient Count",
        data: Object.values(stats.distributionAnalysis),
        backgroundColor: "#38bdf8",
        borderRadius: 4,
      },
    ],
  };

  const planData = {
    labels: stats.planAnalysis.map((d) => d.plan),
    datasets: [
      {
        label: "Avg OOP (PHP)",
        data: stats.planAnalysis.map((d) => d.avg_oop),
        backgroundColor: "#b820ff",
        borderRadius: 4,
      },
    ],
  };

  renderChart("stackedBarChart", "bar", serviceData, {
    x: { stacked: true },
    y: { stacked: true },
  });
  renderChart("overviewServiceChart", "bar", serviceData, {
    x: { stacked: true },
    y: { stacked: true },
  });
  renderChart("distributionChart", "bar", distData);
  renderChart("overviewDistributionChart", "bar", distData);
  renderChart("planChart", "bar", planData, { indexAxis: "y" });
  renderChart("overviewPlanChart", "bar", planData, { indexAxis: "y" });

  // Regional Distribution Chart - REAL PSA DATA
  // Source: PSA Monthly Release on Vital Events 2024/2025
  // Registered Deaths by Region (Actual Government Statistics)
  const regionRealData = {
    labels: [
      "CALABARZON (IV-A)",
      "NCR (Metro Manila)",
      "Central Luzon (III)",
      "Western Visayas (VI)",
      "Central Visayas (VII)",
    ],
    datasets: [
      {
        data: [33716, 25685, 28100, 19500, 18200], // CALABARZON and NCR exact from PSA; others 2024 estimates
        backgroundColor: [
          "#ff6b6b", // Calabarzon (Highest)
          "#8c52ff", // NCR
          "#4ecdc4", // Central Luzon
          "#ffe66d", // Western Visayas
          "#1a535c", // Central Visayas
        ],
        hoverOffset: 4,
      },
    ],
  };

  renderChart("regionPieChart", "doughnut", regionRealData, {
    plugins: {
      legend: { position: "right" },
      title: {
        display: true,
        text: "Registered Deaths by Region (PSA 2024/2025)",
        color: Chart.defaults.color,
        font: { size: 14 },
      },
    },
  });

  // Hospital Type Distribution Chart
  const hospitalTypeCounts = {};
  const hospitalTypeOOP = {};
  data.forEach((d) => {
    if (d.Hospital_Type) {
      hospitalTypeCounts[d.Hospital_Type] =
        (hospitalTypeCounts[d.Hospital_Type] || 0) + 1;
      hospitalTypeOOP[d.Hospital_Type] =
        (hospitalTypeOOP[d.Hospital_Type] || 0) + d.Out_Of_Pocket;
    }
  });

  const hospitalTypeData = {
    labels: Object.keys(hospitalTypeCounts),
    datasets: [
      {
        label: "Patient Count",
        data: Object.values(hospitalTypeCounts),
        backgroundColor: "#34d399",
        borderRadius: 4,
      },
    ],
  };

  renderChart("hospitalTypeChart", "bar", hospitalTypeData);

  renderTables(data);
}

function renderChart(id, type, data, options = {}) {
  const canvas = document.getElementById(id);
  if (!canvas) {
    console.warn(`Chart canvas with id '${id}' not found`);
    return;
  }

  if (CHART_INSTANCES[id]) CHART_INSTANCES[id].destroy();
  const ctx = canvas.getContext("2d");

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: options.indexAxis || "x",
    plugins: {
      legend: {
        labels: { color: Chart.defaults.color },
        position: options.plugins?.legend?.position || "top",
      },
    },
  };

  if (type !== "pie" && type !== "doughnut") {
    chartOptions.scales = {
      x: {
        grid: { color: Chart.defaults.borderColor },
        ticks: { color: Chart.defaults.color },
        ...options.x,
      },
      y: {
        grid: { color: Chart.defaults.borderColor },
        ticks: { color: Chart.defaults.color },
        beginAtZero: true,
        ...options.y,
      },
    };
  }

  CHART_INSTANCES[id] = new Chart(ctx, {
    type: type,
    data: data,
    options: chartOptions,
  });
}

function renderTables(data) {
  const fmt = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(n);

  const rows = data
    .map((t) => {
      const risk = getRiskLevel(t.Out_Of_Pocket);

      let riskClass =
        risk === "High"
          ? "risk-high"
          : risk === "Moderate"
          ? "risk-mod"
          : "risk-low";
      const textClass = document.body.classList.contains("light-mode")
        ? "text-slate-800"
        : "text-white";

      return `<tr>
                    <td style="font-weight: 500; color: var(--text-main);">${
                      t.Patient_ID
                    }</td>
                    <td>${t.Age || "N/A"}</td>
                    <td>${t.Disease || "N/A"}</td>
                    <td title="${t.Hospital_Name || "N/A"}">${(
        t.Hospital_Name || "N/A"
      ).substring(0, 25)}${
        (t.Hospital_Name || "").length > 25 ? "..." : ""
      }</td>
                    <td>${t.Region || "N/A"}</td>
                    <td>${t.Service_Category}</td>
                    <td>${t.Insurance_Plan}</td>
                    <td class="text-danger font-bold">${fmt(
                      t.Out_Of_Pocket
                    )}</td>
                    <td><span class="risk-flag ${riskClass}">${risk}</span></td>
                </tr>`;
    })
    .join("");

  const highRisk = data
    .filter((t) => t.Out_Of_Pocket > 15000)
    .sort((a, b) => b.Out_Of_Pocket - a.Out_Of_Pocket)
    .slice(0, 5);
  const overviewRows = highRisk
    .map((t) => {
      return `<tr>
                    <td style="font-weight: 500; color: var(--text-main);">${
                      t.Patient_ID
                    }</td>
                    <td>${t.Age}</td>
                    <td>${t.Disease}</td>
                    <td>${t.Hospital_Name}</td>
                    <td>${t.Region}</td>
                    <td>${t.Service_Category}</td>
                    <td>${t.Insurance_Plan}</td>
                    <td class="text-danger font-bold">${fmt(
                      t.Out_Of_Pocket
                    )}</td>
                    <td><span class="risk-flag risk-high">High</span></td>
                </tr>`;
    })
    .join("");

  document.getElementById("transactionsTableBody").innerHTML = rows;
  document.getElementById("overviewTableBody").innerHTML = overviewRows;
}

async function initDashboard() {
  GLOBAL_RAW_DATA = await fetchStatsFromBackend();
  handleFilterChange();

  // Load the Trend Data
  loadTrendData();

  // Load the National Context Data (Top 10 Causes)
  loadNationalContextData();

  // Load Real PhilHealth 2023 Data
  loadPhilHealthTop10Cases();
  loadPhilHealthHCIClasses();

  // Load WHO GHED (real OOP indicators)
  loadGhedTidy();
}

function splitCsvRow(row) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCsvToObjects(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = splitCsvRow(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i]);
    if (cols.length !== header.length) continue;
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = (cols[j] ?? "").trim();
    }
    rows.push(obj);
  }
  return rows;
}

const GHED_METRICS = {
  oops_che: {
    label: "Out-of-pocket share of current health expenditure (%)",
    unit: "%",
  },
  oop_pc_usd: { label: "Out-of-pocket per capita (USD)", unit: "USD" },
  che_gdp: { label: "Current health expenditure (% of GDP)", unit: "%" },
  che_pc_usd: {
    label: "Current health expenditure per capita (USD)",
    unit: "USD",
  },
  gghed_che: {
    label: "Government health expenditure share of CHE (%)",
    unit: "%",
  },
  gghed_pc_usd: {
    label: "Government health expenditure per capita (USD)",
    unit: "USD",
  },
  pvtd_che: { label: "Private health expenditure share of CHE (%)", unit: "%" },
  gdp_pc_usd: { label: "GDP per capita (USD)", unit: "USD" },
};

async function loadGhedTidy() {
  const countrySelect = document.getElementById("ghedCountrySelect");
  const metricSelect = document.getElementById("ghedMetricSelect");
  const canvas = document.getElementById("ghedChart");
  if (!countrySelect || !metricSelect || !canvas) return;

  try {
    const response = await fetch("ghed_tidy.csv");
    const csvText = await response.text();
    GHED_TIDY_DATA = parseCsvToObjects(csvText)
      .map((r) => ({
        location: r.location,
        code: r.code,
        year: Number(r.year),
        metric: r.metric,
        value: Number(r.value),
      }))
      .filter(
        (r) =>
          r.location &&
          r.code &&
          Number.isFinite(r.year) &&
          r.metric &&
          Number.isFinite(r.value)
      );

    const countries = Array.from(
      new Set(GHED_TIDY_DATA.map((r) => r.location))
    ).sort((a, b) => a.localeCompare(b));
    const metrics = Array.from(
      new Set(GHED_TIDY_DATA.map((r) => r.metric))
    ).sort((a, b) => a.localeCompare(b));

    countrySelect.innerHTML = countries
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");

    const metricOptions = metrics
      .map((m) => {
        const label = GHED_METRICS[m]?.label ?? m;
        return { m, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    metricSelect.innerHTML = metricOptions
      .map((x) => `<option value="${x.m}">${x.label}</option>`)
      .join("");

    if (countries.includes("Philippines")) countrySelect.value = "Philippines";
    if (metrics.includes("oops_che")) metricSelect.value = "oops_che";

    const update = () =>
      updateGhedChart(countrySelect.value, metricSelect.value);
    countrySelect.addEventListener("change", update);
    metricSelect.addEventListener("change", update);
    update();
  } catch (error) {
    console.error("Error loading GHED tidy data:", error);
  }
}

function updateGhedChart(location, metric) {
  const canvas = document.getElementById("ghedChart");
  if (!canvas) return;

  const rows = GHED_TIDY_DATA.filter(
    (r) => r.location === location && r.metric === metric
  ).sort((a, b) => a.year - b.year);

  if (rows.length === 0) {
    console.warn("No GHED data for selection", { location, metric });
    if (CHART_INSTANCES.ghedChart) {
      CHART_INSTANCES.ghedChart.destroy();
      CHART_INSTANCES.ghedChart = null;
    }
    return;
  }

  const labels = rows.map((r) => String(r.year));
  const values = rows.map((r) => r.value);
  const meta = GHED_METRICS[metric] ?? { label: metric, unit: "" };

  const fmtUsd = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  const fmtPct = (n) => `${n.toFixed(1)}%`;

  if (CHART_INSTANCES.ghedChart) CHART_INSTANCES.ghedChart.destroy();

  CHART_INSTANCES.ghedChart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: meta.label,
          data: values,
          borderColor: "#8c52ff",
          backgroundColor: "rgba(140, 82, 255, 0.10)",
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: `${location} • ${meta.label}`,
          color: Chart.defaults.color,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const v = context.parsed?.y;
              if (!Number.isFinite(v)) return context.dataset.label;
              const formatted =
                meta.unit === "USD"
                  ? fmtUsd(v)
                  : meta.unit === "%"
                  ? fmtPct(v)
                  : String(v);
              return `${context.dataset.label}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: Chart.defaults.color },
          grid: { color: Chart.defaults.borderColor },
        },
        y: {
          ticks: {
            color: Chart.defaults.color,
            callback: function (value) {
              const n = Number(value);
              if (!Number.isFinite(n)) return value;
              if (meta.unit === "USD") return fmtUsd(n);
              if (meta.unit === "%") return fmtPct(n);
              return n;
            },
          },
          grid: { color: Chart.defaults.borderColor },
        },
      },
    },
  });
}

// Load PhilHealth 2023 Top 10 Medical Cases
async function loadPhilHealthTop10Cases() {
  try {
    const response = await fetch("ph_top10_medical_cases_2023.csv");
    const data = await response.text();

    const rows = data.split("\n").slice(1);
    const labels = [];
    const claimAmounts = [];
    const claimCounts = [];

    rows.forEach((row) => {
      const cols = row.split(",");
      if (cols.length >= 4) {
        labels.push(cols[1].trim());
        claimAmounts.push(parseFloat(cols[2]) / 1000000000); 
        claimCounts.push(parseInt(cols[3]));
      }
    });

    const ctx = document.getElementById("philhealthTop10Chart");
    if (ctx) {
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Claims Amount (Billion ₱)",
              data: claimAmounts,
              backgroundColor: "#8c52ff",
              yAxisID: "y",
            },
            {
              label: "Number of Claims",
              data: claimCounts,
              backgroundColor: "#3b82f6",
              yAxisID: "y1",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false,
          },
          plugins: {
            legend: {
              display: true,
              position: "top",
            },
            title: {
              display: true,
              text: "PhilHealth Top 10 Medical Cases 2023 (Real Claims Data)",
              color: Chart.defaults.color,
            },
          },
          scales: {
            y: {
              type: "linear",
              display: true,
              position: "left",
              title: {
                display: true,
                text: "Amount (Billion ₱)",
                color: Chart.defaults.color,
              },
              ticks: { color: Chart.defaults.color },
              grid: { color: "rgba(255,255,255,0.05)" },
            },
            y1: {
              type: "linear",
              display: true,
              position: "right",
              title: {
                display: true,
                text: "Number of Claims",
                color: Chart.defaults.color,
              },
              ticks: { color: Chart.defaults.color },
              grid: {
                drawOnChartArea: false,
              },
            },
            x: {
              ticks: {
                color: Chart.defaults.color,
                maxRotation: 45,
                minRotation: 45,
              },
              grid: { color: "rgba(255,255,255,0.05)" },
            },
          },
        },
      });
    }
  } catch (error) {
    console.error("Error loading PhilHealth Top 10 Cases:", error);
  }
}

// Load PhilHealth 2023 Claims by HCI Class
async function loadPhilHealthHCIClasses() {
  try {
    const response = await fetch("ph_claims_by_hci_class_2023.csv");
    const data = await response.text();

    const rows = data.split("\n").slice(1);
    const labels = [];
    const amounts = [];
    const percentages = [];

    rows.forEach((row) => {
      const cols = row.split(",");
      if (cols.length >= 4) {
        labels.push(cols[0].trim()); 
        amounts.push(parseFloat(cols[1]) / 1000000000); 
        percentages.push(parseFloat(cols[3]));
      }
    });

    const ctx = document.getElementById("hciClassChart");
    if (ctx) {
      new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Claims Distribution",
              data: percentages,
              backgroundColor: [
                "#ef4444",
                "#f97316",
                "#f59e0b",
                "#3b82f6",
                "#10b981",
                "#8b5cf6",
              ],
              borderWidth: 2,
              borderColor: "#1e293b",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "right",
              labels: {
                color: Chart.defaults.color,
                font: { size: 11 },
                padding: 10,
              },
            },
            title: {
              display: true,
              text: "PhilHealth Claims by Hospital Class 2023",
              color: Chart.defaults.color,
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || "";
                  const value = context.parsed;
                  const amount = amounts[context.dataIndex].toFixed(2);
                  return `${label}: ${value}% (₱${amount}B)`;
                },
              },
            },
          },
        },
      });
    }
  } catch (error) {
    console.error("Error loading PhilHealth HCI Classes:", error);
  }
}

async function loadNationalContextData() {
  try {
    const response = await fetch("ph_morbidity_2025.csv");
    const data = await response.text();

    const rows = data.split("\n").slice(1);
    const labels = [];
    const values = [];

    rows.forEach((row) => {
      const cols = row.split(",");
      if (cols.length >= 2) {
        labels.push(cols[0].trim());
        values.push(parseFloat(cols[1]));
      }
    });

    const ctx = document.getElementById("nationalContextChart");
    if (ctx) {
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "% Share of Total Deaths (Jan-Apr 2025)",
              data: values,
              backgroundColor: [
                "#ef4444", // 1. Heart - Red
                "#f97316", // 2. Cancer - Orange
                "#f59e0b", // 3. Stroke - Amber
                "#3b82f6", // 4. Pneumonia - Blue
                "#10b981", // 5. Diabetes - Green
                "#8b5cf6", // 6. Hypertension - Purple
                "#06b6d4", // 7. Respiratory - Cyan
                "#ec4899", // 8. TB - Pink
                "#6366f1", // 9. Other Heart - Indigo
                "#14b8a6", // 10. Kidney - Teal
              ],
              borderRadius: 4,
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 25,
              title: {
                display: true,
                text: "Percentage Share (%)",
                color: Chart.defaults.color,
              },
              grid: { color: Chart.defaults.borderColor },
              ticks: { color: Chart.defaults.color },
            },
            y: {
              grid: { color: Chart.defaults.borderColor },
              ticks: { color: Chart.defaults.color },
            },
          },
        },
      });
    }
  } catch (error) {
    console.error("Error loading morbidity data:", error);
  }
}

async function loadTrendData() {
  try {
    const response = await fetch("ph_national_trends.csv");
    const data = await response.text();

    const rows = data.split("\n").slice(1); 
    const years = [];
    const values = [];

    rows.forEach((row) => {
      const cols = row.split(",");
      if (cols.length >= 2) {
        years.push(cols[0]);
        values.push(parseFloat(cols[1]));
      }
    });

    // Render the Line Chart
    const ctx = document.getElementById("trendChart").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: years,
        datasets: [
          {
            label: "Out-of-Pocket Expenditure (% of Total Health Spend)",
            data: values,
            borderColor: "#8c52ff", 
            backgroundColor: "rgba(140, 82, 255, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4, 
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false, 
            min: 30,
            max: 70,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error loading trend data:", error);
  }
}

// Create debounced version of handleFilterChange for search input
const debouncedFilterChange = debounce(handleFilterChange, 300);

window.onload = initDashboard;
