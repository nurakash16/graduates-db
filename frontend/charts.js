const API_BASE = "https://graduates-db.onrender.com"; // Change to Render backend later

// Helper function to safely render charts
function renderChart(id, option) {
  const dom = document.getElementById(id);
  if (!dom) return;
  let chart = echarts.getInstanceByDom(dom);
  if (chart) chart.dispose(); // reset
  chart = echarts.init(dom);
  chart.setOption(option, true);
}


async function loadCharts() {
  const deptSelect = document.getElementById("department");
  const dept = deptSelect ? deptSelect.value : "eee"; // fallback to EEE

  try {
    /* ---------- 1. Convocation Chart (Pie) ---------- */
    const res1 = await fetch(`${API_BASE}/graduates/${dept}/chart/convocation`);
    let data1 = await res1.json();

    // Normalize + merge duplicates
    const convocationMap = {};
    data1.forEach(i => {
      const name = i.convocation.trim();
      const val = parseInt(i.value || i.count || 0, 10);
      convocationMap[name] = (convocationMap[name] || 0) + val;
    });
    data1 = Object.entries(convocationMap).map(([name, value]) => ({ name, value }));

    renderChart("convocationChart", {
      tooltip: { trigger: "item" },
      series: [{
        type: "pie",
        radius: "60%",
        data: data1
      }]
    });

    /* ---------- 2. Avg CGPA per Convocation (Bar) ---------- */
    const res2 = await fetch(`${API_BASE}/graduates/${dept}/chart/cgpa`);
    let data2 = await res2.json();

    const convMap = {};
    data2.forEach(i => {
      const key = i.convocation.trim();
      const val = parseFloat(i.value || 0);
      if (!isNaN(val)) {
        (convMap[key] ??= { total: 0, count: 0 });
        convMap[key].total += val; convMap[key].count++;
      }
    });
    data2 = Object.entries(convMap).map(([convocation, { total, count }]) => ({
      convocation, avg_cgpa: total / count
    }));

    renderChart("cgpaChart", {
      tooltip: { trigger: "axis" },
      xAxis: { type: "category", data: data2.map(i => i.convocation) },
      yAxis: { type: "value" },
      series: [{ type: "bar", data: data2.map(i => +i.avg_cgpa.toFixed(2)) }]
    });

    /* ---------- 3. Avg/Min/Max CGPA by Dept (Grouped Bars) ---------- */
    const res7 = await fetch(`${API_BASE}/graduates/chart/cgpa-stats-by-dept`);
    const data7 = await res7.json();
    renderChart("avgCgpaDeptChart", {
      tooltip: { trigger: "axis" },
      legend: { data: ["Avg CGPA", "Min CGPA", "Max CGPA"] },
      xAxis: { type: "category", data: data7.map(d => d.department) },
      yAxis: { type: "value" },
      series: [
        { name: "Avg CGPA", type: "bar", data: data7.map(d => d.avg_cgpa), itemStyle: { color: "#3b82f6" } },
        { name: "Min CGPA", type: "bar", data: data7.map(d => d.min_cgpa), itemStyle: { color: "#10b981" } },
        { name: "Max CGPA", type: "bar", data: data7.map(d => d.max_cgpa), itemStyle: { color: "#f59e0b" } },
      ]
    });

    /* ---------- 4. Student Count by Dept (Pie) ---------- */
    const res5 = await fetch(`${API_BASE}/graduates/chart/count-by-dept`);
    const data5 = await res5.json();
    renderChart("countDeptChart", {
      tooltip: { trigger: "item" },
      series: [{
        type: "pie",
        radius: "60%",
        data: data5.map(i => ({ name: i.department, value: i.count }))
      }]
    });

    /* ---------- 5. CGPA Distribution (Line) ---------- */
    const res6 = await fetch(`${API_BASE}/graduates/chart/cgpa-by-dept`);
    const data6 = await res6.json();
    const bins = Array.from({ length: 40 }, (_, i) => (2 + i * 0.05).toFixed(2));

    renderChart("cgpaDeptChart", {
      tooltip: { trigger: "axis" },
      legend: { data: data6.map(i => i.department) },
      xAxis: { type: "category", data: bins },
      yAxis: { type: "value" },
      series: data6.map(dept => ({
        name: dept.department,
        type: "line",
        smooth: true,
        data: bins.map(bin => {
          const b = parseFloat(bin);
          return dept.cgpas ? dept.cgpas.filter(c => c >= b && c < b + 0.05).length : 0;
        })
      }))
    });

  } catch (err) {
    console.error("Failed to load charts:", err);
    alert("Failed to load charts. Check backend.");
  }
}

// Auto-load charts on page load
window.onload = loadCharts;
