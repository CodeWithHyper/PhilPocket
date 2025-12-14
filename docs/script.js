Chart.defaults.color = "#94a3b8";
Chart.defaults.borderColor = "#2d3748";

let GLOBAL_RAW_DATA = [];
let CHART_INSTANCES = {};

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
    overview: ["Overview", "Executive Summary"],
    explorer: ["OOP Explorer", "Detailed Cost Analysis"],
    services: ["Service Insights", "Category Performance"],
    insurance: ["Insurance Plans", "Performance Comparison"],
    patients: ["Patient Analysis", "Financial Burden Identification"],
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
// If running on GitHub Pages, use mock data. Otherwise, fetch from local backend.
async function fetchStatsFromBackend() {
  const isLocalhost =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";

  if (!isLocalhost) {
    console.warn(
      "Running on GitHub Pages - Skipping backend fetch and using Mock Data."
    );
    return generateMockData();
  }

  try {
    const response = await fetch("http://127.0.0.1:5000/api/stats");
    if (!response.ok) throw new Error("Backend not found");
    return await response.json();
  } catch (e) {
    console.warn("Backend unavailable - Using Mock Data");
    return generateMockData();
  }
}

function generateMockData() {
  let mock = [];
  const services = [
    "Surgery/Procedures",
    "Emergency Room",
    "Pharmacy/Meds",
    "Consultations",
    "Inpatient Care",
  ];
  const plans = [
    "PhilHealth Only",
    "Maxicare",
    "Intellicare",
    "Medicard",
    "None (Cash)",
  ];
  for (let i = 0; i < 50; i++) {
    let bill = Math.floor(Math.random() * 50000) + 1000;
    let oop = Math.floor(bill * Math.random());
    mock.push({
      Patient_ID: `PT-${1000 + i}`,
      Service_Category: services[Math.floor(Math.random() * services.length)],
      Insurance_Plan: plans[Math.floor(Math.random() * plans.length)],
      Total_Bill: bill,
      Insurance_Cover: bill - oop,
      Out_Of_Pocket: oop,
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

  renderTables(data);
}

function renderChart(id, type, data, options = {}) {
  const canvas = document.getElementById(id);
  if (!canvas) return; // Skip if canvas doesn't exist
  
  if (CHART_INSTANCES[id]) CHART_INSTANCES[id].destroy();
  const ctx = canvas.getContext("2d");
  CHART_INSTANCES[id] = new Chart(ctx, {
    type: type,
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: options.indexAxis || "x",
      plugins: { legend: { labels: { color: Chart.defaults.color } } },
      scales: {
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
      },
    },
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
    .filter((t) => t.Out_Of_Pocket > 5000)
    .sort((a, b) => b.Out_Of_Pocket - a.Out_Of_Pocket)
    .slice(0, 5);
  const overviewRows = highRisk
    .map((t) => {
      return `<tr>
                    <td style="font-weight: 500; color: var(--text-main);">${
                      t.Patient_ID
                    }</td>
                    <td>${t.Service_Category}</td>
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
}

function refreshDashboard() {
  initDashboard();
}

// Create debounced version of handleFilterChange for search input
const debouncedFilterChange = debounce(handleFilterChange, 300);

window.onload = initDashboard;
