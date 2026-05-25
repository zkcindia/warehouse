import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import CouriersStrip from "@/components/CouriersStrip";
import InventoryTable from "@/components/InventoryTable";
import AddInventoryItemDialog from "@/components/AddInventoryItemDialog";
import { useAuth } from "@/context/AuthContext";
import { Boxes, Plus, Lock, PackagePlus } from "lucide-react";

const CHECKLIST_KEYS = [
  "master_carton",
  "label_check",
  "bills_check",
  "quantity_verify",
  "damage_check",
  "photo_taken",
];

export default function WarehouseDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [couriers, setCouriers] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const loadCouriers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/couriers`, { headers: authHeaders() });
      setCouriers(res.data || []);
    } catch (e) {
      // silent
    }
  }, [API, authHeaders]);

  useEffect(() => {
    loadCouriers();
  }, [loadCouriers, refreshNonce]);

  const handleCouriersChange = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  const eligibleCount = useMemo(
    () =>
      couriers.filter((c) => {
        const chk = c.checklist || {};
        return CHECKLIST_KEYS.every((k) => !!chk[k]);
      }).length,
    [couriers]
  );

  const canAdd = eligibleCount > 0;

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto pb-10 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400">
              Warehouse Staff
            </div>
            <div
              className="text-2xl font-semibold tracking-tight text-neutral-900"
              data-testid="welcome-heading"
            >
              Warehouse workspace
            </div>
            <div className="text-sm text-neutral-500">
              Hi {user?.full_name?.split(" ")[0] || "there"}, complete the
              checklist on each courier, then add items below.
            </div>
          </div>
        </div>

        {/* Couriers section (cards) */}
        <CouriersStrip onCouriersChange={handleCouriersChange} />

        {/* Add item CTA bar — between courier cards and global table */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  canAdd
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {canAdd ? (
                  <PackagePlus className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-900">
                  {canAdd ? "Add items to inventory" : "Add items locked"}
                </div>
                <div className="text-xs text-neutral-500">
                  {canAdd
                    ? `${eligibleCount} courier${
                        eligibleCount === 1 ? "" : "s"
                      } ready · same name auto-merges with existing stock.`
                    : "Complete a courier checklist above to unlock item entry."}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              disabled={!canAdd}
              data-testid="dashboard-add-item-btn"
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                canAdd
                  ? "bg-neutral-900 text-white hover:bg-neutral-800"
                  : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
              }`}
            >
              <Plus className="w-4 h-4" />
              Add item
            </button>
          </div>
        </div>

        {/* Global inventory table */}
        <InventoryTable refreshNonce={refreshNonce} />
      </div>

      <AddInventoryItemDialog
        open={addOpen}
        couriers={couriers}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setRefreshNonce((n) => n + 1);
        }}
      />
    </DashboardShell>
  );
}
