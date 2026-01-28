import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import {
  User, LayoutDashboard, Filter, Activity, TrendingUp, AlertTriangle, CheckCircle, XCircle, Search
} from "lucide-react";

/* ---------------- CONFIG ---------------- */
const COLORS = ["#ef4444", "#6366f1", "#10b981", "#f59e0b", "#8b5cf6"];



/* ---------------- APP ---------------- */
const App = () => {
  const [viewMode, setViewMode] = useState("overview");
  const [filters, setFilters] = useState({ departments: [], job_roles: [] });
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [overviewData, setOverviewData] = useState(null);

  // Profile state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [employeeError, setEmployeeError] = useState("");
  const [riskFactors, setRiskFactors] = useState({
    overtime: false,
    lowJobSatisfaction: false,
    lowWorkLifeBalance: false,
    noRecentPromotion: false,
    lowMonthlyIncome: false,
    longTenure: false,
    lowYearsWithManager: false,
  });
  const [selectedModel, setSelectedModel] = useState("");
  const [predictionResult, setPredictionResult] = useState(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [topRiskEmployees, setTopRiskEmployees] = useState([]);

  /* ---------------- LOAD FILTER OPTIONS ---------------- */
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/filters")
      .then(res => {
        setFilters(res.data);
        setSelectedDepts([]);
        setSelectedRoles([]);
      })
      .catch(() => console.error("Backend not reachable"));
  }, []);

  /* ---------------- UPDATE JOB ROLES WHEN DEPARTMENTS CHANGE ---------------- */
  const departmentRoleMap = {
  "Research & Development": [
    "Laboratory Technician",
    "Research Scientist",
    "Manufacturing Director",
    "Research Director",
    "Healthcare Representative",
    "Manager"
  ],
  "Sales": [
    "Sales Executive",
    "Sales Representative",
    "Manager"
  ],
  "Human Resources": [
    "Human Resources",
    "Manager"
  ]
};

useEffect(() => {
  if (selectedDepts.length === 0) {
    setSelectedRoles([]);
    return;
  }

  const allowedRoles = selectedDepts.flatMap(
    dept => departmentRoleMap[dept] || []
  );

  setSelectedRoles(prev =>
    prev.filter(role => allowedRoles.includes(role))
  );

  setFilters(prev => ({
    ...prev,
    job_roles: Array.from(new Set(allowedRoles))
  }));
}, [selectedDepts]);


  /* ---------------- FETCH DASHBOARD STATS ---------------- */
useEffect(() => {
  if (
    viewMode === "overview" &&
    (selectedDepts.length > 0 || selectedRoles.length > 0)
  ) {
    axios.post("http://127.0.0.1:8000/stats", {
      departments: selectedDepts,
      job_roles: selectedRoles
    })
    .then(res => setOverviewData(res.data))
    .catch(() => setOverviewData(null));
  } else {
    setOverviewData(null);
  }
}, [viewMode, selectedDepts, selectedRoles]);

  /* ---------------- LOAD EMPLOYEE LIST FROM BACKEND ---------------- */
  useEffect(() => {
    if (viewMode === "profile") {
      axios.get("http://127.0.0.1:8000/employees")
        .then(res => setEmployees(res.data))
        .catch(() => console.error("Failed to load employees"));
    }
  }, [viewMode]);

  /* ---------------- FETCH TOP RISK EMPLOYEES ---------------- */
useEffect(() => {
  axios.get("http://127.0.0.1:8000/top_risk_employees")
    .then(res => {
      setTopRiskEmployees(res.data);
    })
    .catch(() => {
      setTopRiskEmployees([]);
    });
}, []); // 🔴 EMPTY dependency array




  const toggle = (item, list, setList) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">

      {/* -------- SIDEBAR -------- */}
      <aside className="w-72 bg-white border-r p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-black text-indigo-600 flex gap-2 items-center">
            <Activity /> Who’s Next
          </h1>
          <p className="text-sm text-slate-500 mt-1">Attrition Analytics</p>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => setViewMode("overview")}
            className={`w-full px-4 py-3 rounded-xl font-medium flex gap-2 items-center
            ${viewMode === "overview" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100"}`}
          >
            <LayoutDashboard /> Overview
          </button>
          <button
            onClick={() => setViewMode("profile")}
            className={`w-full px-4 py-3 rounded-xl font-medium flex gap-2 items-center
            ${viewMode === "profile" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100"}`}
          >
            <User /> Employee Profile
          </button>
        </div>

        {viewMode === "overview" && (
          <>
            <div className="text-xs font-bold text-slate-400 uppercase flex gap-2 items-center">
              <Filter size={14} /> Filters
            </div>

            <div>
              <h4 className="font-bold mb-2">Departments</h4>
              {filters.departments.map(d => (
                <label key={d} className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDepts.includes(d)}
                    onChange={() => toggle(d, selectedDepts, setSelectedDepts)}
                  />
                  {d}
                </label>
              ))}
              <div className="flex gap-2 mt-4">
                <button className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200" onClick={() => {
  setSelectedDepts(filters.departments);
  setSelectedRoles([]);
}}
>Select All</button>
                <button className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-slate-200" onClick={() => setSelectedDepts([])}>Remove All</button>
              </div>
            </div>

            {selectedDepts.length > 0 && (
              <div>
                <h4 className="font-bold mb-2">Job Roles</h4>
                <div className="max-h-40 overflow-y-auto">
                  {filters.job_roles.map(r => (
                    <label key={r} className="flex gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(r)}
                        onChange={() => toggle(r, selectedRoles, setSelectedRoles)}
                      />
                      {r}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200" onClick={() => setSelectedRoles(filters.job_roles)}>Select All</button>
                  <button className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-slate-200" onClick={() => setSelectedRoles([])}>Remove All</button>
                </div>
              </div>
            )}

          </>
        )}

        {viewMode === "profile" && (
          <>
            <div className="text-xs font-bold text-slate-400 uppercase flex gap-2 items-center">
              <User size={14} /> Employee Profile
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-bold mb-2">Employee Selector</h4>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    placeholder="Enter Employee ID"
                    className="flex-1 p-2 border rounded-lg text-sm"
                  />
                  <button
                    onClick={() => {
                      if (selectedEmployeeId) {
                        axios.get(`http://127.0.0.1:8000/employee/${selectedEmployeeId}`)
                          .then(res => {
                            if (res.data.error) {
                              setEmployeeError("Employee not found. Please check the ID.");
                              setEmployeeDetails(null);
                            } else {
                              setEmployeeDetails(res.data);
                              setEmployeeError("");
                            }
                            setPredictionResult(null);
                          })
                          .catch(() => {
                            setEmployeeError("Employee not found. Please check the ID.");
                            setEmployeeDetails(null);
                            setPredictionResult(null);
                          });
                      } else {
                        setEmployeeDetails(null);
                        setEmployeeError("");
                        setPredictionResult(null);
                      }
                    }}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <Search size={16} />
                  </button>
                </div>
                {employeeError && (
                  <p className="text-sm text-red-600 mt-1">{employeeError}</p>
                )}
                {employeeDetails && (
                  <p className="text-sm text-slate-600 mt-1">{employeeDetails.job_role}</p>
                )}
              </div>

              <div>
                <h4 className="font-bold mb-2">Risk Factor Toggles (What-if Analysis)</h4>
                <div className="space-y-2">
                  {Object.entries(riskFactors).map(([key, value]) => (
                    <label key={key} className="flex gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setRiskFactors(prev => ({ ...prev, [key]: e.target.checked }))}
                      />
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-2">ML Model Selection</h4>
                <div className="space-y-2">
                  {["Logistic Regression", "Random Forest", "Gradient Boosting", "Ensemble"].map(model => (
                    <label key={model} className="flex gap-2 text-sm">
                      <input
                        type="radio"
                        name="model"
                        value={model}
                        checked={selectedModel === model}
                        onChange={(e) => setSelectedModel(e.target.value)}
                      />
                      {model}
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (employeeDetails && selectedModel) {
                    setIsLoadingPrediction(true);
                    axios.post("http://127.0.0.1:8000/predict", {
                      employee_id: employeeDetails.employee_id,
                      model_name: selectedModel.toLowerCase().replace(" ", "_"),
                      what_if: {
                        OverTime: riskFactors.overtime ? "Yes" : "No",
                        JobSatisfaction: riskFactors.lowJobSatisfaction ? 1 : employeeDetails.job_satisfaction,
                        WorkLifeBalance: riskFactors.lowWorkLifeBalance ? 1 : employeeDetails.work_life_balance,
                        MonthlyIncome: riskFactors.lowMonthlyIncome ? 2000 : employeeDetails.monthly_income,
                        YearsAtCompany: riskFactors.longTenure ? 20 : employeeDetails.years_at_company,
                        YearsWithCurrManager: riskFactors.lowYearsWithManager ? 0 : employeeDetails.years_with_manager,
                      }
                    })
                    .then(res => {
                      setPredictionResult({
                        riskPercentage: res.data.risk_probability,
                        riskLabel: res.data.risk_level,
                        modelUsed: res.data.model_used,
                        keyDrivers: res.data.key_drivers,
                        recommendations: res.data.recommendations
                      });
                      setIsLoadingPrediction(false);
                    })
                    .catch(() => {
                      console.error("Prediction failed");
                      setIsLoadingPrediction(false);
                    });
                  }
                }}
                disabled={!employeeDetails || !selectedModel || isLoadingPrediction}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
              >
                {isLoadingPrediction ? "Predicting..." : "Predict Attrition Risk"}
              </button>
            </div>
          </>
        )}
      </aside>

      {/* -------- MAIN -------- */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* -------- OVERVIEW DASHBOARD -------- */}
        {viewMode === "overview" && !overviewData && (
  <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400">
    <div className="text-5xl mb-4">🔍</div>
    <h2 className="text-xl font-semibold">
      Select a filter to view analytics
    </h2>
    <p className="text-sm mt-2 text-slate-500">
      Choose at least one department or job role from the left panel
    </p>
  </div>
)}

        {viewMode === "overview" && overviewData && (

          <>
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              {[
                { label: "Total Employees", value: overviewData.kpis.total_employees, icon: User },
                { label: "Attrition Rate", value: overviewData.kpis.attrition_rate + "%", icon: TrendingUp },
                { label: "Avg Satisfaction", value: `${overviewData.kpis.avg_satisfaction} / 5`, icon: CheckCircle },
                { label: "High Risk Employees", value: overviewData.kpis.high_risk_employees, icon: AlertTriangle },
              ].map((item, i) => {
                const cardColors = [
                  { bg: 'bg-red-50', text: 'text-red-700', label: 'text-red-500' },
                  { bg: 'bg-blue-50', text: 'text-blue-700', label: 'text-blue-500' },
                  { bg: 'bg-green-50', text: 'text-green-700', label: 'text-green-500' },
                  { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'text-yellow-500' },
                ];
                const IconComponent = item.icon;
                return (
                  <div key={i} className={`${cardColors[i].bg} p-6 rounded-2xl shadow border hover:scale-105 hover:shadow-xl transition-all duration-200 cursor-pointer`} title={`${item.label}: ${item.value} - ${item.label === 'Total Employees' ? 'Total number of employees in the selected filters' : item.label === 'Attrition Rate' ? 'Percentage of employees who left the company' : item.label === 'Avg Satisfaction' ? 'Average job satisfaction score out of 5' : 'Number of employees at high risk of attrition'}`}>
                    <div className={`flex items-center gap-2 mb-3`}>
                      <IconComponent className={`text-lg ${cardColors[i].label}`} />
                      <div className={`text-xs ${cardColors[i].label} uppercase font-medium`}>{item.label}</div>
                    </div>
                    <div className={`text-3xl font-black ${cardColors[i].text}`}>{item.value}</div>
                  </div>
                );
              })}
            </div>

            {/* Top Risk Employees Carousel */}
            {Array.isArray(topRiskEmployees) && topRiskEmployees.length > 0 && (

              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4">Top 5 High-Risk Employees</h3>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {topRiskEmployees.map((emp, index) => (
                    <div key={emp.employee_id} className="bg-white p-4 rounded-2xl shadow border min-w-64 flex-shrink-0 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out" title={`Employee ${emp.employee_id}: ${emp.risk_probability}% risk - ${emp.job_role} in ${emp.department}, ${emp.years_at_company} years tenure, $${emp.monthly_income.toLocaleString()} monthly income`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-500">#{index + 1}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          emp.risk_level === 'High' ? 'bg-red-100 text-red-800' :
                          emp.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {emp.risk_level} Risk
                        </span>
                      </div>
                      <div className="text-2xl font-black mb-2" style={{
                        color: emp.risk_probability > 70 ? '#dc2626' : emp.risk_probability > 40 ? '#d97706' : '#16a34a'
                      }}>
                        {emp.risk_probability}%
                      </div>
                      <div className="space-y-1 text-sm">
                        <div><strong>ID:</strong> {emp.employee_id}</div>
                        <div><strong>Department:</strong> {emp.department}</div>
                        <div><strong>Role:</strong> {emp.job_role}</div>
                        <div><strong>Level:</strong> {emp.job_level}</div>
                        <div><strong>Tenure:</strong> {emp.years_at_company} years</div>
                        <div><strong>Income:</strong> ${emp.monthly_income.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CHART GRID */}
            <div className="grid grid-cols-2 gap-6">

              {/* Attrition by Department */}
              <ChartCard title="Attrition by Department">
                <VerticalBar data={overviewData.attrition_by_department} />
              </ChartCard>

              {/* Attrition by Job Role */}
              <ChartCard title="Attrition by Job Role">
                <BarSimple data={overviewData.attrition_by_job_role} />
              </ChartCard>

              {/* Attrition by Job Level */}
              <ChartCard title="Attrition by Job Level">
                <BarSimple data={overviewData.attrition_by_job_level} />
              </ChartCard>

              {/* Attrition by Tenure */}
              <ChartCard title="Attrition by Tenure">
                <BarSimple data={overviewData.attrition_by_tenure} />
              </ChartCard>

              {/* Attrition by Job Satisfaction */}
              <ChartCard title="Attrition by Job Satisfaction">
                <BarSimple data={overviewData.attrition_by_job_satisfaction} />
              </ChartCard>

              {/* Attrition by Overtime */}
              <ChartCard title="Attrition by Overtime">
                <Donut data={overviewData.attrition_by_overtime} />
              </ChartCard>

            </div>
          </>
        )}

        {viewMode === "profile" && (
          <div className="space-y-8">
            {/* Employee Summary Card */}
            {employeeDetails && (
              <div className="bg-white p-6 rounded-2xl shadow border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
                <h3 className="text-lg font-bold mb-4">Employee Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Employee ID</div>
                    <div className="text-lg font-semibold">{employeeDetails.employee_id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Department</div>
                    <div className="text-lg font-semibold">{employeeDetails.department}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Job Role</div>
                    <div className="text-lg font-semibold">{employeeDetails.job_role}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Job Level</div>
                    <div className="text-lg font-semibold">{employeeDetails.job_level}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Years at Company</div>
                    <div className="text-lg font-semibold">{employeeDetails.years_at_company}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Years with Manager</div>
                    <div className="text-lg font-semibold">{employeeDetails.years_with_manager}</div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <div className="text-xs text-slate-500 uppercase">Monthly Income</div>
                    <div className="text-lg font-semibold">${employeeDetails.monthly_income.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Attrition Risk Assessment */}
            {isLoadingPrediction && (
              <div className="bg-white p-6 rounded-2xl shadow border">
                <h3 className="text-lg font-bold mb-4">Attrition Risk Assessment</h3>
                <div className="animate-pulse flex items-center justify-center">
                  <div className="w-48 h-32 bg-slate-200 rounded"></div>
                </div>
              </div>
            )}
            {predictionResult && !isLoadingPrediction && (
              <div className="bg-white p-6 rounded-2xl shadow border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
                <h3 className="text-lg font-bold mb-4">Attrition Risk Assessment</h3>
                <div className="flex flex-col items-center space-y-2">
                  <SemiCircularGauge riskPercentage={predictionResult.riskPercentage} />
                  <div className="text-lg font-semibold">{predictionResult.riskLabel} Risk</div>
                  <div className="text-sm text-slate-500">Model: {predictionResult.modelUsed}</div>
                </div>
              </div>
            )}

            {/* Key Risk Drivers */}
            {isLoadingPrediction && (
              <div className="bg-white p-6 rounded-2xl shadow border">
                <h3 className="text-lg font-bold mb-4">Key Risk Drivers</h3>
                <div className="animate-pulse flex items-center justify-center">
                  <div className="w-full h-64 bg-slate-200 rounded"></div>
                </div>
              </div>
            )}
            {predictionResult && !isLoadingPrediction && predictionResult.keyDrivers && predictionResult.keyDrivers.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
                <h3 className="text-lg font-bold mb-4">Key Risk Drivers</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={predictionResult.keyDrivers}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                    barCategoryGap="20%"
                    barGap={10}
                  >
                    <XAxis dataKey="factor" type="category" angle={-25} textAnchor="end" height={80} />
                    <YAxis type="number" domain={[0, 100]} />
                    <Tooltip
                      formatter={(value, name) => [`${value}%`, 'Contribution']}
                      labelFormatter={(label) => `${label}`}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded shadow">
                              <p className="font-medium">{data.factor}</p>
                              <p>Contribution: {data.contribution}%</p>
                              <p>Impact: {data.impact}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="contribution" radius={[4, 4, 0, 0]}>
                      {predictionResult.keyDrivers.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.impact === 'High' ? '#dc2626' : // Red
                            entry.impact === 'Medium' ? '#f59e0b' : // Orange
                            '#16a34a' // Green
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Improvement Recommendations */}
            {predictionResult && (
              <div className="bg-white p-6 rounded-2xl shadow border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
                <h3 className="text-lg font-bold mb-4">Improvement Recommendations</h3>
                <ul className="space-y-2">
                  {predictionResult.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={16} />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!employeeDetails && (
              <div className="text-center text-slate-400 mt-40">
                Select an employee to view risk analysis.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

/* ---------------- REUSABLE COMPONENTS ---------------- */

const SemiCircularGauge = ({ riskPercentage }) => {
  const radius = 80;
  const strokeWidth = 12;
  const circumference = Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (riskPercentage / 100) * circumference;

  const color = riskPercentage > 70 ? '#dc2626' : riskPercentage > 40 ? '#d97706' : '#16a34a';

  return (
    <svg
  width="220"
  height="140"
  viewBox="0 0 220 140"
  className="mx-auto block"
>
  {/* Background semi-circle */}
  <path
    d={`
      M 30 110
      A 80 80 0 0 1 190 110
    `}
    fill="none"
    stroke="#e2e8f0"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
  />

  {/* Filled semi-circle */}
  <path
    d={`
      M 30 110
      A 80 80 0 0 1 190 110
    `}
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeDasharray={strokeDasharray}
    strokeDashoffset={strokeDashoffset}
  />

  {/* Percentage text inside the semi-circle */}
  <text
    x="110"
    y="110"
    textAnchor="middle"
    dominantBaseline="middle"
    fontSize="24"
    fontWeight="bold"
    fill={color}
  >
    {riskPercentage}%
  </text>
</svg>

  );
};

const ChartCard = ({ title, children }) => (
  <div className="bg-white p-6 rounded-2xl shadow border flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
    <h4 className="font-bold mb-4">{title}</h4>
    <div className="flex-1">
      {children}
    </div>
  </div>
);

const VerticalBar = ({ data }) => (
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data} layout="vertical">
      <XAxis type="number" hide />
      <YAxis dataKey="value" type="category" width={150} />
      <Tooltip />
      <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

const BarSimple = ({ data }) => (
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data}>
      <XAxis dataKey="value" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

const Donut = ({ data }) => (
  <ResponsiveContainer width="100%" height={280}>
    <PieChart>
      <Pie data={data} dataKey="count" nameKey="value" innerRadius={70} outerRadius={100}>
        {data.map((_, i) => (
          <Cell key={i} fill={COLORS[i % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
    </PieChart>
  </ResponsiveContainer>
);

export default App;
