import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import {
  User, LayoutDashboard, Filter, Activity, TrendingUp, AlertTriangle, CheckCircle, XCircle, Search, Menu, X
} from "lucide-react";

/* ---------------- CONFIG ---------------- */
const COLORS = ["#ef4444", "#6366f1", "#10b981", "#f59e0b", "#8b5cf6"];

const hexToRgba = (hex, opacity) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const getChartColor = (entry, index, data, title, opacity = 0.85) => {
  let color;
  if (title && title.includes("Job Satisfaction")) {
    const val = parseInt(entry.value);
    if (val <= 2) color = '#ef4444';
    else if (val >= 4) color = '#10b981';
    else color = '#f59e0b';
  } else if (title && title.includes("Overtime")) {
    color = entry.value === 'Yes' ? '#ef4444' : '#10b981';
  } else {
    const counts = data.map(d => d.count);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const range = max - min;
    if (range === 0) color = '#6366f1';
    else {
      const normalized = (entry.count - min) / range;
      if (normalized > 0.66) color = '#ef4444';
      else if (normalized < 0.33) color = '#10b981';
      else color = '#f59e0b';
    }
  }
  return hexToRgba(color, opacity);
};

/* ---------------- APP ---------------- */
const App = () => {
  const [viewMode, setViewMode] = useState("overview");
  const [filters, setFilters] = useState({ departments: [], job_roles: [] });
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [overviewData, setOverviewData] = useState(null);

  // Profile & Prediction state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [employeeError, setEmployeeError] = useState("");
  const [riskFactors, setRiskFactors] = useState({
    overtime: false, lowJobSatisfaction: false, lowWorkLifeBalance: false,
    noRecentPromotion: false, lowMonthlyIncome: false, longTenure: false, lowYearsWithManager: false,
  });
  const [selectedModel, setSelectedModel] = useState("");
  const [predictionResult, setPredictionResult] = useState(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [topRiskEmployees, setTopRiskEmployees] = useState([]);
  const [isLoadingTopRisk, setIsLoadingTopRisk] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // AI LLM States
  const [apiCredits, setApiCredits] = useState(1500);
  const [recommendations, setRecommendations] = useState(null);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);

  /* ---------------- LOAD API CREDITS ---------------- */
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/credits")
      .then(res => setApiCredits(res.data.remaining))
      .catch(() => console.error("Could not fetch credits"));
  }, []);

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

  const departmentRoleMap = {
    "Research & Development": ["Laboratory Technician", "Research Scientist", "Manufacturing Director", "Research Director", "Healthcare Representative", "Manager"],
    "Sales": ["Sales Executive", "Sales Representative", "Manager"],
    "Human Resources": ["Human Resources", "Manager"]
  };

  useEffect(() => {
    if (selectedDepts.length === 0) {
      setSelectedRoles([]);
      return;
    }
    const allowedRoles = selectedDepts.flatMap(dept => departmentRoleMap[dept] || []);
    setSelectedRoles(prev => prev.filter(role => allowedRoles.includes(role)));
    setFilters(prev => ({ ...prev, job_roles: Array.from(new Set(allowedRoles)) }));
  }, [selectedDepts]);

  /* ---------------- FETCH DASHBOARD STATS ---------------- */
  useEffect(() => {
    if (viewMode === "overview" && (selectedDepts.length > 0 || selectedRoles.length > 0)) {
      axios.post("http://127.0.0.1:8000/stats", {
        departments: selectedDepts,
        job_roles: selectedRoles
      }).then(res => setOverviewData(res.data)).catch(() => setOverviewData(null));
    } else {
      setOverviewData(null);
    }
  }, [viewMode, selectedDepts, selectedRoles]);

  useEffect(() => {
    if (viewMode === "profile") {
      axios.get("http://127.0.0.1:8000/employees")
        .then(res => setEmployees(res.data))
        .catch(() => console.error("Failed to load employees"));
    }
  }, [viewMode]);

  useEffect(() => {
    setIsLoadingTopRisk(true);
    axios.get("http://127.0.0.1:8000/top_risk_employees")
      .then(res => { setTopRiskEmployees(res.data); setIsLoadingTopRisk(false); })
      .catch(() => { setTopRiskEmployees([]); setIsLoadingTopRisk(false); });
  }, []);

  const toggle = (item, list, setList) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="flex bg-slate-50 text-slate-900 h-screen overflow-hidden">
      {/* -------- SIDEBAR -------- */}
      {sidebarVisible && (
        <aside className="w-64 bg-white border-r p-4 space-y-6 overflow-y-auto">
          <div>
            <h1 className="text-2xl font-black text-indigo-600 flex gap-2 items-center">
              <Activity /> Who's Next
            </h1>
            <p className="text-sm text-slate-500 mt-1">Attrition Analytics</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setViewMode("overview")}
              className={`w-full px-4 py-2 rounded-xl font-medium flex gap-2 items-center ${viewMode === "overview" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100"}`}
            ><LayoutDashboard /> Overview</button>
            <button
              onClick={() => setViewMode("profile")}
              className={`w-full px-4 py-2 rounded-xl font-medium flex gap-2 items-center ${viewMode === "profile" ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100"}`}
            ><User /> Employee Profile</button>
          </div>

          {viewMode === "overview" && (
            <>
              <div className="text-xs font-bold text-slate-400 uppercase flex gap-2 items-center"><Filter size={12} /> Filters</div>
              <div>
                <h4 className="font-bold mb-2">Departments</h4>
                {filters.departments.map(d => (
                  <label key={d} className="flex gap-2 text-xs">
                    <input type="checkbox" checked={selectedDepts.includes(d)} onChange={() => toggle(d, selectedDepts, setSelectedDepts)} />
                    {d}
                  </label>
                ))}
                <div className="flex gap-2 mt-4">
                  <button className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200" onClick={() => { setSelectedDepts(filters.departments); setSelectedRoles([]); }}>Select All</button>
                  <button className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-slate-200" onClick={() => setSelectedDepts([])}>Remove All</button>
                </div>
              </div>

              {selectedDepts.length > 0 && (
                <div>
                  <h4 className="font-bold mb-2">Job Roles</h4>
                  <div className="max-h-40 overflow-y-auto">
                    {filters.job_roles.map(r => (
                      <label key={r} className="flex gap-2 text-xs">
                        <input type="checkbox" checked={selectedRoles.includes(r)} onChange={() => toggle(r, selectedRoles, setSelectedRoles)} />
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
              <div className="text-xs font-bold text-slate-400 uppercase flex gap-2 items-center"><User size={14} /> Employee Profile</div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold mb-2">Employee Selector</h4>
                  <div className="flex gap-1">
                    <input type="text" value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} placeholder="Enter ID" className="flex-1 p-2 border rounded-lg text-sm" />
                    <button onClick={() => {
                      if (selectedEmployeeId) {
                        axios.get(`http://127.0.0.1:8000/employee/${selectedEmployeeId}`)
                          .then(res => {
                            if (res.data.error) { setEmployeeError("Not found."); setEmployeeDetails(null); } 
                            else { setEmployeeDetails(res.data); setEmployeeError(""); }
                            setPredictionResult(null); setRecommendations(null);
                          }).catch(() => { setEmployeeError("Not found."); setEmployeeDetails(null); setPredictionResult(null); });
                      } else { setEmployeeDetails(null); setEmployeeError(""); setPredictionResult(null); }
                    }} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Search size={16} /></button>
                  </div>
                  {employeeError && <p className="text-sm text-red-600 mt-1">{employeeError}</p>}
                  {employeeDetails && <p className="text-sm text-slate-600 mt-1">{employeeDetails.job_role}</p>}
                </div>

                <div>
                  <h4 className="font-bold mb-2">Risk Factor Toggles</h4>
                  <div className="space-y-2">
                    {Object.entries(riskFactors).map(([key, value]) => (
                      <label key={key} className="flex gap-2 text-sm">
                        <input type="checkbox" checked={value} onChange={(e) => setRiskFactors(prev => ({ ...prev, [key]: e.target.checked }))} />
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
                        <input type="radio" name="model" value={model} checked={selectedModel === model} onChange={(e) => setSelectedModel(e.target.value)} />
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
                      }).then(res => {
                        setPredictionResult({
                          riskPercentage: res.data.risk_probability,
                          riskLabel: res.data.risk_level,
                          modelUsed: res.data.model_used,
                          keyDrivers: res.data.key_drivers,
                          modelMetrics: res.data.model_metrics
                        });
                        setRecommendations(null); // Clear previous AI recs!
                        setIsLoadingPrediction(false);
                      }).catch(() => setIsLoadingPrediction(false));
                    }
                  }}
                  disabled={!employeeDetails || !selectedModel || isLoadingPrediction}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                >{isLoadingPrediction ? "Predicting..." : "Predict Attrition Risk"}</button>
              </div>
            </>
          )}
        </aside>
      )}

      {/* -------- MAIN -------- */}
      <main className={`flex-1 p-4 overflow-y-auto ${sidebarVisible ? '' : 'ml-0'}`}>
        <button onClick={() => setSidebarVisible(!sidebarVisible)} className="mb-4 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          {sidebarVisible ? <X size={20} /> : <Menu size={20} />}
        </button>

        {viewMode === "overview" && !overviewData && (
          <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400">
            <div className="text-5xl mb-4">✨</div>
            <h2 className="text-xl font-semibold">Select a filter to view analytics</h2>
            <p className="text-sm mt-2 text-slate-500">Choose at least one department or job role from the left panel</p>
          </div>
        )}

        {viewMode === "overview" && overviewData && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3 mb-12">
              <hr className="border-slate-200 col-span-4 -mb-4" />
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
                  <div key={i} className={`${cardColors[i].bg} p-4 rounded-2xl shadow border hover:scale-105 hover:shadow-xl transition-all duration-200 cursor-pointer`}>
                    <div className={`flex items-center gap-2 mb-3`}>
                      <IconComponent className={`text-lg ${cardColors[i].label}`} />
                      <div className={`text-xs ${cardColors[i].label} uppercase font-medium`}>{item.label}</div>
                    </div>
                    <div className={`text-3xl font-black ${cardColors[i].text}`}>{item.value}</div>
                  </div>
                );
              })}
            </div>

            {/* Top Risk Employees */}
            {(isLoadingTopRisk || (Array.isArray(topRiskEmployees) && topRiskEmployees.length > 0)) && (
              <div className="mb-12">
                <h3 className="text-lg font-bold mb-4">Top 5 High-Risk Employees</h3>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-4">
                  {isLoadingTopRisk ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="bg-slate-200 p-3 rounded-2xl shadow border min-w-44 flex-shrink-0 animate-pulse">
                        <div className="flex items-center justify-between mb-2"><div className="w-6 h-4 bg-slate-300 rounded"></div><div className="w-16 h-5 bg-slate-300 rounded"></div></div>
                        <div className="w-12 h-8 bg-slate-300 rounded mb-2"></div>
                        <div className="space-y-1"><div className="w-full h-3 bg-slate-300 rounded"></div></div>
                      </div>
                    ))
                  ) : (
                    topRiskEmployees.map((emp, index) => (
                      <div key={emp.employee_id} className="bg-white p-3 rounded-2xl shadow border min-w-44 flex-shrink-0 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-500">#{index + 1}</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${emp.risk_level === 'High' ? 'bg-red-100 text-red-800' : emp.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{emp.risk_level} Risk</span>
                        </div>
                        <div className="text-2xl font-black mb-2" style={{ color: emp.risk_probability > 70 ? '#dc2626' : emp.risk_probability > 40 ? '#d97706' : '#16a34a' }}>{emp.risk_probability}%</div>
                        <div className="space-y-0.5 text-xs">
                          <div><strong>ID:</strong> {emp.employee_id}</div>
                          <div><strong>Dept:</strong> {emp.department}</div>
                          <div><strong>Role:</strong> {emp.job_role}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <ChartCard title="Attrition by Department"><VerticalBar data={overviewData.attrition_by_department} /></ChartCard>
              <ChartCard title="Attrition by Job Role"><BarSimple data={overviewData.attrition_by_job_role} /></ChartCard>
              <ChartCard title="Attrition by Job Level"><BarSimple data={overviewData.attrition_by_job_level} /></ChartCard>
              <ChartCard title="Attrition by Tenure"><BarSimple data={overviewData.attrition_by_tenure} /></ChartCard>
              <ChartCard title="Attrition by Job Satisfaction"><BarSimple data={overviewData.attrition_by_job_satisfaction} /></ChartCard>
              <ChartCard title="Attrition by Overtime"><Donut data={overviewData.attrition_by_overtime} /></ChartCard>
            </div>
          </>
        )}

        {viewMode === "profile" && (
          <div className="space-y-8">
            {employeeDetails && (
              <div className="bg-white p-6 rounded-2xl shadow border hover:shadow-md hover:-translate-y-0.5 transition-all">
                <h3 className="text-lg font-bold mb-4">Employee Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><div className="text-xs text-slate-500 uppercase">Employee ID</div><div className="text-lg font-semibold">{employeeDetails.employee_id}</div></div>
                  <div><div className="text-xs text-slate-500 uppercase">Department</div><div className="text-lg font-semibold">{employeeDetails.department}</div></div>
                  <div><div className="text-xs text-slate-500 uppercase">Job Role</div><div className="text-lg font-semibold">{employeeDetails.job_role}</div></div>
                  <div><div className="text-xs text-slate-500 uppercase">Years at Company</div><div className="text-lg font-semibold">{employeeDetails.years_at_company}</div></div>
                  <div><div className="text-xs text-slate-500 uppercase">Monthly Income</div><div className="text-lg font-semibold">${employeeDetails.monthly_income.toLocaleString()}</div></div>
                </div>
              </div>
            )}

            {predictionResult && !isLoadingPrediction && (
              <div className="bg-white p-6 rounded-2xl shadow border hover:shadow-md hover:-translate-y-0.5 transition-all">
                <h3 className="text-lg font-bold mb-4">Attrition Risk Assessment</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  <div className="md:col-span-2 flex flex-col items-center space-y-2">
                    <SemiCircularGauge riskPercentage={predictionResult.riskPercentage} />
                    <div className="text-lg font-semibold">{predictionResult.riskLabel} Risk</div>
                    <div className="text-sm text-slate-500">Model: {predictionResult.modelUsed}</div>
                  </div>
                  <div className="md:col-span-3 space-y-4">
                    {/* Model Metrics */}
                    {predictionResult.modelMetrics && (
                      <div>
                        <div className="text-sm font-medium text-slate-700 mb-2">Model Reliability</div>
                        <div className="space-y-2">
                          <MetricBar label="Accuracy" value={predictionResult.modelMetrics.accuracy} />
                          <MetricBar label="Recall" value={predictionResult.modelMetrics.recall} />
                          <MetricBar label="AUC" value={predictionResult.modelMetrics.auc} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {predictionResult && !isLoadingPrediction && predictionResult.keyDrivers && (
              <div className="bg-white p-6 rounded-2xl shadow border hover:shadow-md hover:-translate-y-0.5 transition-all">
                <h3 className="text-lg font-bold mb-4">Key Risk Drivers</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={predictionResult.keyDrivers} margin={{ top: 20, right: 30, left: 20, bottom: 40 }} barCategoryGap="20%">
                    <XAxis dataKey="factor" type="category" angle={-25} textAnchor="end" height={80} />
                    <YAxis type="number" domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="contribution" radius={[4, 4, 0, 0]}>
                      {predictionResult.keyDrivers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.impact === 'High' ? '#dc2626' : entry.impact === 'Medium' ? '#f59e0b' : '#16a34a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* AI Recommendations Panel */}
            {predictionResult && (
              <div className="bg-white p-6 rounded-2xl shadow border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">AI Improvement Recommendations</h3>
                  
                  <div className="flex items-center gap-4">
                    {/* NEW CREDIT COUNTER BADGE */}
                    <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                      ✨ {apiCredits} Credits Left
                    </div>

                    {!recommendations && (
                      <button
                        onClick={() => {
                          setIsLoadingRecs(true);
                          axios.post("http://127.0.0.1:8000/generate_recommendations", {
                            employee_id: employeeDetails.employee_id,
                            risk_probability: predictionResult.riskPercentage,
                            risk_level: predictionResult.riskLabel,
                            key_drivers: predictionResult.keyDrivers
                          }).then(res => {
                            setRecommendations(res.data.recommendations);
                            setApiCredits(res.data.credits_remaining);
                            setIsLoadingRecs(false);
                          }).catch(() => setIsLoadingRecs(false));
                        }}
                        disabled={isLoadingRecs || apiCredits <= 0}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-slate-300 transition-colors flex items-center gap-2"
                      >
                        {isLoadingRecs ? "Generating..." : "✨ Generate Actions"}
                      </button>
                    )}
                  </div>
                </div>
                
                {isLoadingRecs && (
                   <div className="animate-pulse flex space-x-4">
                     <div className="flex-1 space-y-3 py-1">
                       <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                       <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                       <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                     </div>
                   </div>
                )}

                {recommendations && (
                  <ul className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="text-indigo-600 mt-0.5 flex-shrink-0" size={18} />
                        <span className="text-slate-700 leading-relaxed">{rec}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {!recommendations && !isLoadingRecs && (
                  <p className="text-sm text-slate-500 border-l-4 border-indigo-200 pl-4 py-2">
                    Deterministic ML prediction complete. Click the button above to synthesize these risk drivers into actionable HR strategies using Gemini.
                  </p>
                )}
              </div>
            )}

            {!employeeDetails && <div className="text-center text-slate-400 mt-40">Select an employee to view risk analysis.</div>}
          </div>
        )}
      </main>
    </div>
  );
};

/* ---------------- REUSABLE COMPONENTS ---------------- */

const MetricBar = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-slate-600 w-16">{label}</span>
    <div className="flex-1 bg-slate-200 rounded-full h-2">
      <div className={`h-2 rounded-full ${value >= 0.8 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${value * 100}%` }}></div>
    </div>
    <span className={`text-xs font-medium ${value >= 0.8 ? 'text-green-600' : 'text-yellow-600'}`}>
      {label === "AUC" ? value.toFixed(2) : Math.round(value * 100) + "%"}
    </span>
  </div>
);

const SemiCircularGauge = ({ riskPercentage }) => {
  const radius = 80;
  const strokeDasharray = Math.PI * radius;
  const strokeDashoffset = strokeDasharray - (riskPercentage / 100) * strokeDasharray;
  const color = riskPercentage > 70 ? '#dc2626' : riskPercentage > 40 ? '#d97706' : '#16a34a';

  return (
    <svg width="220" height="140" viewBox="0 0 220 140" className="mx-auto block">
      <path d="M 30 110 A 80 80 0 0 1 190 110" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
      <path d="M 30 110 A 80 80 0 0 1 190 110" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
      <text x="110" y="110" textAnchor="middle" dominantBaseline="middle" fontSize="24" fontWeight="bold" fill={color}>{riskPercentage}%</text>
    </svg>
  );
};

const ChartCard = ({ title, children }) => (
  <div className="bg-white p-6 rounded-2xl shadow border-slate-200 flex flex-col">
    <h4 className="text-base font-semibold mb-4">{title}</h4>
    <div className="flex-1">{React.cloneElement(children, { title })}</div>
  </div>
);

const VerticalBar = ({ data, title }) => (
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data} layout="vertical"><XAxis type="number" hide /><YAxis dataKey="value" type="category" width={150} /><Tooltip /><Bar dataKey="count" radius={[0, 6, 6, 0]}>{data.map((e, i) => <Cell key={i} fill={getChartColor(e, i, data, title)} />)}</Bar></BarChart>
  </ResponsiveContainer>
);

const BarSimple = ({ data, title }) => (
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data}><XAxis dataKey="value" /><YAxis /><Tooltip /><Bar dataKey="count" radius={[6, 6, 0, 0]}>{data.map((e, i) => <Cell key={i} fill={getChartColor(e, i, data, title)} />)}</Bar></BarChart>
  </ResponsiveContainer>
);

const Donut = ({ data, title }) => (
  <ResponsiveContainer width="100%" height={280}>
    <PieChart><Pie data={data} dataKey="count" nameKey="value" innerRadius={70} outerRadius={100}>{data.map((e, i) => <Cell key={i} fill={getChartColor(e, i, data, title)} />)}</Pie><Tooltip /></PieChart>
  </ResponsiveContainer>
);

export default App;