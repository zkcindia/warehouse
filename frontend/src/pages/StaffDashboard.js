import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import VerificationCourierModal from "@/components/VerificationCourierModal";
import {
  ShieldCheck,
  RefreshCw,
  Loader2,
  Truck,
  Package,
  Boxes,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Building2,
  Lock,
} from "lucide-react";

function StatTile({ icon: Icon, label, value, tone = "neutral" }) {
  const tones = {
    neutral: "bg-white border-neutral-200 text-neutral-700",
    primary: "bg-neutral-900 border-neutral-900 text-white",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  };
  const iconBg = {
    neutral: "bg-neutral-100 text-neutral-600",
    primary: "bg-white/10 text-white",
    warning: "bg-amber-200/60 text-amber-800",
    success: "bg-emerald-200/60 text-emerald-800",
  };
  return (
    <div className={`p-3.5 rounded-2xl border ${tones[tone]} flex items-start gap-3`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10.5px] uppercase tracking-wider opacity-80">{label}</div>
        <div className="mt-0.5 text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

function CourierRow({ courier, onOpen }) {
  const items = courier.products || [];
  const totalUnits = items.reduce((n, p) => n + (p.quantity || 0), 0);
  const verifiedCount = courier.verification_done_count || 0;
  const allVerified = items.length > 0 && verifiedCount === items.length;
  const totalAuto = items.reduce(
    (s, p) =>
      s +
      (p.final_price_manual != null
        ? p.final_price_manual * (p.quantity || 0)
        : p.final_total_auto || 0),
    0
  );
  return (
    <div
      data-testid={`verify-row-${courier.courier_number}`}
      className="flex items-center gap-3 px-4 py-3 border-t border-neutral-100 first:border-t-0 hover:bg-neutral-50/60 transition-colors"
    >
      <div className="min-w-0 flex-1">
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
            <Boxes className="w-3 h-3" /> {items.length} items · {totalUnits} units
          </span>
          {totalAuto > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-neutral-600">
              <IndianRupee className="w-3 h-3" />
              {totalAuto.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="text-neutral-400 ml-0.5">total</span>
            </span>
          )}
          {courier.verification_complete ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Lock className="w-3 h-3" /> Verified
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                allVerified
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <ClipboardCheck className="w-3 h-3" />
              {verifiedCount}/{items.length} items verified
            </span>
          )}
        </div>
        {courier.ready_for_verification_at && (
          <div className="mt-1 text-[11px] text-neutral-500">
            Ready since {new Date(courier.ready_for_verification_at).toLocaleString()}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onOpen(courier)}
        data-testid={`verify-open-${courier.courier_number}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 shrink-0"
      >
        {courier.verification_complete ? "Review" : "Verify items"}
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function StaffDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/verification/couriers`, {
        headers: authHeaders(),
      });
      setCouriers(res.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load couriers");
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = useMemo(
    () => couriers.filter((c) => !c.verification_complete),
    [couriers]
  );
  const completed = useMemo(
    () => couriers.filter((c) => c.verification_complete),
    [couriers]
  );

  const applyUpdate = (updated) => {
    setCouriers((arr) => arr.map((c) => (c.id === updated.id ? updated : c)));
    if (opened?.id === updated.id) setOpened(updated);
  };

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto pb-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-400">
                Verification
              </div>
              <div
                className="text-2xl font-semibold tracking-tight text-neutral-900"
                data-testid="welcome-heading"
              >
                Final verification
              </div>
              <div className="text-sm text-neutral-500">
                Hi {user?.full_name?.split(" ")[0] || "there"}, verify products
                physically and finalise their prices.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            data-testid="verify-refresh-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            icon={Building2}
            label="Pending verification"
            value={loading ? "…" : pending.length}
            tone="warning"
          />
          <StatTile
            icon={CheckCircle2}
            label="Verified couriers"
            value={loading ? "…" : completed.length}
            tone="success"
          />
          <StatTile
            icon={Boxes}
            label="Items pending"
            value={
              loading
                ? "…"
                : pending.reduce(
                    (n, c) =>
                      n +
                      Math.max(
                        0,
                        (c.products?.length || 0) -
                          (c.verification_done_count || 0)
                      ),
                    0
                  )
            }
            tone="neutral"
          />
          <StatTile
            icon={ShieldCheck}
            label="Items verified"
            value={
              loading
                ? "…"
                : couriers.reduce(
                    (n, c) => n + (c.verification_done_count || 0),
                    0
                  )
            }
            tone="primary"
          />
        </div>

        {/* Pending list */}
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-neutral-900">
                  Couriers awaiting verification
                </div>
                <div className="text-xs text-neutral-500">
                  Data Entry is complete for these · verify items and finalise
                  pricing.
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
              {pending.length} pending
            </span>
          </div>

          {loading ? (
            <div className="py-10 flex items-center justify-center text-neutral-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : pending.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-sm text-neutral-700 font-medium">
                Nothing to verify right now
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">
                When Data Entry marks all items as done, couriers will appear
                here.
              </div>
            </div>
          ) : (
            <div>
              {pending.map((c) => (
                <CourierRow key={c.id} courier={c} onOpen={setOpened} />
              ))}
            </div>
          )}
        </div>

        {/* Completed list */}
        {completed.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-neutral-900">
                    Recently verified
                  </div>
                  <div className="text-xs text-neutral-500">
                    Locked · click to review the final pricing.
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                {completed.length} done
              </span>
            </div>
            <div>
              {completed.map((c) => (
                <CourierRow key={c.id} courier={c} onOpen={setOpened} />
              ))}
            </div>
          </div>
        )}
      </div>

      <VerificationCourierModal
        courier={opened}
        onClose={() => setOpened(null)}
        onUpdated={applyUpdate}
        onCompleted={(updated) => {
          applyUpdate(updated);
          setOpened(null);
        }}
      />
    </DashboardShell>
  );
}
