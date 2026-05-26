import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Crown,
  Truck,
  Package,
  Boxes,
  Layers,
  IndianRupee,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Send,
  Building2,
  ClipboardList,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
  Hash,
  Tag,
  User,
  Lock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

function StatTile({ icon: Icon, label, value, tone = "neutral", testId }) {
  const tones = {
    neutral: "bg-white border-neutral-200 text-neutral-700",
    primary: "bg-neutral-900 border-neutral-900 text-white",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    danger: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };
  const iconBg = {
    neutral: "bg-neutral-100 text-neutral-600",
    primary: "bg-white/10 text-white",
    warning: "bg-amber-200/60 text-amber-800",
    success: "bg-emerald-200/60 text-emerald-800",
    danger: "bg-red-200/60 text-red-800",
    info: "bg-blue-200/60 text-blue-800",
  };
  return (
    <div
      data-testid={testId}
      className={`p-3.5 rounded-2xl border ${tones[tone]} flex items-start gap-3`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg[tone]}`}
      >
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10.5px] uppercase tracking-wider opacity-80">
          {label}
        </div>
        <div className="mt-0.5 text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

function ProductLine({ p, index }) {
  return (
    <div className="flex items-start gap-3 py-2.5 px-3 border-t border-neutral-100 first:border-t-0">
      {p.photo ? (
        <img
          src={p.photo}
          alt={p.name}
          className="w-10 h-10 rounded-md object-cover border border-neutral-100 shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-md bg-neutral-50 border border-neutral-100 text-neutral-300 flex items-center justify-center shrink-0">
          <ImageIcon className="w-4 h-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-sm bg-neutral-900 text-white text-[10px] font-bold">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-neutral-900 truncate">
            {p.name || "(Untitled item)"}
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-900 text-white">
            <Boxes className="w-2.5 h-2.5" /> {p.quantity}
          </span>
          {p.damaged_count > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
              <AlertTriangle className="w-2.5 h-2.5" /> {p.damaged_count}
            </span>
          )}
          {p.price != null && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-neutral-600">
              <IndianRupee className="w-2.5 h-2.5" />
              {p.price.toLocaleString()}
              <span className="text-neutral-400">/unit</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px] text-neutral-500">
          {p.brand && (
            <span className="inline-flex items-center gap-0.5">
              <Tag className="w-2.5 h-2.5" /> {p.brand}
            </span>
          )}
          {p.category && (
            <span className="px-1.5 py-0.5 rounded-full bg-neutral-100">
              {p.category}
            </span>
          )}
          {p.code && (
            <span className="font-mono inline-flex items-center gap-0.5">
              <Hash className="w-2.5 h-2.5" /> {p.code}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingCourierCard({ courier, onForward, busy }) {
  const [open, setOpen] = useState(true);
  const items = courier.products || [];
  const totalUnits = items.reduce((n, p) => n + (p.quantity || 0), 0);
  const totalDamaged = items.reduce((n, p) => n + (p.damaged_count || 0), 0);
  const totalValue = items.reduce(
    (s, p) => s + (p.price ? p.price * (p.quantity || 0) : 0),
    0
  );

  return (
    <div
      data-testid={`owner-pending-${courier.courier_number}`}
      className="border border-neutral-200 rounded-2xl bg-white overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3 bg-neutral-50/60">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-start gap-3 min-w-0 flex-1 text-left"
          data-testid={`owner-pending-toggle-${courier.courier_number}`}
        >
          <div className="mt-1 text-neutral-400 shrink-0">
            {open ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono font-semibold text-neutral-900">
                {courier.courier_number}
              </span>
              {courier.courier_company && (
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                  <Truck className="w-3 h-3" /> {courier.courier_company}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700">
                <Package className="w-3 h-3" /> {courier.num_packages} pkgs
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-900 text-white">
                <Boxes className="w-3 h-3" /> {items.length} items · {totalUnits}{" "}
                units
              </span>
              {totalDamaged > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                  <AlertTriangle className="w-3 h-3" /> {totalDamaged} damaged
                </span>
              )}
              {totalValue > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-neutral-600">
                  <IndianRupee className="w-3 h-3" />
                  {totalValue.toLocaleString()}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500 flex-wrap">
              {courier.sent_to_owner_by && (
                <span className="inline-flex items-center gap-1">
                  <User className="w-3 h-3" /> Submitted by{" "}
                  {courier.sent_to_owner_by}
                </span>
              )}
              {courier.sent_to_owner_at && (
                <span>
                  · {new Date(courier.sent_to_owner_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onForward(courier)}
          disabled={busy || !items.length}
          data-testid={`owner-forward-${courier.courier_number}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Send to Data Entry
        </button>
      </div>
      {open && (
        <div>
          {items.length === 0 ? (
            <div className="py-6 px-4 text-center text-sm text-neutral-400">
              No items in this courier.
            </div>
          ) : (
            items.map((p, idx) => <ProductLine key={p.id} p={p} index={idx} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function OwnerDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        axios.get(`${API}/owner/analytics`, { headers: authHeaders() }),
        axios.get(`${API}/owner/couriers/pending`, { headers: authHeaders() }),
      ]);
      setAnalytics(a.data || null);
      setPending(p.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load owner data");
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const forwardCourier = async (c) => {
    setBusyId(c.id);
    try {
      await axios.patch(
        `${API}/couriers/${c.id}/owner-forward`,
        { forward: true },
        { headers: authHeaders() }
      );
      toast.success(
        `${c.courier_number} forwarded to Data Entry (${
          c.products?.length || 0
        } items)`
      );
      setPending((arr) => arr.filter((x) => x.id !== c.id));
      // Refresh analytics in background
      axios
        .get(`${API}/owner/analytics`, { headers: authHeaders() })
        .then((r) => setAnalytics(r.data || null))
        .catch(() => {});
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to forward");
    } finally {
      setBusyId(null);
    }
  };

  const a = analytics || {};

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto pb-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-400">
                Owner
              </div>
              <div
                className="text-2xl font-semibold tracking-tight text-neutral-900"
                data-testid="welcome-heading"
              >
                Owner console
              </div>
              <div className="text-sm text-neutral-500">
                Hi {user?.full_name?.split(" ")[0] || "Owner"}, review
                warehouse-submitted couriers and forward them to Data Entry.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            data-testid="owner-refresh-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />{" "}
            Refresh
          </button>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatTile
            icon={Truck}
            label="Total couriers"
            value={loading ? "…" : a.total_couriers ?? 0}
            tone="primary"
            testId="stat-total-couriers"
          />
          <StatTile
            icon={ClipboardList}
            label="Pending warehouse"
            value={loading ? "…" : a.pending_warehouse ?? 0}
            tone="info"
            testId="stat-pending-warehouse"
          />
          <StatTile
            icon={Building2}
            label="Pending your review"
            value={loading ? "…" : a.pending_owner_review ?? 0}
            tone="warning"
            testId="stat-pending-owner"
          />
          <StatTile
            icon={Lock}
            label="In Data Entry"
            value={loading ? "…" : a.in_data_entry ?? 0}
            tone="success"
            testId="stat-in-data-entry"
          />
          <StatTile
            icon={Layers}
            label="Total items"
            value={loading ? "…" : a.total_items ?? 0}
            tone="neutral"
            testId="stat-total-items"
          />
          <StatTile
            icon={Boxes}
            label="Total units"
            value={loading ? "…" : a.total_units ?? 0}
            tone="neutral"
            testId="stat-total-units"
          />
          <StatTile
            icon={AlertTriangle}
            label="Damaged units"
            value={loading ? "…" : a.damaged_units ?? 0}
            tone={a.damaged_units > 0 ? "danger" : "neutral"}
            testId="stat-damaged"
          />
          <StatTile
            icon={XCircle}
            label="Open rejections"
            value={loading ? "…" : a.rejected_open ?? 0}
            tone={a.rejected_open > 0 ? "danger" : "neutral"}
            testId="stat-rejected"
          />
        </div>

        {/* Pending review section */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-neutral-900">
                  Couriers pending your review
                </div>
                <div className="text-xs text-neutral-500">
                  Submitted by Warehouse · review all product details and
                  forward the full list to Data Entry.
                </div>
              </div>
            </div>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700"
              data-testid="owner-pending-count"
            >
              {pending.length} pending
            </span>
          </div>

          {loading ? (
            <div className="py-10 flex items-center justify-center text-neutral-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : pending.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-neutral-200 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-sm text-neutral-700 font-medium">
                All caught up
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">
                When Warehouse staff complete SOP, couriers land here for you to
                forward.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((c) => (
                <PendingCourierCard
                  key={c.id}
                  courier={c}
                  busy={busyId === c.id}
                  onForward={forwardCourier}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
