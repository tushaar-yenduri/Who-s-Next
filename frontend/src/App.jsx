import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis, CartesianGrid, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  User, Activity, Search, LayoutDashboard, Settings, 
  AlertTriangle, CheckCircle, Filter, RotateCcw, Printer, 
  ArrowLeft, BarChart2, Menu, X, FileText, Users, Briefcase, DollarSign
} from 'lucide-react';

// --- CONFIGURATION ---
const DEPT_ROLE_MAP = {
  'Human Resources': ['Human Resources', 'Manager'], 
  'Research & Development': ['Research Scientist', 'Laboratory Technician', 'Manufacturing Director', 'Healthcare Representative', 'Research Director', 'Manager'], 
  'Sales': ['Sales Executive', 'Manager', 'Sales Representative']
};

const NUMERIC_FEATURES = [
    { label: "Age", key: "Age" },
    { label: "Monthly Income", key: "MonthlyIncome" },
    { label: "Years at Company", key: "YearsAtCompany" },
    { label: "Total Working Years", key: "TotalWorkingYears" },
    { label: "Distance From Home", key: "DistanceFromHome" },
    { label: "Years in Current Role", key: "YearsInCurrentRole" }
];

const App = () => {
  // --- STATE ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // STEP 1: Set default view to 'overview' (Company Overview)
  const [viewMode, setViewMode] = useState('overview'); 
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

  // Overview Data
  const [filterOptions, setFilterOptions] = useState({ departments: [], roles: [] });
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [visibleRoles, setVisibleRoles] = useState([]); 
  const [overviewData, setOverviewData] = useState(null);
  const [globalStats, setGlobalStats] = useState(null); 
  
  // Chart Config
  const [xAxis, setXAxis] = useState("YearsAtCompany");
  const [yAxis, setYAxis] = useState("MonthlyIncome");
  const [chartType, setChartType] = useState("scatter"); 

  // --- INITIAL LOAD ---
  useEffect(() => {
    const fetchInit = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/init');
            setFilterOptions(res.data);
            setSelectedDepts(res.data.departments);
            setSelectedRoles(res.data.roles);
        } catch (e) { console.error("Backend offline"); }
    };
    
    const fetchGlobal = async () => {
        try {
            const res = await axios.post('http://127.0.0.1:8000/stats', { departments: [], job_roles: [] });
            setGlobalStats(res.data);
        } catch (e) { console.error("Error fetching globals"); }
    };

    fetchInit();
    fetchGlobal();
  }, []);

  // --- CASCADING FILTERS ---
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
        fetchStats();
    }
  }, [viewMode, selectedDepts, selectedRoles, xAxis, yAxis]);

  // --- HANDLERS (Prediction/Search) ---
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
    } catch (e) { alert("Prediction failed."); }
    setLoading(false);
  };

  const handleReset = () => {
      setFormData({ Age: 30, Department: "Sales", MonthlyIncome: 5000, OverTime: "No", JobSatisfaction: 3, EnvironmentSatisfaction: 3, JobInvolvement: 3, PerformanceRating: 3, YearsAtCompany: 5, TotalWorkingYears: 8, DistanceFromHome: 10, NumCompaniesWorked: 1, Education: 3, WorkLifeBalance: 3 });
      setResult(null); setSearchId(''); setSearchError('');
  };

  const toggleFilter = (item, list, setList) => {
      if (list.includes(item)) setList(list.filter(i => i !== item));
      else setList([...list, item]);
  };

  // --- DATA PREP ---
  const benchmarkIncome = [
      { name: 'Employee', value: formData.MonthlyIncome, fill: '#6366f1' },
      { name: 'Avg', value: globalStats?.kpi.avg_income || 6500, fill: '#cbd5e1' }
  ];
  
  const benchmarkTenure = [
      { name: 'Employee', value: formData.YearsAtCompany, fill: '#10b981' },
      { name: 'Avg', value: globalStats?.kpi.avg_years_company || 7, fill: '#cbd5e1' } 
  ];

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden text-base">
      
      {/* --- SIDEBAR --- */}
      <aside className={`bg-white border-r border-slate-200 flex flex-col shadow-xl h-full z-30 fixed top-0 left-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full opacity-0'}`}>
        <div className="p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3 text-indigo-700">
            <Activity size={28} />
            <h1 className="text-xl font-black tracking-tight uppercase">Who's Next</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-semibold tracking-wide">Workforce Intelligence</p>
        </div>

        <nav className="p-4 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
            {/* View Selector (Reordered) */}
            <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Navigation</div>
                <div className="space-y-2">
                    {/* BUTTON 1: COMPANY OVERVIEW */}
                    <button onClick={() => setViewMode('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${viewMode === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <LayoutDashboard size={18}/> Company Overview
                    </button>
                    {/* BUTTON 2: EMPLOYEE PROFILE */}
                    <button onClick={() => setViewMode('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${viewMode === 'profile' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <User size={18}/> Employee Profile
                    </button>
                </div>
            </div>

            {/* DYNAMIC FILTERS (Only shows in Overview Mode) */}
            {viewMode === 'overview' && (
                <div className="animate-fade-in">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                        <Filter size={12}/> Global Filters
                    </div>
                    
                    {/* Dept Filter */}
                    <div className="mb-4">
                        <h4 className="text-xs font-bold px-2 mb-2 text-slate-700">Departments</h4>
                        <div className="space-y-1 px-2">
                            {filterOptions.departments.map(d => (
                                <label key={d} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:bg-slate-50 p-1.5 rounded">
                                    <input type="checkbox" checked={selectedDepts.includes(d)} onChange={() => toggleFilter(d, selectedDepts, setSelectedDepts)} className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"/>
                                    <span className="truncate">{d}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Role Filter */}
                    <div>
                        <h4 className="text-xs font-bold px-2 mb-2 text-slate-700">Job Roles</h4>
                        {visibleRoles.length === 0 ? (
                             <div className="text-xs text-slate-400 italic px-2 py-2 border border-dashed rounded">Select a Dept above</div>
                        ) : (
                            <div className="max-h-48 overflow-y-auto space-y-1 px-2 custom-scrollbar">
                                {visibleRoles.map(r => (
                                    <label key={r} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:bg-slate-50 p-1.5 rounded">
                                        <input type="checkbox" checked={selectedRoles.includes(r)} onChange={() => toggleFilter(r, selectedRoles, setSelectedRoles)} className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"/>
                                        <span className="truncate">{r}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Prediction Model (Only shows in Profile Mode) */}
            {viewMode === 'profile' && (
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Model Selection</div>
                    <div className="space-y-2 px-2">
                        {['Logistic Regression', 'Random Forest', 'Gradient Boosting', 'Ensemble (All Models)'].map((model) => (
                            <label key={model} className="flex items-center gap-2 cursor-pointer group p-1">
                                <input type="radio" name="model_selector" value={model} checked={selectedModel === model} onChange={(e) => setSelectedModel(e.target.value)} className="text-indigo-600 focus:ring-indigo-500"/>
                                <span className={`text-xs font-medium ${selectedModel === model ? 'text-indigo-700' : 'text-slate-600'}`}>{model}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-0'}`}>
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                    {isSidebarOpen ? <X size={20}/> : <Menu size={20}/>}
                </button>
                <h2 className="text-lg font-bold text-slate-800">
                    {viewMode === 'profile' ? 'Employee Diagnostics' : 'Executive Dashboard'}
                </h2>
            </div>
            <div className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                Last Updated: Live
            </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto bg-slate-100">
            
            {/* --- COMPANY OVERVIEW VIEW (POWER BI STYLE) --- */}
            {viewMode === 'overview' && (
                selectedDepts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Filter size={64} className="mb-4 text-slate-300"/>
                        <h3 className="text-xl font-bold text-slate-600">Filters Cleared</h3>
                        <p>Select a Department to generate the dashboard.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* 1. TOP KPI ROW */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { l: "Total Workforce", v: overviewData?.kpi.total_employees || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                                { l: "Attrition Rate", v: (overviewData?.kpi.attrition_rate.toFixed(1) || 0) + "%", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
                                { l: "Avg Satisfaction", v: (overviewData?.kpi.avg_satisfaction.toFixed(1) || 0) + "/4", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
                                { l: "Avg Income", v: "$" + (overviewData?.kpi.avg_income.toFixed(0) || 0), icon: DollarSign, color: "text-indigo-600", bg: "bg-indigo-50" },
                            ].map((k, i) => (
                                <div key={i} className="dashboard-card border-l-4" style={{ borderLeftColor: 'currentColor' }}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{k.l}</p>
                                            <h3 className="text-2xl font-black text-slate-800 mt-1">{k.v}</h3>
                                        </div>
                                        <div className={`p-2 rounded-lg ${k.bg} ${k.color}`}>
                                            <k.icon size={20} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 2. MAIN CHART GRID (BENTO BOX) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                            
                            {/* LEFT: Attrition by Dept (Bar) */}
                            <div className="lg:col-span-1 dashboard-card">
                                <div className="dashboard-title"><Briefcase size={16}/> Attrition by Department</div>
                                <div className="flex-1 min-h-0 text-xs">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={overviewData?.dept_chart || []} layout="vertical" margin={{ left: 0, right: 20 }}>
                                            <XAxis type="number" hide/>
                                            <YAxis dataKey="name" type="category" width={110} tick={{fontSize: 11, fill:'#64748b', fontWeight: 500}} axisLine={false} tickLine={false}/>
                                            <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                                            <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* RIGHT: Feature Comparison (Scatter/Area) */}
                            <div className="lg:col-span-2 dashboard-card">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="dashboard-title mb-0"><BarChart2 size={16}/> Correlation Analysis</div>
                                    
                                    {/* Controls */}
                                    <div className="flex gap-2">
                                        <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="text-xs p-1 border rounded bg-slate-50">
                                            <option value="scatter">Scatter</option>
                                            <option value="line">Line</option>
                                            <option value="area">Area</option>
                                        </select>
                                        <select value={xAxis} onChange={(e) => setXAxis(e.target.value)} className="text-xs p-1 border rounded bg-slate-50 w-32">
                                            {NUMERIC_FEATURES.map(f => <option key={f.key} value={f.key}>X: {f.label}</option>)}
                                        </select>
                                        <select value={yAxis} onChange={(e) => setYAxis(e.target.value)} className="text-xs p-1 border rounded bg-slate-50 w-32">
                                            {NUMERIC_FEATURES.map(f => <option key={f.key} value={f.key}>Y: {f.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 text-xs">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {chartType === 'scatter' ? (
                                            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis type="number" dataKey="x" name={xAxis} tick={{fontSize: 11, fill:'#64748b'}} axisLine={false} tickLine={false}/>
                                                <YAxis type="number" dataKey="y" name={yAxis} tick={{fontSize: 11, fill:'#64748b'}} axisLine={false} tickLine={false}/>
                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                                                <Scatter name="Employees" data={overviewData?.scatter_chart || []} fill="#6366f1" />
                                            </ScatterChart>
                                        ) : chartType === 'area' ? (
                                            <AreaChart data={overviewData?.scatter_chart || []} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="x" tick={{fontSize: 11}}/>
                                                <YAxis dataKey="y" tick={{fontSize: 11}}/>
                                                <Tooltip />
                                                <Area type="monotone" dataKey="y" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
                                            </AreaChart>
                                        ) : (
                                            <LineChart data={overviewData?.scatter_chart || []} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="x" tick={{fontSize: 11}}/>
                                                <YAxis dataKey="y" tick={{fontSize: 11}}/>
                                                <Tooltip />
                                                <Line type="monotone" dataKey="y" stroke="#6366f1" dot={false} strokeWidth={2} />
                                            </LineChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* --- EMPLOYEE PROFILE VIEW --- */}
            {viewMode === 'profile' && (
                <div className="grid grid-cols-12 gap-6 h-full">
                    {/* Left: Inputs */}
                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                        <div className="bg-slate-800 p-5 rounded-xl shadow-lg text-white">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Employee Search</h3>
                            <div className="flex gap-2">
                                <input type="number" className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="ID..." value={searchId} onChange={(e) => setSearchId(e.target.value)}/>
                                <button onClick={handleSearch} disabled={loading} className="bg-indigo-500 hover:bg-indigo-400 px-4 rounded font-bold transition-colors"><Search size={18}/></button>
                            </div>
                            {searchError && <div className="text-red-300 text-xs mt-2 flex items-center gap-1"><AlertTriangle size={12}/> {searchError}</div>}
                        </div>

                        <div className="dashboard-card flex-1 overflow-y-auto">
                            <div className="dashboard-title"><Settings size={16}/> Adjustment Factors</div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Dept</label>
                                    <select name="Department" value={formData.Department} onChange={handleChange} className="w-full mt-1 p-2 border rounded text-sm bg-slate-50"><option>Sales</option><option>Research & Development</option><option>Human Resources</option></select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-xs font-bold text-slate-500 uppercase">Income</label><input type="number" name="MonthlyIncome" value={formData.MonthlyIncome} onChange={handleChange} className="w-full mt-1 p-2 border rounded text-sm bg-slate-50"/></div>
                                    <div><label className="text-xs font-bold text-slate-500 uppercase">Overtime</label><select name="OverTime" value={formData.OverTime} onChange={handleChange} className="w-full mt-1 p-2 border rounded text-sm bg-slate-50"><option>No</option><option>Yes</option></select></div>
                                </div>
                                {[{ l: "Job Satisfaction", k: "JobSatisfaction" }, { l: "Env. Satisfaction", k: "EnvironmentSatisfaction" }].map((i) => (
                                    <div key={i.k}>
                                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>{i.l}</span><span className="text-indigo-600">{formData[i.k]}/4</span></div>
                                        <input type="range" min="1" max="4" name={i.k} value={formData[i.k]} onChange={handleChange} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-1"/>
                                    </div>
                                ))}
                                <button onClick={handlePredict} disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-all text-sm mt-4">
                                    {loading ? "Analyzing..." : "Update Risk Model"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Analysis */}
                    <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                        {/* Risk Banner */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase">Predicted Risk</div>
                                <div className={`text-5xl font-black mt-1 ${!result ? 'text-slate-300' : result.risk_level === 'CRITICAL' ? 'text-red-600' : result.risk_level === 'MEDIUM' ? 'text-orange-500' : 'text-emerald-600'}`}>
                                    {result ? `${(result.attrition_probability * 100).toFixed(1)}%` : "--%"}
                                </div>
                            </div>
                            <div className={`px-4 py-2 rounded-lg font-bold text-sm border flex items-center gap-2 ${!result ? 'bg-slate-50 text-slate-400' : result.risk_level === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-100' : result.risk_level === 'MEDIUM' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                {result && (result.risk_level === 'CRITICAL' ? <AlertTriangle size={18}/> : <CheckCircle size={18}/>)}
                                {result ? `${result.risk_level} RISK` : "READY"}
                            </div>
                        </div>

                        {/* Status & Benchmarks */}
                        {result && (
                            <div className="grid grid-cols-2 gap-6 h-64">
                                <div className="dashboard-card">
                                    <div className="dashboard-title"><FileText size={16}/> Risk Summary</div>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Employee is currently <strong>{result.risk_level}</strong>. 
                                        {result.risk_level === 'CRITICAL' ? " Immediate intervention required. Salary and Overtime are key drivers." : " Stability is good, but monitor satisfaction levels."}
                                    </p>
                                    <div className="mt-auto pt-4">
                                        <div className="text-xs font-bold text-slate-400 uppercase">AI Recommendation</div>
                                        <div className="text-sm font-medium text-indigo-700 mt-1">
                                            {result.drivers[0]?.name === 'Income' ? "Market Salary Correction" : "Workload Balancing Review"}
                                        </div>
                                    </div>
                                </div>
                                <div className="dashboard-card">
                                    <div className="dashboard-title"><Users size={16}/> Peer Benchmark</div>
                                    <div className="flex-1 min-h-0 text-xs">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={benchmarkIncome} layout="vertical" margin={{ left: 10 }}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} axisLine={false} tickLine={false}/>
                                                <Tooltip cursor={{fill: 'transparent'}}/>
                                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fontSize: 10, fill: '#64748b' }}/>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default App;