import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import {
  User, LayoutDashboard, Filter, Activity, TrendingUp, AlertTriangle, CheckCircle, XCircle
} from "lucide-react";

/* ---------------- CONFIG ---------------- */
const COLORS = ["#ef4444", "#6366f1", "#10b981", "#f59e0b", "#8b5cf6"];

/* ---------------- MOCK DATA FOR PROFILE ---------------- */
const MOCK_EMPLOYEES = [
  { id: "EMP001", name: "John Doe", department: "Sales", jobRole: "Sales Executive", jobLevel: 2, yearsAtCompany: 3, yearsWithManager: 2, monthlyIncome: 5000 },
  { id: "EMP002", name: "Jane Smith", department: "Research & Development", jobRole: "Research Scientist", jobLevel: 3, yearsAtCompany: 5, yearsWithManager: 3, monthlyIncome: 7000 },
  { id: "EMP003", name: "Bob Johnson", department: "Human Resources", jobRole: "Human Resources", jobLevel: 1, yearsAtCompany: 2, yearsWithManager: 1, monthlyIncome: 4000 },
];

const MOCK_PREDICTION = {
  riskPercentage: 72,
  riskLabel: "High",
  modelUsed: "Random Forest",
  keyDrivers: [
    { factor: "Frequent Overtime", impact: "High" },
    { factor: "Low Job Satisfaction", impact: "Medium" },
    { factor: "Low Work-Life Balance", impact: "High" },
    { factor: "No Recent Promotion", impact: "Medium" },
  ],
  recommendations: [
    "Reduce overtime hours to improve work-life balance",
    "Schedule a performance discussion to address job satisfaction",
    "Offer training or role rotation opportunities",
    "Consider salary review or promotion in the next cycle",
  ],
};

/* ---------------- APP ---------------- */
const App = () => {
  const [viewMode, setViewMode] = useState("overview");
  const [filters, setFilters] = useState({ departments: [], job_roles: [] });
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [overviewData, setOverviewData] = useState(null);

  // Profile state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [riskFactors, setRiskFactors] = useState({
    overtime: false,
    lowJobSatisfaction: false,
    lowWorkLifeBalance: false,
    noRecentPromotion: false,
  });
  const [selectedModel, setSelectedModel] = useState("");
  const [predictionResult, setPredictionResult] = useState(null);

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
  useEffect(() => {
    if (selectedDepts.length > 0) {
      axios.get("http://127.0.0.1:8000/filters", { params: { departments: selectedDepts.join(',') } })
        .then(res => {
          setFilters(prev => ({ ...prev, job_roles: res.data.job_roles }));
          setSelectedRoles(prev => prev.filter(role => res.data.job_roles.includes(role)));
        })
        .catch(() => console.error("Failed to update job roles"));
    } else {
      setFilters(prev => ({ ...prev, job_roles: [] }));
      setSelectedRoles([]);
    }

  }, [selectedDepts]);

  /* ---------------- FETCH DASHBOARD STATS ---------------- */
  useEffect(() => {
    if (viewMode === "overview" && selectedDepts.length > 0) {
      axios.post("http://127.0.0.1:8000/stats", {
        departments: selectedDepts,
        job_roles: selectedRoles
      })
        .then(res => setOverviewData(res.data))
        .catch(() => console.error("Stats fetch failed"));
    }
  }, [viewMode, selectedDepts, selectedRoles]);



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
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => {
                    setSelectedEmployeeId(e.target.value);
                    const emp = MOCK_EMPLOYEES.find(emp => emp.id === e.target.value);
                    setSelectedEmployee(emp || null);
                    setPredictionResult(null);
                  }}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select Employee</option>
                  {MOCK_EMPLOYEES.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.id} - {emp.name}</option>
                  ))}
                </select>
                {selectedEmployee && (
                  <p className="text-sm text-slate-600 mt-1">{selectedEmployee.name}</p>
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
                  if (selectedEmployee && selectedModel) {
                    setPredictionResult(MOCK_PREDICTION);
                  }
                }}
                disabled={!selectedEmployee || !selectedModel}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
              >
                Predict Attrition Risk
              </button>
            </div>
          </>
        )}
      </aside>

      {/* -------- MAIN -------- */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* -------- OVERVIEW DASHBOARD -------- */}
        {viewMode === "overview" && selectedDepts.length > 0 && overviewData && (

          <>
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              {[
                ["Total Employees", overviewData.kpis.total_employees],
                ["Attrition Rate", overviewData.kpis.attrition_rate + "%"],
                ["Avg Satisfaction", overviewData.kpis.avg_satisfaction],
                ["High Risk Employees", overviewData.kpis.high_risk_employees],
              ].map(([l, v], i) => {
                const cardColors = [
                  { bg: 'bg-red-50', text: 'text-red-700', label: 'text-red-500' },
                  { bg: 'bg-blue-50', text: 'text-blue-700', label: 'text-blue-500' },
                  { bg: 'bg-green-50', text: 'text-green-700', label: 'text-green-500' },
                  { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'text-yellow-500' },
                ];
                return (
                  <div key={i} className={`${cardColors[i].bg} p-6 rounded-2xl shadow border hover:scale-105 hover:shadow-xl transition-all duration-200 cursor-pointer`}>
                    <div className={`text-xs ${cardColors[i].label} uppercase`}>{l}</div>
                    <div className={`text-3xl font-black mt-2 ${cardColors[i].text}`}>{v}</div>
                  </div>
                );
              })}
            </div>


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
            {selectedEmployee && (
              <div className="bg-white p-6 rounded-2xl shadow border">
                <h3 className="text-lg font-bold mb-4">Employee Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Employee ID</div>
                    <div className="text-lg font-semibold">{selectedEmployee.id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Department</div>
                    <div className="text-lg font-semibold">{selectedEmployee.department}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Job Role</div>
                    <div className="text-lg font-semibold">{selectedEmployee.jobRole}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Job Level</div>
                    <div className="text-lg font-semibold">{selectedEmployee.jobLevel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Years at Company</div>
                    <div className="text-lg font-semibold">{selectedEmployee.yearsAtCompany}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Years with Manager</div>
                    <div className="text-lg font-semibold">{selectedEmployee.yearsWithManager}</div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <div className="text-xs text-slate-500 uppercase">Monthly Income</div>
                    <div className="text-lg font-semibold">${selectedEmployee.monthlyIncome.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Attrition Risk Result */}
            {predictionResult && (
              <div className="bg-white p-6 rounded-2xl shadow border">
                <h3 className="text-lg font-bold mb-4">Attrition Risk Assessment</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-6xl font-black mb-2" style={{
                      color: predictionResult.riskPercentage > 70 ? '#dc2626' : predictionResult.riskPercentage > 40 ? '#d97706' : '#16a34a'
                    }}>
                      {predictionResult.riskPercentage}%
                    </div>
                    <div className="text-lg font-semibold mb-1">{predictionResult.riskLabel} Risk</div>
                    <div className="text-sm text-slate-500">Model: {predictionResult.modelUsed}</div>
                  </div>
                  <div className="text-8xl">
                    {predictionResult.riskPercentage > 70 ? <XCircle className="text-red-600" /> :
                      predictionResult.riskPercentage > 40 ? <AlertTriangle className="text-yellow-600" /> :
                        <CheckCircle className="text-green-600" />}
                  </div>
                </div>
              </div>
            )}

            {/* Key Risk Drivers */}
            {predictionResult && (
              <div className="bg-white p-6 rounded-2xl shadow border">
                <h3 className="text-lg font-bold mb-4">Key Risk Drivers</h3>
                <div className="space-y-3">
                  {predictionResult.keyDrivers.map((driver, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium">{driver.factor}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${driver.impact === 'High' ? 'bg-red-100 text-red-800' :
                        driver.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                        {driver.impact} Impact
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvement Recommendations */}
            {predictionResult && (
              <div className="bg-white p-6 rounded-2xl shadow border">
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

            {!selectedEmployee && (
              <div className="text-center text-slate-400 mt-40">
                Please select an employee from the sidebar to view their profile.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

/* ---------------- REUSABLE COMPONENTS ---------------- */

const ChartCard = ({ title, children }) => (
  <div className="bg-white p-6 rounded-2xl shadow border flex flex-col">
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
