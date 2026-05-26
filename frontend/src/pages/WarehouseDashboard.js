import React, { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import CouriersStrip from "@/components/CouriersStrip";
import { useAuth } from "@/context/AuthContext";
import { Boxes } from "lucide-react";

export default function WarehouseDashboard() {
  const { user } = useAuth();
  const [, setNonce] = useState(0);

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
              Hi {user?.full_name?.split(" ")[0] || "there"}, accept couriers →
              run checklist → add items → SOP review → send to Data Entry.
            </div>
          </div>
        </div>

        <CouriersStrip onCouriersChange={() => setNonce((n) => n + 1)} />
      </div>
    </DashboardShell>
  );
}
