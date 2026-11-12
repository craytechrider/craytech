import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Users,
  ShieldCheck,
  UserRound,
  Eye,
  Truck,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import api from "../../lib/api";
import { PageHeading, Panel, StatusMessage } from "./shared";

type DailyMetric = { date: string; count: number };
type ChartKey = "visits" | "orders" | "registrations";
type DateRange = 7 | 14 | 30;

type Stats = {
  total_users?: number;
  total_admins?: number;
  total_customers?: number;
  total_delivery?: number;
  total_visits?: number;
  daily_visits?: Array<Record<string, unknown>>;
  daily_orders?: Array<Record<string, unknown>>;
  daily_registrations?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

const normalizeDailySeries = (
  rows: Array<Record<string, unknown>> | undefined,
): DailyMetric[] => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const dateValue = row.date ?? row.day ?? row.created_at;
      const countValue =
        row.count ??
        row.total ??
        row.visits ??
        row.orders ??
        row.registrations ??
        row.value;
      if (dateValue == null || countValue == null) return null;
      const date = String(dateValue).slice(0, 10);
      const count = Number(countValue);
      return date && Number.isFinite(count) ? { date, count } : null;
    })
    .filter((row): row is DailyMetric => row !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
};

const formatChartDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        timeZone: "Asia/Manila",
      });
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeChart, setActiveChart] = useState<ChartKey>("visits");
  const [dateRange, setDateRange] = useState<DateRange>(30);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/super-admin/dashboard");
      setStats(response.data.data ?? response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to load dashboard data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const cards = [
    {
      key: "total_users",
      label: "Total Users",
      icon: Users,
      color: "bg-blue-50 text-blue-700",
    },
    {
      key: "total_admins",
      label: "Administrators",
      icon: ShieldCheck,
      color: "bg-purple-50 text-purple-700",
    },
    {
      key: "total_customers",
      label: "Customers",
      icon: UserRound,
      color: "bg-green-50 text-green-700",
    },
    {
      key: "total_visits",
      label: "Website Visits",
      icon: Eye,
      color: "bg-orange-50 text-orange-700",
    },
  ];

  const visitChartData = useMemo(
    () => normalizeDailySeries(stats.daily_visits),
    [stats],
  );
  const orderChartData = useMemo(
    () => normalizeDailySeries(stats.daily_orders),
    [stats],
  );
  const registrationChartData = useMemo(
    () => normalizeDailySeries(stats.daily_registrations),
    [stats],
  );

  const charts: Array<{
    key: ChartKey;
    tabLabel: string;
    title: string;
    description: string;
    data: DailyMetric[];
    color: string;
    seriesName: string;
  }> = [
    {
      key: "visits",
      tabLabel: "Website Visits",
      title: "Website Visits per Date",
      description: "Number of page visits recorded each day.",
      data: visitChartData,
      color: "#F59E0B",
      seriesName: "Website Visits",
    },
    {
      key: "orders",
      tabLabel: "Orders",
      title: "Orders per Date",
      description: "Number of orders placed each day.",
      data: orderChartData,
      color: "#17365D",
      seriesName: "Orders",
    },
    {
      key: "registrations",
      tabLabel: "Registered Users",
      title: "Registered Users per Date",
      description: "Number of new user registrations each day.",
      data: registrationChartData,
      color: "#16A34A",
      seriesName: "Registrations",
    },
  ];

  const selectedChart =
    charts.find((chart) => chart.key === activeChart) ?? charts[0];
  const filteredChartData = useMemo(
    () => selectedChart.data.slice(-dateRange),
    [selectedChart.data, dateRange],
  );

  return (
    <div className="relative">
      <PageHeading
        title="Platform Overview"
        description="Monitor CRAYTECH users, administrators, website activity, and platform status."
      />

      <StatusMessage loading={loading} error={error} />

      {/* Statistic Cards - 2 Rows */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.key}
              className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md sm:p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.color}`}
                >
                  <Icon size={20} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-500 sm:text-sm">
                    {card.label}
                  </p>

                  <h3 className="mt-1 text-xl font-bold text-[#102744] sm:text-2xl">
                    {Number(stats[card.key] ?? 0).toLocaleString()}
                  </h3>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily analytics: chart tabs and date-range filter */}
      <div className="mt-6">
        <Panel title="Platform Analytics">
          <div className="mb-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Daily activity summary for the selected period.
              </p>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <span>Date range</span>
                <select
                  value={dateRange}
                  onChange={(event) =>
                    setDateRange(Number(event.target.value) as DateRange)
                  }
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-[#102744] outline-none transition focus:border-[#17365D] focus:ring-2 focus:ring-[#17365D]/10"
                  aria-label="Select chart date range"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days / 1 month</option>
                </select>
              </label>
            </div>

            <div
              className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1"
              role="tablist"
              aria-label="Platform analytics charts"
            >
              {charts.map((chart) => (
                <button
                  key={chart.key}
                  type="button"
                  role="tab"
                  aria-selected={activeChart === chart.key}
                  onClick={() => setActiveChart(chart.key)}
                  className={`min-h-10 rounded-lg px-2 py-2 text-xs font-bold transition sm:text-sm ${
                    activeChart === chart.key
                      ? "bg-[#102744] text-white shadow"
                      : "text-gray-600 hover:bg-white/70 hover:text-[#102744]"
                  }`}
                >
                  {chart.tabLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <h3 className="font-bold text-[#102744]">{selectedChart.title}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedChart.description}
            </p>
          </div>

          <div className="h-[280px] w-full sm:h-[320px]">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                Loading chart...
              </div>
            ) : filteredChartData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-lg bg-gray-50 px-4 text-center">
                <p className="text-sm font-semibold text-gray-500">
                  No daily data available
                </p>
                <p className="mt-1 max-w-md text-xs text-gray-400">
                  The dashboard API must return daily summary records for this
                  chart.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={filteredChartData}
                  margin={{ top: 10, right: 18, left: 0, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E7EB"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={18}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip
                    labelFormatter={(label) => formatChartDate(String(label))}
                    formatter={(value) => [
                      Number(value).toLocaleString(),
                      selectedChart.seriesName,
                    ]}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #E5E7EB",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name={selectedChart.seriesName}
                    stroke={selectedChart.color}
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: selectedChart.color,
                      strokeWidth: 2,
                      stroke: "#FFFFFF",
                    }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <p className="mt-2 text-xs text-gray-400">
            Showing {filteredChartData.length} of up to 30 available dates.
          </p>
        </Panel>
      </div>

      {/* Bottom Panels */}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Panel title="Platform Summary">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-sm text-gray-500">
                Total registered users
              </span>
              <span className="font-semibold text-[#102744]">
                {Number(stats.total_users ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-sm text-gray-500">
                Total administrators
              </span>
              <span className="font-semibold text-[#102744]">
                {Number(stats.total_admins ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-sm text-gray-500">Total customers</span>
              <span className="font-semibold text-[#102744]">
                {Number(stats.total_customers ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Total delivery personnel
              </span>
              <span className="font-semibold text-[#102744]">
                {Number(stats.total_delivery ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Getting Started">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                <Users size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Manage Users</p>
                <p className="text-sm text-gray-500">
                  View and manage registered platform accounts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-50 p-2 text-purple-700">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  Review Activity Logs
                </p>
                <p className="text-sm text-gray-500">
                  Monitor user activities and important platform events.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-green-50 p-2 text-green-700">
                <Truck size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Monitor Platform</p>
                <p className="text-sm text-gray-500">
                  Keep track of platform users and website activity.
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Floating Refresh Button */}
      <button
        type="button"
        onClick={loadDashboard}
        disabled={loading}
        title="Refresh dashboard"
        aria-label="Refresh dashboard"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#102744] text-white shadow-lg transition hover:bg-[#1b3b63] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw size={22} className={loading ? "animate-spin" : ""} />
      </button>
    </div>
  );
};

export default Dashboard;
