import React, { useEffect, useState } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { ROLES, roleByKey } from "@/lib/roles";
import { Crown, UserPlus, Trash2, Loader2, Users, Search } from "lucide-react";
import { toast } from "sonner";

const STAFF_ROLE_OPTIONS = ROLES.filter((r) => r.key !== "owner");

export default function OwnerDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "warehouse",
  });

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/owner/staff`, { headers: authHeaders() });
      setStaff(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password || !form.role) {
      toast.error("Please fill all fields");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setCreating(true);
    try {
      await axios.post(
        `${API}/owner/staff`,
        {
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
        },
        { headers: authHeaders() }
      );
      toast.success(`Staff account created for ${form.full_name}`);
      setForm({ full_name: "", email: "", password: "", role: "warehouse" });
      await loadStaff();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to create staff");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await axios.delete(`${API}/owner/staff/${id}`, { headers: authHeaders() });
      toast.success("Staff account removed");
      setStaff((s) => s.filter((u) => u.id !== id));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to remove");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = staff.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role_label.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardShell>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
          <Crown className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-400">Owner Console</div>
          <div className="text-2xl font-semibold tracking-tight text-neutral-900" data-testid="welcome-heading">
            Welcome, {user?.full_name}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create staff */}
        <section className="lg:col-span-1 bg-white border border-neutral-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-4 h-4 text-neutral-700" />
            <h2 className="text-base font-semibold text-neutral-900">Add staff</h2>
          </div>
          <p className="text-xs text-neutral-500 mb-5">Create login accounts for your team.</p>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-neutral-600">Full name</label>
              <input
                data-testid="staff-name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Aisha Khan"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600">Email</label>
              <input
                data-testid="staff-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@warehouse.com"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600">Temporary password</label>
              <input
                data-testid="staff-password"
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min. 6 characters"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600">Role</label>
              <select
                data-testid="staff-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {STAFF_ROLE_OPTIONS.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              data-testid="create-staff-btn"
              type="submit"
              disabled={creating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-60"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                </>
              ) : (
                <>Create account</>
              )}
            </button>
          </form>
        </section>

        {/* Staff list */}
        <section className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-700" />
              <h2 className="text-base font-semibold text-neutral-900">Staff accounts</h2>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                {staff.length}
              </span>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                data-testid="staff-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 w-44"
              />
            </div>
          </div>
          <p className="text-xs text-neutral-500 mb-4">Manage who can sign in.</p>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-neutral-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading staff…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
              {staff.length === 0 ? "No staff yet. Create the first account on the left." : "No results match your search."}
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-xl overflow-hidden">
              {filtered.map((u) => {
                const role = roleByKey(u.role);
                const Icon = role?.icon || Users;
                return (
                  <div key={u.id} data-testid={`staff-row-${u.email}`} className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-50">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${role?.accent || "bg-neutral-900 text-white"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-neutral-900 truncate">{u.full_name}</div>
                      <div className="text-xs text-neutral-500 truncate">{u.email}</div>
                    </div>
                    <div className="hidden sm:block text-xs text-neutral-500">{u.role_label}</div>
                    <button
                      data-testid={`delete-staff-${u.email}`}
                      onClick={() => handleDelete(u.id, u.full_name)}
                      disabled={deletingId === u.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-60"
                    >
                      {deletingId === u.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
