import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Eye, Users, ChartNoAxesColumn } from "lucide-react";
import api from "../../lib/api";
import { DataTable, PageHeading, Panel, StatusMessage } from "./shared";

type PageData = {
  path: string;
  views: number;
  unique_visitors: number;
};

const WebsiteAnalytics: React.FC = () => {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/super-admin/website-analytics");
      const result = response.data?.data ?? response.data;
      setData(result || {});
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Website analytics are not available yet.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const pages: PageData[] = Array.isArray(data.pages) ? data.pages : [];

  const chartPages = [...pages]
    .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
    .slice(0, 7);

  const maxViews = Math.max(
    ...chartPages.map((page) => Number(page.views || 0)),
    1,
  );

  const formatNumber = (value: unknown) => Number(value || 0).toLocaleString();

  const summaryCards = [
    {
      label: "Page Views",
      value: data.page_views,
      description: "Total recorded page visits",
      icon: Eye,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Unique Visitors",
      value: data.unique_visitors,
      description: "Distinct visitor identifiers",
      icon: Users,
      color: "bg-green-50 text-green-700",
    },
    {
      label: "Sessions",
      value: data.sessions,
      description: "Recorded visitor sessions",
      icon: ChartNoAxesColumn,
      color: "bg-orange-50 text-orange-700",
    },
  ];

  return (
    <>
      <PageHeading
        title="Website Analytics"
        description="Monitor website traffic, unique visitors, sessions, and the most visited pages."
      />

      {/* COMPACT SUMMARY CARDS */}
      <div className="mb-5 mt-6 grid grid-cols-3 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md sm:p-4"
            >
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${card.color}`}
                >
                  <Icon size={19} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
                    {card.label}
                  </p>

                  <p className="mt-1 truncate text-lg font-extrabold text-[#102744] sm:text-2xl">
                    {loading ? "—" : formatNumber(card.value)}
                  </p>

                  <p className="hidden truncate text-xs text-slate-400 lg:block">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <StatusMessage loading={loading} error={error} />

      {!loading && !error && (
        <>
          {/* MOST VISITED PAGES GRAPH */}
          <Panel title="Most Visited Pages">
            <div className="mb-6">
              <p className="text-sm text-slate-500">
                Page views by website route, ranked by traffic.
              </p>
            </div>

            {chartPages.length > 0 ? (
              <div className="space-y-6">
                {chartPages.map((page, index) => {
                  const views = Number(page.views || 0);
                  const percentage = (views / maxViews) * 100;

                  return (
                    <div key={`${page.path}-${index}`}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-semibold text-slate-700"
                            title={page.path}
                          >
                            {page.path}
                          </p>
                        </div>

                        <span className="shrink-0 text-sm font-bold text-[#102744]">
                          {formatNumber(views)} views
                        </span>
                      </div>

                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#1749D1] to-[#4F8DF7] transition-all duration-700"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 px-4 py-12 text-center">
                <div className="mb-3 text-4xl">📊</div>

                <p className="font-semibold text-slate-700">
                  No website traffic recorded yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Page visit data will appear here once tracking is active.
                </p>
              </div>
            )}
          </Panel>

          {/* PAGE DETAILS TABLE */}
          <div className="mt-5">
            <Panel title="Page Traffic Details">
              {pages.length > 0 ? (
                <DataTable
                  columns={["path", "views", "unique_visitors"]}
                  rows={pages}
                />
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">
                  No page analytics available yet.
                </p>
              )}
            </Panel>
          </div>
        </>
      )}

      {/* FLOATING CIRCULAR REFRESH BUTTON */}
      <button
        type="button"
        onClick={loadAnalytics}
        disabled={loading}
        aria-label={loading ? "Refreshing analytics" : "Refresh analytics"}
        title={loading ? "Refreshing analytics..." : "Refresh analytics"}
        className="
          fixed bottom-6 right-5 z-[70]
          flex h-14 w-14 items-center justify-center
          rounded-full border-2 border-white
          bg-[#102744] text-white shadow-xl
          transition-all duration-200
          hover:scale-105 hover:bg-[#1b3b63]
          focus:outline-none focus:ring-4 focus:ring-blue-200
          disabled:cursor-not-allowed disabled:opacity-60
          sm:bottom-8 sm:right-8
        "
      >
        <RefreshCw
          size={23}
          strokeWidth={2.4}
          className={loading ? "animate-spin" : ""}
        />
      </button>
    </>
  );
};

export default WebsiteAnalytics;
