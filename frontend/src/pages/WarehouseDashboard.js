import React, { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import CouriersStrip from "@/components/CouriersStrip";
import InventoryTable from "@/components/InventoryTable";
import { useAuth } from "@/context/AuthContext";
import { Boxes, Truck, Package } from "lucide-react";

const TABS = [
  { key: "couriers", label: "Couriers", Icon: Truck },
  { key: "inventory", label: "Inventory", Icon: Package },
];

export default function WarehouseDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("couriers");

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto pb-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
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
              Hi {user?.full_name?.split(" ")[0] || "there"}, manage couriers
              and inventory below.
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-neutral-100 border border-neutral-200 mb-5"
          role="tablist"
          aria-label="Warehouse sections"
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                data-testid={`tab-${t.key}`}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-white/60"
                }`}
              >
                <t.Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "couriers" ? <CouriersStrip /> : <InventoryTable />}
      </div>
    </DashboardShell>
  );
}
