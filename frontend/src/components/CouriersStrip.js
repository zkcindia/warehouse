import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import CourierDetailsModal from "@/components/CourierDetailsModal";
import {
  Truck,
  Loader2,
  RefreshCw,
  CircleCheck,
  CircleAlert,
  Package,
  Boxes,
} from "lucide-react";

export default function CouriersStrip() {
  const { API, authHeaders } = useAuth();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // courier object when modal open

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

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-purple-600 text-white flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">Couriers from cashier</div>
            <div className="text-[11px] text-neutral-500">
              Click an ID to view details, edit or delete.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-4 flex items-center justify-center text-neutral-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading couriers…
        </div>
      ) : couriers.length === 0 ? (
        <div className="py-4 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
          No couriers logged by Cashier yet.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {couriers.map((c) => {
            const paid = c.payment_made;
            return (
              <button
                key={c.id}
                type="button"
                data-testid={`courier-pill-${c.courier_number}`}
                onClick={() => setOpen(c)}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white hover:border-neutral-900 hover:shadow-sm transition-all text-left"
                title={`${c.courier_number} · ${c.products.length} items · ${c.total_quantity} units`}
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-900 text-white text-[10px] font-mono">
                  {c.courier_number.replace("CRX-", "")}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold text-neutral-900 font-mono">
                    {c.courier_number}
                  </span>
                  <span className="text-[10px] text-neutral-500 flex items-center gap-1.5">
                    <Package className="w-3 h-3" /> {c.num_packages}
                    <Boxes className="w-3 h-3 ml-1" /> {c.total_quantity}
                    {paid ? (
                      <CircleCheck className="w-3 h-3 text-emerald-600 ml-1" />
                    ) : (
                      <CircleAlert className="w-3 h-3 text-amber-600 ml-1" />
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <CourierDetailsModal
        courier={open}
        onClose={() => setOpen(null)}
        onUpdated={(updated) =>
          setCouriers((arr) => arr.map((c) => (c.id === updated.id ? updated : c)))
        }
        onDeleted={(id) => setCouriers((arr) => arr.filter((c) => c.id !== id))}
      />
    </div>
  );
}
