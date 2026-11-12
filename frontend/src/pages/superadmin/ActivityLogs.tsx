import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import api from "../../lib/api";
import { DataTable, PageHeading, Panel, StatusMessage } from "./shared";

type ActivityLog = {
  id: number;
  created_at: string;
  user_name: string | null;
  action: string;
  description: string | null;
  ip_address: string | null;
};

const actionLabels: Record<string, string> = {
  login_success: "Successful Login",
  login_failed: "Failed Login",
  login_blocked: "Blocked Login",
  login_requires_verification: "Email Verification Required",
  account_locked: "Account Locked",
  logout: "Logout",
  password_reset_requested: "Password Reset Requested",
  password_reset_code_failed: "Incorrect Reset Code",
  password_reset: "Password Reset",
};

const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/super-admin/activity-logs");
      const result = response.data?.data;
      setLogs(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to load activity logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const rows = logs.map((log) => ({
    ...log,
    action: actionLabels[log.action] || log.action,
    created_at: log.created_at ? new Date(log.created_at).toLocaleString() : "—",
    user_name: log.user_name || "Unknown / Unregistered Email",
    description: log.description || "—",
    ip_address: log.ip_address || "Unavailable",
  }));

  return (
    <>
      <PageHeading
        title="Activity Logs"
        description="Monitor successful and failed logins, account security events, password resets, and other system activities."
      />
      <Panel title="Recent System Activity">
        <StatusMessage loading={loading} error={error} />
        {!loading && !error && (logs.length > 0 ? (
          <DataTable
            columns={["created_at", "user_name", "action", "description", "ip_address"]}
            rows={rows}
          />
        ) : (
          <div className="py-12 text-center">
            <p className="font-semibold text-slate-700">No activity records found</p>
            <p className="mt-1 text-sm text-slate-500">Login and system activity will appear here once recorded.</p>
          </div>
        ))}
      </Panel>
      <button
        type="button"
        onClick={loadLogs}
        disabled={loading}
        aria-label="Refresh activity logs"
        title="Refresh activity logs"
        className="fixed bottom-6 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-[#102744] text-white shadow-xl transition-all duration-200 hover:scale-105 hover:bg-[#1b3b63] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 sm:bottom-8 sm:right-8"
      >
        <RefreshCw size={23} strokeWidth={2.4} className={loading ? "animate-spin" : ""} />
      </button>
    </>
  );
};

export default ActivityLogs;
