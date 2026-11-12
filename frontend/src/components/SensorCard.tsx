import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface SensorCardProps {
  title: string;
  value: number | string | null;
  unit?: string;

  icon: ReactNode;

  trend?: "up" | "down" | "stable";
  status?: "normal" | "warning" | "critical";

  footer?: string;
  footerLabel?: string;

  chartData?: number[];
}

function SensorCard({
  title,
  value,
  unit = "",
  icon,
  trend = "stable",
  status = "normal",
  footer = "Stable",
  footerLabel = "Current status",
  chartData = [],
}: SensorCardProps) {
  /* =========================================================
     CRAYTECH COLOR CONFIGURATION
  ========================================================= */

  const statusConfig = {
    normal: {
      card: "bg-white border-blue-100 hover:border-blue-200",
      icon: "bg-blue-50 text-blue-600",
      value: "text-[#102a56]",
      glow: "bg-blue-500",
      status: "bg-blue-50 text-blue-600 border-blue-100",
      line: "text-blue-500",
    },

    warning: {
      card: "bg-orange-50/30 border-orange-100 hover:border-orange-200",
      icon: "bg-orange-50 text-orange-600",
      value: "text-orange-700",
      glow: "bg-orange-400",
      status: "bg-orange-50 text-orange-600 border-orange-100",
      line: "text-orange-500",
    },

    critical: {
      card: "bg-red-50/30 border-red-100 hover:border-red-200",
      icon: "bg-red-50 text-red-600",
      value: "text-red-700",
      glow: "bg-red-400",
      status: "bg-red-50 text-red-600 border-red-100",
      line: "text-red-500",
    },
  };

  const currentStatus = statusConfig[status];

  /* =========================================================
     TREND ICON
  ========================================================= */

  const trendIcon = {
    up: <ArrowUp size={13} />,
    down: <ArrowDown size={13} />,
    stable: <Minus size={13} />,
  };

  /* =========================================================
     VALUE
  ========================================================= */

  let displayValue: string | number = "—";

  if (value !== null && value !== undefined) {
    if (typeof value === "number") {
      displayValue = value.toFixed(2);
    } else {
      displayValue = value;
    }
  }

  /* =========================================================
     SPARKLINE
  ========================================================= */

  const safeChartData =
    Array.isArray(chartData) && chartData.length > 1
      ? chartData.filter(
          (item) => typeof item === "number" && Number.isFinite(item),
        )
      : [];

  return (
    <div
      className={`
        group
        relative
        min-h-[175px]
        overflow-hidden
        rounded-2xl
        border
        p-5
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-lg
        ${currentStatus.card}
      `}
    >
      {/* =====================================================
          DECORATIVE ORANGE ACCENT
      ===================================================== */}

      <div
        className="
          absolute
          -right-8
          -top-8
          h-24
          w-24
          rounded-full
          bg-orange-400
          opacity-[0.06]
          blur-2xl
          transition-all
          duration-300
          group-hover:opacity-[0.12]
        "
      />

      {/* =====================================================
          DECORATIVE BLUE ACCENT
      ===================================================== */}

      <div
        className={`
          absolute
          -bottom-10
          -left-10
          h-28
          w-28
          rounded-full
          opacity-[0.06]
          blur-3xl
          ${currentStatus.glow}
        `}
      />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="relative z-10 flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#526581]">
            {title}
          </p>

          <div className="mt-1 h-1 w-8 rounded-full bg-orange-400" />
        </div>

        {/* ICON */}

        <div
          className={`
            flex
            h-11
            w-11
            flex-shrink-0
            items-center
            justify-center
            rounded-xl
            shadow-sm
            transition-transform
            duration-300
            group-hover:scale-105
            ${currentStatus.icon}
          `}
        >
          {icon}
        </div>
      </div>

      {/* =====================================================
          VALUE
      ===================================================== */}

      <div className="relative z-10 mt-5 flex items-baseline gap-1.5">
        <span
          className={`
            text-[30px]
            font-bold
            leading-none
            tracking-tight
            ${currentStatus.value}
          `}
        >
          {displayValue}
        </span>

        {unit && (
          <span className="text-sm font-semibold text-[#73839c]">{unit}</span>
        )}
      </div>

      {/* =====================================================
          FOOTER / STATUS
      ===================================================== */}

      <div className="relative z-10 mt-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium text-[#94a3b8]">
            {footerLabel}
          </p>

          <p
            className={`
              mt-0.5
              text-xs
              font-semibold
              ${currentStatus.value}
            `}
          >
            {footer}
          </p>
        </div>

        {/* TREND */}

        <div
          className={`
            flex
            items-center
            gap-1
            rounded-lg
            border
            px-2
            py-1
            text-[11px]
            font-semibold
            ${currentStatus.status}
          `}
        >
          {trendIcon[trend]}

          <span>
            {trend === "stable"
              ? "Stable"
              : trend === "up"
                ? "Increasing"
                : "Decreasing"}
          </span>
        </div>
      </div>

      {/* =====================================================
          SPARKLINE
      ===================================================== */}

      {safeChartData.length > 1 && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 opacity-25">
          <svg
            className={`h-full w-full ${currentStatus.line}`}
            preserveAspectRatio="none"
            viewBox="0 0 100 40"
          >
            <path
              d={safeChartData
                .map((item, index) => {
                  const x = (index / (safeChartData.length - 1)) * 100;

                  const min = Math.min(...safeChartData);
                  const max = Math.max(...safeChartData);
                  const range = max - min || 1;

                  const y = 32 - ((item - min) / range) * 24;

                  return `${index === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>
      )}

      {/* =====================================================
          BOTTOM BLUE LINE
      ===================================================== */}

      <div
        className={`
          absolute
          bottom-0
          left-0
          h-[3px]
          w-0
          transition-all
          duration-300
          group-hover:w-full
          ${
            status === "warning"
              ? "bg-orange-400"
              : status === "critical"
                ? "bg-red-500"
                : "bg-blue-600"
          }
        `}
      />
    </div>
  );
}

export default SensorCard;
