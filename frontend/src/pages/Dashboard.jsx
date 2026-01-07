import { useEffect, useState } from "react";
import { fetchStats } from "../services/api";
import AttritionByDept from "./components/AttritionByDept";
export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchStats()
      .then(res => {
        console.log("API DATA:", res.data);
        setData(res.data);
      })
      .catch(err => {
        console.error("API ERROR:", err);
      });
  }, []);

  if (!data) {
    return <div className="p-6">Loading dashboard…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="text-2xl font-bold mb-4">
        Dashboard Loaded
      </h1>

      <pre className="bg-white p-4 rounded">
        {JSON.stringify(data.kpi, null, 2)}
      </pre>
    </div>
  );
}
