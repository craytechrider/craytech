import React from "react";

/* =========================================================
   PAGE HEADING / HERO BANNER
========================================================= */

interface PageHeadingProps {
  title: string;
  description: string;
}

export const PageHeading: React.FC<PageHeadingProps> = ({
  title,
  description,
}) => {
  return (
    <section className="relative mb-6 min-h-[170px] overflow-hidden rounded-2xl bg-[#17365D] px-6 py-7 text-white shadow-sm sm:px-8 sm:py-8">
      {/* Decorative background circles */}
      <div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full bg-white/15" />

      <div className="pointer-events-none absolute -bottom-24 right-16 h-56 w-56 rounded-full bg-[#315780]/70" />

      <div className="pointer-events-none absolute -bottom-24 left-20 h-40 w-40 rounded-full bg-[#0F2948]/60" />

      <div className="relative z-10 max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />

          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">
            Super Admin Management System
          </span>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h1>

        <p className="mt-2 max-w-2xl text-xs leading-5 text-blue-100 sm:text-sm">
          {description}
        </p>

        <div className="mt-5 h-1 w-12 rounded-full bg-[#F59E0B]" />
      </div>
    </section>
  );
};

/* =========================================================
   PANEL
========================================================= */

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  children,
  className = "",
}) => {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {title && (
        <h2 className="mb-5 text-base font-bold text-[#17365D] sm:text-lg">
          {title}
        </h2>
      )}

      {children}
    </section>
  );
};

/* =========================================================
   STATUS MESSAGE
========================================================= */

interface StatusMessageProps {
  loading?: boolean;
  error?: string;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  loading = false,
  error = "",
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#17365D]" />
        Loading data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return null;
};

/* =========================================================
   DATA TABLE
========================================================= */

interface DataTableProps {
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

const formatColumnName = (column: string) => {
  return column
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatCellValue = (value: unknown, column: string) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (column === "is_active") {
    return value ? "Active" : "Inactive";
  }

  if (column === "email_verified_at") {
    return value ? "Verified" : "Not verified";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (
    typeof value === "string" &&
    (column.includes("_at") || column.includes("date"))
  ) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

export const DataTable: React.FC<DataTableProps> = ({ columns, rows }) => {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
        <p className="text-sm font-medium text-slate-500">No records found.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[650px] border-collapse text-left text-sm">
        <thead className="bg-[#F5F8FC]">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#17365D]"
              >
                {formatColumnName(column)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr
              key={String(row.id ?? index)}
              className="transition-colors hover:bg-slate-50"
            >
              {columns.map((column) => {
                const value = row[column];

                const isStatus =
                  column === "is_active" || column === "email_verified_at";

                const isActive =
                  column === "is_active" ? Boolean(value) : Boolean(value);

                return (
                  <td
                    key={column}
                    className="whitespace-nowrap px-4 py-3 text-slate-600"
                  >
                    {isStatus ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {formatCellValue(value, column)}
                      </span>
                    ) : (
                      formatCellValue(value, column)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
