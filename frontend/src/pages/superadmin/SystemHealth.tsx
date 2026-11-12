import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { PageHeading, Panel, StatusMessage } from "./shared";

const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = () => {
    setLoading(true);
    setError("");
    api.get("/super-admin/system-health")
      .then((response) => setHealth(response.data.data ?? response.data))
      .catch((err) => setError(err.response?.data?.message || "Unable to retrieve system health."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const entries = Object.entries(health);
  return (
    <>
      <PageHeading title="System Health" description="Check the availability of the CRAYTECH application services." />
      <Panel title="Service status">
        <StatusMessage loading={loading} error={error} />
        {!loading && !error && entries.length > 0 && (
          <div className="divide-y divide-slate-100">
            {entries.map(([name, value]) => (
              <div key={name} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm font-medium capitalize text-slate-700">{name.replaceAll("_", " ")}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
        {!loading && !error && entries.length === 0 && <p className="text-sm text-slate-500">No health information returned by the API yet.</p>}
        <button onClick={refresh} className="mt-4 rounded-lg bg-[#102744] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b3b63]">Refresh status</button>
      </Panel>
    </>
  );
};

export default SystemHealth;
