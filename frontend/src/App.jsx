import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import {
  User, LayoutDashboard, Filter, Activity
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

  /* ---------------- LOAD FILTER OPTIONS ---------------- */
  useEffect(() => {
    axios.get("http://127.0.0.1:8000/filters")
      .then(res => {
        setFilters(res.data);
        setSelectedDepts(res.data.departments);
        setSelectedRoles(res.data.job_roles);
      })
      .catch(() => console.error("Backend not reachable"));
  }, []);

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
          </>
        )}
      </aside>

      {/* -------- MAIN -------- */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* -------- OVERVIEW DASHBOARD -------- */}
        {viewMode === "overview" && overviewData && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              {[
                ["Total Employees", overviewData.kpis.total_employees],
                ["Attrition Rate", overviewData.kpis.attrition_rate + "%"],
                ["Avg Satisfaction", overviewData.kpis.avg_satisfaction],
                ["Avg Income", "$" + overviewData.kpis.avg_income]
              ].map(([l, v], i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow border">
                  <div className="text-xs text-slate-500 uppercase">{l}</div>
                  <div className="text-3xl font-black mt-2">{v}</div>
                </div>
              ))}
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
          <div className="text-center text-slate-400 mt-40">
            Employee Profile View (unchanged)
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
      <Bar dataKey="count" fill="#ef4444" radius={[0,6,6,0]} />
    </BarChart>
  </ResponsiveContainer>
);

const BarSimple = ({ data }) => (
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data}>
      <XAxis dataKey="value" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="count" fill="#6366f1" radius={[6,6,0,0]} />
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
