import React from "react";
import DashboardShell from "@/components/DashboardShell";
import CouriersStrip from "@/components/CouriersStrip";
import { useAuth } from "@/context/AuthContext";
import { Boxes } from "lucide-react";

export default function WarehouseDashboard() {
  const { user } = useAuth();

  return (
    <DashboardShell>
      <div className="max-w-5xl mx-auto pb-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400">Warehouse Staff</div>
            <div
              className="text-2xl font-semibold tracking-tight text-neutral-900"
              data-testid="welcome-heading"
            >
              Couriers from cashier
            </div>
            <div className="text-sm text-neutral-500">
              Hi {user?.full_name?.split(" ")[0] || "there"}, click a card to view all product
              details, edit or delete.
            </div>
          </div>
        </div>

        <CouriersStrip />
      </div>
    </DashboardShell>
  );
}
