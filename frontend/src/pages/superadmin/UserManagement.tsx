import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { DataTable, PageHeading, Panel, StatusMessage } from "./shared";

type User = Record<string, unknown>;

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/super-admin/users");
      const result = response.data?.data;

      const rows = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(response.data?.users)
            ? response.data.users
            : [];

      setUsers(rows);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Unable to load registered users.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <>
      <PageHeading
        title="User Management"
        description="View registered customers, farm administrators, and delivery personnel across CRAYTECH."
      />

      <Panel title="Registered users">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {users.length} user account(s) shown
          </p>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="rounded-lg bg-[#102744] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b3b63] disabled:opacity-50"
          >
            Refresh list
          </button>
        </div>

        <StatusMessage loading={loading} error={error} />

        {!loading && !error && (
          <DataTable
            columns={[
              "id",
              "name",
              "email",
              "role",
              "is_active",
              "email_verified_at",
            ]}
            rows={users}
          />
        )}
      </Panel>
    </>
  );
};

export default UserManagement;
