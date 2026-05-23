import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import AddParcelModal from "@/components/AddParcelModal";
import ParcelDetailModal from "@/components/ParcelDetailModal";
import { useAuth } from "@/context/AuthContext";
import {
  Boxes,
  Plus,
  Package,
  Truck,
  CreditCard,
  Wallet,
  Smartphone,
  Search,
  Loader2,
  Trash2,
  Calendar,
  Image as ImageIcon,
  CircleCheck,
  CircleAlert,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

function PaymentBadge({ paid, mode }) {
  if (!paid) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <CircleAlert className="w-3 h-3" /> Unpaid
      </span>
    );
  }
  const Icon = mode === "upi" ? Smartphone : mode === "card" ? CreditCard : Wallet;
  const label = mode === "upi" ? "UPI" : mode === "card" ? "Card" : "Cash";
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CircleCheck className="w-3 h-3" /> Paid · <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-neutral-400">{label}</div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

export default function OwnerDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [detailParcel, setDetailParcel] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const reloadKey = useRef(0);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [parcelsRes, statsRes] = await Promise.all([
        axios.get(`${API}/parcels`, { headers: authHeaders() }),
        axios.get(`${API}/parcels/stats/summary`, { headers: authHeaders() }),
      ]);
      setParcels(parcelsRes.data);
      setStats(statsRes.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load parcels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreated = (newParcel) => {
    setParcels((p) => [newParcel, ...p]);
    reloadKey.current += 1;
    // refresh stats
    axios
      .get(`${API}/parcels/stats/summary`, { headers: authHeaders() })
      .then((r) => setStats(r.data))
      .catch(() => {});
  };

  const handleDelete = async (parcel) => {
    if (!window.confirm(`Delete invoice ${parcel.parcel_number}? This cannot be undone.`)) return;
    setDeletingId(parcel.id);
    try {
      await axios.delete(`${API}/parcels/${parcel.id}`, { headers: authHeaders() });
      toast.success(`${parcel.parcel_number} deleted`);
      setParcels((p) => p.filter((x) => x.id !== parcel.id));
      axios
        .get(`${API}/parcels/stats/summary`, { headers: authHeaders() })
        .then((r) => setStats(r.data))
        .catch(() => {});
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parcels;
    return parcels.filter(
      (p) =>
        p.parcel_number.toLowerCase().includes(q) ||
        p.company_name.toLowerCase().includes(q) ||
        p.products.some((pr) => pr.name.toLowerCase().includes(q))
    );
  }, [parcels, search]);

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400">Warehouse</div>
            <div
              className="text-2xl font-semibold tracking-tight text-neutral-900"
              data-testid="welcome-heading"
            >
              Welcome, {user?.full_name}
            </div>
            <div className="text-sm text-neutral-500">Manage incoming stock invoices and products.</div>
          </div>
        </div>
        <button
          data-testid="open-add-parcel"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> New stock invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Truck}
          label="Total invoices"
          value={stats?.total_parcels ?? "—"}
          accent="bg-neutral-900 text-white"
        />
        <StatCard
          icon={Package}
          label="Total packages"
          value={stats?.total_packages ?? "—"}
          accent="bg-blue-600 text-white"
        />
        <StatCard
          icon={Boxes}
          label="Total units"
          value={stats?.total_units ?? "—"}
          accent="bg-emerald-600 text-white"
        />
        <StatCard
          icon={CreditCard}
          label="Paid · Unpaid"
          value={`${stats?.paid ?? 0} · ${stats?.unpaid ?? 0}`}
          accent="bg-amber-600 text-white"
        />
      </div>

      {/* Parcels list */}
      <section className="bg-white border border-neutral-200 rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Stock invoices</h2>
            <p className="text-xs text-neutral-500">Newest first</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              data-testid="parcel-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, product, ID…"
              className="pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-neutral-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading parcels…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <Boxes className="w-6 h-6" />
            </div>
            <div className="mt-3 text-sm font-medium text-neutral-700">
              {parcels.length === 0 ? "No stock invoices yet" : "No matching invoices"}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {parcels.length === 0
                ? "Click “New stock invoice” to log incoming products."
                : "Try a different search keyword."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {filtered.map((p) => (
              <li
                key={p.id}
                data-testid={`parcel-row-${p.parcel_number}`}
                className="px-6 py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* photo */}
                  <div className="shrink-0">
                    {p.carton_photo ? (
                      <button
                        onClick={() => setDetailParcel(p)}
                        className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 hover:ring-2 hover:ring-neutral-900"
                      >
                        <img
                          src={p.carton_photo}
                          alt={p.parcel_number}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* main */}
                  <button
                    onClick={() => setDetailParcel(p)}
                    className="flex-1 min-w-0 text-left"
                  >
                    {/* Products as headline */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-semibold text-neutral-900 truncate"
                        title={p.products.map((pr) => `${pr.name} (${pr.quantity})`).join(", ")}
                      >
                        {p.products.slice(0, 3).map((pr) => pr.name).join(", ")}
                        {p.products.length > 3 && (
                          <span className="text-neutral-400 font-normal">
                            {" "}+{p.products.length - 3} more
                          </span>
                        )}
                      </span>
                      <PaymentBadge paid={p.payment_made} mode={p.payment_mode} />
                    </div>
                    {/* Secondary: company + counts */}
                    <div className="mt-1 text-xs text-neutral-600 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="font-medium text-neutral-700">
                          {p.company_name || <span className="text-neutral-400 italic font-normal">No company</span>}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-neutral-500">
                        <Boxes className="w-3.5 h-3.5" /> {p.total_quantity} units · {p.products.length} {p.products.length === 1 ? "product" : "products"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-neutral-500">
                        <Package className="w-3.5 h-3.5" /> {p.num_packages} packages
                      </span>
                      {p.submitted_by && (
                        <span className="inline-flex items-center gap-1 text-neutral-500">
                          <span className="text-neutral-400">By</span>
                          <span className="font-medium text-neutral-700">{p.submitted_by}</span>
                        </span>
                      )}
                    </div>
                    {/* Footer: small parcel id + datetime */}
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-400">
                      <span className="font-mono">{p.parcel_number}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.created_at).toLocaleString()}
                      </span>
                    </div>
                  </button>

                  <div className="shrink-0">
                    <button
                      data-testid={`delete-parcel-${p.parcel_number}`}
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-60"
                    >
                      {deletingId === p.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AddParcelModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={handleCreated}
      />
      <ParcelDetailModal parcel={detailParcel} onClose={() => setDetailParcel(null)} />
    </DashboardShell>
  );
}
