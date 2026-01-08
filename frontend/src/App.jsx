import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, Legend, CartesianGrid
} from 'recharts';
import { 
  User, Activity, Search, LayoutDashboard, Settings, 
  AlertTriangle, CheckCircle, Filter, RotateCcw, Printer, ArrowLeft, BarChart2
} from 'lucide-react';

// --- CONFIGURATION: DEPARTMENT RELATIONS ---
const DEPT_ROLE_MAP = {
  'Human Resources': ['Human Resources', 'Manager'], 
  'Research & Development': ['Research Scientist', 'Laboratory Technician', 'Manufacturing Director', 'Healthcare Representative', 'Research Director', 'Manager'], 
  'Sales': ['Sales Executive', 'Manager', 'Sales Representative']
};

// --- CONFIGURATION: SCATTER PLOT OPTIONS ---
const NUMERIC_FEATURES = [
  { label: "Age", key: "Age" },
  { label: "Monthly Income", key: "MonthlyIncome" },
  { label: "Years at Company", key: "YearsAtCompany" },
  { label: "Total Working Years", key: "TotalWorkingYears" },
  { label: "Distance From Home", key: "DistanceFromHome" },
    { label: "Percent Salary Hike", key: "PercentSalaryHike" },
    { label: "Years in Current Role", key: "YearsInCurrentRole" },
    { label: "Years Since Promotion", key: "YearsSinceLastPromotion" }
];

const App = () => {
  // --- STATE ---
  const [viewMode, setViewMode] = useState('profile'); 
  const [selectedModel, setSelectedModel] = useState('Logistic Regression');
  const [loading, setLoading] = useState(false);
  
  // Search & Profile State
  const [searchId, setSearchId] = useState('');
  const [searchError, setSearchError] = useState('');
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    Age: 30, Department: "Research & Development", MonthlyIncome: 6500, OverTime: "No",
    JobSatisfaction: 3, EnvironmentSatisfaction: 3, JobInvolvement: 3, PerformanceRating: 3,
    TotalWorkingYears: 8, YearsAtCompany: 5, YearsInCurrentRole: 2, DistanceFromHome: 10,
    NumCompaniesWorked: 1, Education: 3, WorkLifeBalance: 3
  });

  // Overview & Filter State
  const [filterOptions, setFilterOptions] = useState({ departments: [], roles: [] });
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [visibleRoles, setVisibleRoles] = useState([]); 
  const [overviewData, setOverviewData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  
  // Scatter Plot Axes
  const [xAxis, setXAxis] = useState("YearsAtCompany");
  const [yAxis, setYAxis] = useState("MonthlyIncome");

  // --- INITIAL LOAD ---
  useEffect(() => {
    const fetchOptions = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/init');
            setFilterOptions(res.data);
            const allDepts = res.data.departments;
            setSelectedDepts(allDepts);
            setSelectedRoles(res.data.roles);
        } catch (e) { console.error("Backend offline"); }
    };
    fetchOptions();
  }, []);

  // --- CASCADING FILTER LOGIC ---
  useEffect(() => {
    const newVisibleRoles = new Set();
    selectedDepts.forEach(dept => {
        const roles = DEPT_ROLE_MAP[dept] || [];
        roles.forEach(r => newVisibleRoles.add(r));
    });
    const roleList = Array.from(newVisibleRoles).sort();
    setVisibleRoles(roleList);
    setSelectedRoles(prev => prev.filter(r => newVisibleRoles.has(r)));
  }, [selectedDepts]); 

  // --- FETCH STATS ---
  useEffect(() => {
    if (viewMode === 'overview' && selectedDepts.length > 0) {
        fetchStats();
    }
  }, [viewMode, selectedDepts, selectedRoles, xAxis, yAxis]);

  const fetchStats = async () => {
      try {
          const res = await axios.post('http://127.0.0.1:8000/stats', {
              departments: selectedDepts,
              job_roles: selectedRoles,
              x_axis: xAxis, 
              y_axis: yAxis
          });
          setOverviewData(res.data);
      } catch (e) { console.error("Error fetching stats"); }
  };

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    const isNum = ['Age', 'MonthlyIncome', 'JobSatisfaction', 'EnvironmentSatisfaction', 'JobInvolvement', 'PerformanceRating', 'TotalWorkingYears', 'YearsAtCompany', 'YearsInCurrentRole', 'DistanceFromHome', 'NumCompaniesWorked', 'Education', 'WorkLifeBalance'].includes(name);
    setFormData({ ...formData, [name]: isNum ? parseInt(value) || 0 : value });
  };

  const handleSearch = async () => {
    if (!searchId) return;
    setLoading(true); setSearchError(''); setResult(null); 
    try {
        const res = await axios.get(`http://127.0.0.1:8000/employee/${searchId}`);
        setFormData({ ...formData, ...res.data });
    } catch (e) { setSearchError("ID not found"); }
    setLoading(false);
  };

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`http://127.0.0.1:8000/predict/${selectedModel}`, formData);
      setResult(res.data);
    } catch (e) { alert("Prediction failed. Is backend running?"); }
    setLoading(false);
  };

  const handleReset = () => {
      setFormData({
        Age: 30, Department: "Research & Development", MonthlyIncome: 6500, OverTime: "No",
        JobSatisfaction: 3, EnvironmentSatisfaction: 3, JobInvolvement: 3, PerformanceRating: 3,
        TotalWorkingYears: 8, YearsAtCompany: 5, YearsInCurrentRole: 2, DistanceFromHome: 10,
        NumCompaniesWorked: 1, Education: 3, WorkLifeBalance: 3
      });
      setResult(null); setSearchId(''); setSearchError('');
  };

  const handlePrint = () => { window.print(); };

  const toggleFilter = (item, list, setList) => {
      if (list.includes(item)) {
          setList(list.filter(i => i !== item));
      } else {
          setList([...list, item]);
      }
  };

  // --- DATA PREP FOR CHARTS ---
  const radarData = [
    { subject: 'Job Sat.', A: formData.JobSatisfaction, fullMark: 4 },
    { subject: 'Env Sat.', A: formData.EnvironmentSatisfaction, fullMark: 4 },
    { subject: 'Involvement', A: formData.JobInvolvement, fullMark: 4 },
    { subject: 'Performance', A: formData.PerformanceRating, fullMark: 4 },
  ];

  // Split Scatter Data into two groups for cleaner Legend/Colors
  const scatterActive = overviewData?.scatter_chart.filter(d => d.attrition === 'No') || [];
  const scatterLeft = overviewData?.scatter_chart.filter(d => d.attrition === 'Yes') || [];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden text-base">
      
      {/* --- SIDEBAR --- */}
         <aside
         className={`bg-white border-r border-slate-200 flex flex-col shadow-sm h-full z-20 transition-all duration-300 ease-in-out ${
    sidebarOpen ? "w-80" : "w-0 overflow-hidden"
     }`}
>

        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 text-indigo-600">
            <Activity size={32} />
            <h1 className="text-2xl font-bold tracking-tight">Who's Next</h1>
          </div>
          <p className="text-sm text-slate-500 mt-2 font-medium">Attrition Prediction System</p>
        </div>

        <nav className="p-5 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
            {/* View Selector */}
            <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Dashboard Mode</div>
                <div className="space-y-3">
                    <button onClick={() => setViewMode('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${viewMode === 'profile' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <User size={20}/> Employee Profile
                    </button>
                    <button onClick={() => setViewMode('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${viewMode === 'overview' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <LayoutDashboard size={20}/> Company Overview
                    </button>
                </div>
            </div>

            {/* DYNAMIC FILTERS */}
            {viewMode === 'overview' && (
                <div className="animate-fade-in">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2 flex items-center gap-2">
                        <Filter size={14}/> Data Filters
                    </div>
                    
                    {/* Dept Filter */}
                    <div className="mb-6">
                        <h4 className="text-sm font-bold px-2 mb-2 text-slate-800">Departments</h4>
                        <div className="space-y-2 px-2">
                            {filterOptions.departments.map(d => (
                                <label key={d} className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                                    <input type="checkbox" checked={selectedDepts.includes(d)} onChange={() => toggleFilter(d, selectedDepts, setSelectedDepts)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"/>
                                    <span className="truncate font-medium">{d}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Role Filter */}
                    <div>
                        <h4 className="text-sm font-bold px-2 mb-2 text-slate-800">Job Roles</h4>
                        {visibleRoles.length === 0 ? (
                             <div className="text-sm text-slate-400 italic px-2 py-2 bg-slate-50 rounded border border-dashed border-slate-200">Select a Department above</div>
                        ) : (
                            <div className="max-h-64 overflow-y-auto space-y-2 px-2 custom-scrollbar">
                                {visibleRoles.map(r => (
                                    <label key={r} className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                                        <input type="checkbox" checked={selectedRoles.includes(r)} onChange={() => toggleFilter(r, selectedRoles, setSelectedRoles)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"/>
                                        <span className="truncate font-medium">{r}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Prediction Model */}
            {viewMode === 'profile' && (
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Prediction Model</div>
                    <div className="space-y-3 px-2">
                        {['Logistic Regression', 'Random Forest', 'Gradient Boosting', 'Ensemble (All Models)'].map((model) => (
                            <label key={model} className="flex items-center gap-3 cursor-pointer group p-1">
                                <input type="radio" name="model_selector" value={model} checked={selectedModel === model} onChange={(e) => setSelectedModel(e.target.value)} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 bg-slate-100"/>
                                <span className={`text-sm font-medium transition-colors ${selectedModel === model ? 'text-indigo-700' : 'text-slate-600 group-hover:text-slate-900'}`}>{model}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
      <div className="flex justify-end mb-4">
  <button
    onClick={() => setSidebarOpen(!sidebarOpen)}
    className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-100 transition"
  >
    {sidebarOpen ? "Hide Filters" : "Show Filters"}
  </button>
</div>
        
        {viewMode === 'profile' ? (
            <div className="grid grid-cols-12 gap-8 h-full">
                {/* Search & Inputs */}
                <div className="col-span-4 flex flex-col gap-6">
                    <div className="bg-indigo-900 p-6 rounded-2xl shadow-lg text-white no-print">
                        <div className="flex gap-3">
                            <input type="number" placeholder="Enter Employee ID..." className="w-full p-3 rounded-xl text-slate-900 outline-none font-mono text-lg font-medium" value={searchId} onChange={(e) => setSearchId(e.target.value)}/>
                            <button onClick={handleSearch} disabled={loading} className="bg-indigo-500 hover:bg-indigo-400 p-3 rounded-xl transition-colors shadow-lg"><Search size={22} /></button>
                        </div>
                        {searchError && <div className="text-red-300 text-sm mt-3 font-medium bg-red-900/30 p-2 rounded-lg flex items-center gap-2"><AlertTriangle size={14}/> {searchError}</div>}
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-1 overflow-y-auto no-print">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg"><Settings size={20} className="text-slate-400"/> Edit Factors</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Department</label>
                                <select name="Department" value={formData.Department} onChange={handleChange} className="w-full mt-2 p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option>Sales</option><option>Research & Development</option><option>Human Resources</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Income ($)</label><input type="number" name="MonthlyIncome" value={formData.MonthlyIncome} onChange={handleChange} className="w-full mt-2 p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"/></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Overtime</label><select name="OverTime" value={formData.OverTime} onChange={handleChange} className="w-full mt-2 p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"><option>No</option><option>Yes</option></select></div>
                            </div>
                            {[{ l: "Job Satisfaction", k: "JobSatisfaction" }, { l: "Environment Sat.", k: "EnvironmentSatisfaction" }, { l: "Job Involvement", k: "JobInvolvement" }].map((i) => (
                                <div key={i.k}>
                                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wide mb-2"><span>{i.l}</span><span className="text-indigo-600 font-bold text-sm">{formData[i.k]}/4</span></div>
                                    <input type="range" min="1" max="4" name={i.k} value={formData[i.k]} onChange={handleChange} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                                </div>
                            ))}
                            <div className="flex flex-col gap-3 mt-8">
                                <button onClick={handlePredict} disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all text-base flex justify-center items-center gap-2">
                                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Activity size={20}/>}
                                    {loading ? "Analyzing..." : "Analyze Risk"}
                                </button>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={handleReset} className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors border border-slate-200"><RotateCcw size={16}/> Reset</button>
                                    <button onClick={handlePrint} disabled={!result} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors border ${!result ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'}`}><Printer size={16}/> Report</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Area */}
                <div className="col-span-8 flex flex-col gap-6">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-wide">Attrition Probability</div>
                            <div className={`text-6xl font-black mt-2 tracking-tight ${!result ? 'text-slate-300' : result.risk_level === 'CRITICAL' ? 'text-red-600' : result.risk_level === 'MEDIUM' ? 'text-orange-500' : 'text-green-600'}`}>
                                {result ? `${(result.attrition_probability * 100).toFixed(1)}%` : "--%"}
                            </div>
                        </div>
                        <div className={`px-8 py-4 rounded-2xl font-bold text-lg border-2 flex items-center gap-3 shadow-sm ${!result ? 'bg-slate-50 text-slate-400 border-slate-100' : result.risk_level === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-100' : result.risk_level === 'MEDIUM' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                             {result && (result.risk_level === 'CRITICAL' ? <AlertTriangle size={28}/> : <CheckCircle size={28}/>)}
                            {result ? `${result.risk_level} RISK` : "READY TO ANALYZE"}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                            <h4 className="font-bold text-slate-700 mb-4 text-base">Engagement Profile</h4>
                            <div className="flex-1 min-h-0 text-sm">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 4]} tick={false} axisLine={false} />
                                        <Radar name="Employee" dataKey="A" stroke="#4f46e5" strokeWidth={3} fill="#6366f1" fillOpacity={0.4} />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6 overflow-hidden">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 overflow-y-auto custom-scrollbar">
                                <h4 className="font-bold text-slate-700 mb-4 text-base flex items-center gap-2"><Activity size={18} className="text-indigo-500"/> Key Risk Drivers</h4>
                                {!result ? <div className="text-slate-400 text-sm mt-10 text-center italic">Run prediction to see factors...</div> : (
                                    <div className="space-y-3">
                                        {result.drivers?.length > 0 ? result.drivers.map((d, i) => (
                                            <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-slate-800 text-sm">{d.name}</span>
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${d.impact === 'High' || d.impact === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{d.impact}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{d.desc}</p>
                                            </div>
                                        )) : (
                                            <div className="text-sm text-green-600 bg-green-50 p-4 rounded-xl border border-green-100 flex gap-2 items-center font-medium"><CheckCircle size={18}/> No major negative drivers detected.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <div className={`p-6 rounded-2xl border shadow-sm flex-1 ${!result || result.risk_level === 'LOW' ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-200'}`}>
                                <h4 className="font-bold text-slate-700 mb-4 text-base flex items-center gap-2"><Settings size={18} className="text-indigo-500"/> AI Recommendation</h4>
                                {!result ? <div className="text-slate-400 text-sm text-center mt-4 italic">Waiting for analysis...</div> : (
                                    <ul className="text-sm space-y-3">
                                        {result.risk_level === 'LOW' ? (
                                            <li className="text-indigo-700 font-medium text-base">Employee is stable. Focus on career growth & retention strategies.</li>
                                        ) : (
                                            <>
                                                {result.drivers.some(d => d.name === 'Income') && <li className="flex gap-3 items-start"><span className="text-green-500 font-bold text-xl leading-none">↑</span> <span>Consider a <strong>market salary correction</strong> immediately.</span></li>}
                                                {result.drivers.some(d => d.name === 'Overtime') && <li className="flex gap-3 items-start"><span className="text-blue-500 font-bold text-xl leading-none">↘</span> <span>Review workload distribution to reduce <strong>overtime</strong>.</span></li>}
                                                {result.drivers.some(d => d.name === 'Satisfaction') && <li className="flex gap-3 items-start"><span className="text-purple-500 font-bold text-xl leading-none">♥</span> <span>Schedule a 1-on-1 for <strong>role alignment</strong>.</span></li>}
                                                {!result.drivers.some(d => ['Income','Overtime','Satisfaction'].includes(d.name)) && <li className="flex gap-3 items-start"><span className="text-slate-500 font-bold text-xl leading-none">•</span> <span>Conduct a standard "Stay Interview".</span></li>}
                                            </>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            // --- COMPANY OVERVIEW VIEW ---
            <div className="flex flex-col h-full gap-8">
                
                {selectedDepts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <ArrowLeft size={64} className="mb-6 text-slate-300"/>
                        <h3 className="text-2xl font-bold text-slate-600">No Data Selected</h3>
                        <p className="mt-2 text-base text-slate-500">Please select at least one <strong>Department</strong> from the sidebar filters to view reports.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-4 gap-6">
                            {[
                                { l: "Total Employees", v: overviewData?.kpi.total_employees || 0, sub: "Active Workforce", style: "bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200", text: "text-pink-800", subText: "text-pink-600" },
                                { l: "Attrition Rate", v: (overviewData?.kpi.attrition_rate.toFixed(1) || 0) + "%", sub: "Current Rate", style: "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200", text: "text-yellow-800", subText: "text-yellow-600" },
                                { l: "Avg Satisfaction", v: (overviewData?.kpi.avg_satisfaction.toFixed(1) || 0) + "/4", sub: "Environment Score", style: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200", text: "text-blue-800", subText: "text-blue-600" },
                                { l: "Avg Income", v: "$" + (overviewData?.kpi.avg_income.toFixed(0) || 0), sub: "Monthly Base", style: "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200", text: "text-purple-800", subText: "text-purple-600" },
                            ].map((k, i) => (
                                <div key={i} className={`p-6 rounded-2xl border shadow-sm hover:scale-[1.02] transition-transform ${k.style}`}>
                                    <div className={`text-xs font-bold uppercase tracking-wide opacity-70 ${k.text}`}>{k.l}</div>
                                    <div className="text-4xl font-black text-slate-800 mt-2">{k.v}</div>
                                    <div className={`text-sm mt-2 font-medium ${k.subText}`}>{k.sub}</div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                            {/* ATTRITION BY DEPT */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                                <h4 className="font-bold text-slate-700 mb-6 text-lg">Attrition by Department</h4>
                                <div className="flex-1 min-h-0 text-sm">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={overviewData?.dept_chart || []} layout="vertical">
                                            <XAxis type="number" hide/>
                                            <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12, fill:'#64748b', fontWeight: 500}} axisLine={false} tickLine={false}/>
                                            <Tooltip cursor={{fill: 'transparent'}}/>
                                            <Bar dataKey="value" fill="#f43f5e" radius={[0, 6, 6, 0]} barSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* FEATURE COMPARISON SCATTER PLOT */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                                        <BarChart2 size={20} className="text-indigo-500"/> Feature Comparison
                                    </h4>
                                    <div className="flex gap-2">
                                        <select value={xAxis} onChange={(e) => setXAxis(e.target.value)} className="text-xs p-1.5 border rounded bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500">
                                            {NUMERIC_FEATURES.map(f => <option key={f.key} value={f.key}>X: {f.label}</option>)}
                                        </select>
                                        <select value={yAxis} onChange={(e) => setYAxis(e.target.value)} className="text-xs p-1.5 border rounded bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500">
                                            {NUMERIC_FEATURES.map(f => <option key={f.key} value={f.key}>Y: {f.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 text-sm">
  <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis type="number" dataKey="x" name={xAxis} tick={{fontSize: 12, fill:'#64748b'}} axisLine={false} tickLine={false} label={{ value: xAxis, position: 'insideBottomRight', offset: -5, fontSize: 10, fill: '#94a3b8' }}/>
                                            <YAxis type="number" dataKey="y" name={yAxis} tick={{fontSize: 12, fill:'#64748b'}} axisLine={false} tickLine={false}/>
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                                                if (payload && payload.length) {
                                                    const { x, y, attrition } = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-3 border shadow-xl rounded-lg text-xs">
                                                            <div className={`font-bold mb-1 ${attrition === 'Yes' ? 'text-red-600' : 'text-emerald-600'}`}>{attrition === 'Yes' ? '🔴 Attrited' : '🟢 Active'}</div>
                                                            <div className="text-slate-500">X: <span className="font-mono text-slate-700">{x}</span></div>
                                                            <div className="text-slate-500">Y: <span className="font-mono text-slate-700">{y}</span></div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}/>
                                            <Legend verticalAlign="top" height={36} iconType="circle"/>
                                            <Scatter name="Active Employees" data={scatterActive} fill="#10b981" fillOpacity={0.6} />
                                            <Scatter name="Left Employees" data={scatterLeft} fill="#ef4444" fillOpacity={0.8} />
      </ScatterChart>
  </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        )}
      </main>
    </div>
  );
};

export default App;