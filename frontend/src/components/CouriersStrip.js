import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import CourierDetailsModal from "@/components/CourierDetailsModal";
import CourierChecklistModal from "@/components/CourierChecklistModal";
import { checklistProgress } from "@/lib/checklist";
import {
  Truck,
  Loader2,
  RefreshCw,
  CircleCheck,
  CircleAlert,
  Smartphone,
  CreditCard,
  Wallet,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";

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

function ChecklistBadge({ checklist }) {
  const { done, total, complete } = checklistProgress(checklist);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
        complete
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : done > 0
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-neutral-50 text-neutral-600 border-neutral-200"
      }`}
      data-testid="card-checklist-badge"
    >
      <ClipboardCheck className="w-3 h-3" /> {done}/{total}
    </span>
  );
}

export default function CouriersStrip() {
  const { API, authHeaders } = useAuth();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [checklistFor, setChecklistFor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/couriers`, { headers: authHeaders() });
      setCouriers(res.data || []);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const applyUpdate = (updated) =>
    setCouriers((arr) => arr.map((c) => (c.id === updated.id ? updated : c)));

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-semibold text-neutral-900">Couriers from cashier</div>
            <div className="text-xs text-neutral-500">
              Click a card to view details, or use the checklist button below.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
          title="Refresh"
          data-testid="couriers-refresh-btn"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center text-neutral-400 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading couriers…
        </div>
      ) : couriers.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-neutral-200 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-2">
            <Truck className="w-5 h-5" />
          </div>
          <div className="text-sm text-neutral-600 font-medium">No couriers yet</div>
          <div className="text-xs text-neutral-400 mt-0.5">
            When Cashier logs a courier, it will show here.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {couriers.map((c) => {
            const cp = checklistProgress(c.checklist);
            return (
              <div
                key={c.id}
                data-testid={`courier-card-${c.courier_number}`}
                className="group bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-900 hover:shadow-md transition-all flex flex-col"
              >
                {/* Clickable details area */}
                <button
                  type="button"
                  onClick={() => setOpen(c)}
                  data-testid={`courier-pill-${c.courier_number}`}
                  className="text-left w-full"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-900 text-white text-xs font-bold font-mono shrink-0">
                        {c.courier_number.replace("CRX-", "")}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-neutral-900 font-mono leading-tight">
                          {c.courier_number}
                        </div>
                        {c.courier_company ? (
                          <div className="text-[11px] text-neutral-500 truncate flex items-center gap-1">
                            <Truck className="w-3 h-3" /> {c.courier_company}
                          </div>
                        ) : (
                          <div className="text-[11px] text-neutral-400 italic">No company</div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-900 transition-colors shrink-0" />
                  </div>

                  {/* Payment + Checklist badges */}
                  <div className="border-t border-neutral-100 pt-3 flex items-center justify-between gap-2">
                    <PaymentBadge paid={c.payment_made} mode={c.payment_mode} />
                    <ChecklistBadge checklist={c.checklist} />
                  </div>
                </button>

                {/* Checklist action button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChecklistFor(c);
                  }}
                  data-testid={`open-checklist-btn-${c.courier_number}`}
                  className={`mt-3 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    cp.complete
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      : "bg-neutral-900 border-neutral-900 text-white hover:bg-neutral-800"
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {cp.complete ? "Checklist complete" : "Open checklist"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <CourierDetailsModal
        courier={open}
        onClose={() => setOpen(null)}
        onUpdated={applyUpdate}
        onDeleted={(id) => setCouriers((arr) => arr.filter((c) => c.id !== id))}
      />
      <CourierChecklistModal
        courier={checklistFor}
        onClose={() => setChecklistFor(null)}
        onUpdated={applyUpdate}
      />
    </div>
  );
}
