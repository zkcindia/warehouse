import React from "react";
import DashboardShell from "@/components/DashboardShell";
import ParcelsView from "@/components/ParcelsView";

export default function WarehouseDashboard() {
  return (
    <DashboardShell>
      <ParcelsView
        canAdd={true}
        canDelete={true}
        title="Warehouse Staff"
        subtitle="Log incoming stock invoices and manage products."
        emptyTitle="No stock invoices yet"
        emptyHint="Click “New stock invoice” to log incoming products."
      />
    </DashboardShell>
  );
}
