import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { DataTable, PageHeading, Panel, StatusMessage } from "./shared";

type Admin = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
};

const getRows = (response: any): Admin[] => {
  const result = response.data?.data;

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(response.data?.admins)) return response.data.admins;

  return [];
};

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadAdmins = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/super-admin/admins");
      setAdmins(getRows(response));
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Unable to load administrator accounts.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const openAddModal = () => {
    setEditingAdmin(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (admin: Admin) => {
    setEditingAdmin(admin);
    setForm({
      name: admin.name,
      email: admin.email,
      password: "",
      password_confirmation: "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingAdmin(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (editingAdmin) {
        const payload: Record<string, string> = {
          name: form.name,
          email: form.email,
        };

        if (form.password) {
          payload.password = form.password;
          payload.password_confirmation = form.password_confirmation;
        }

        await api.put(`/super-admin/admins/${editingAdmin.id}`, payload);
      } else {
        if (!form.password || !form.password_confirmation) {
          setError("Please enter and confirm the administrator password.");
          setSaving(false);
          return;
        }

        await api.post("/super-admin/admins", form);
      }

      closeModal();
      await loadAdmins();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()[0] : null;

      setError(
        String(
          firstError ||
            err.response?.data?.message ||
            "Unable to save administrator account.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (admin: Admin) => {
    const nextStatus = !admin.is_active;

    const confirmed = window.confirm(
      `${nextStatus ? "Activate" : "Deactivate"} ${admin.name}'s account?`,
    );

    if (!confirmed) return;

    setError("");

    try {
      await api.put(`/super-admin/admins/${admin.id}/toggle-status`, {
        is_active: nextStatus,
      });

      await loadAdmins();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Unable to update administrator status.",
      );
    }
  };

  return (
    <>
      <PageHeading
        title="Admin Management"
        description="Create and manage the farm administrator accounts responsible for CRAYTECH operations."
      />

      <Panel title="Administrator accounts">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {admins.length} administrator account(s) shown
          </p>

          <div className="flex gap-2">
            <button
              onClick={loadAdmins}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Refresh
            </button>

            <button
              onClick={openAddModal}
              className="rounded-lg bg-[#102744] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b3b63]"
            >
              + Add Administrator
            </button>
          </div>
        </div>

        <StatusMessage loading={loading} error={error} />

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {[
                    "ID",
                    "Name",
                    "Email",
                    "Role",
                    "Status",
                    "Created",
                    "Actions",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{admin.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {admin.name}
                    </td>
                    <td className="px-4 py-3">{admin.email}</td>
                    <td className="px-4 py-3 capitalize">{admin.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          admin.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {admin.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {admin.created_at
                        ? new Date(admin.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(admin)}
                          className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => toggleStatus(admin)}
                          className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                            admin.is_active
                              ? "border-red-200 text-red-700 hover:bg-red-50"
                              : "border-green-200 text-green-700 hover:bg-green-50"
                          }`}
                        >
                          {admin.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {admins.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No administrator accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingAdmin ? "Edit Administrator" : "Add Administrator"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingAdmin
                    ? "Update the administrator's account information."
                    : "Create a new farm administrator account."}
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="text-2xl text-slate-400 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {editingAdmin ? "New Password (optional)" : "Password"}
                </label>
                <input
                  type="password"
                  required={!editingAdmin}
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600"
                  placeholder={
                    editingAdmin
                      ? "Leave blank to keep current password"
                      : "At least 8 characters"
                  }
                />
              </div>

              {(form.password || !editingAdmin) && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={form.password_confirmation}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        password_confirmation: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600"
                    placeholder="Confirm password"
                  />
                </div>
              )}

              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#102744] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1b3b63] disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingAdmin
                      ? "Save Changes"
                      : "Create Administrator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminManagement;
