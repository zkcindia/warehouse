import React from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { Crown, Sparkles } from "lucide-react";

export default function OwnerDashboard() {
  const { user } = useAuth();

  return (
    <DashboardShell>
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400">Owner Console</div>
            <div
              className="text-2xl font-semibold tracking-tight text-neutral-900"
              data-testid="welcome-heading"
            >
              Welcome, {user?.full_name}
            </div>
          </div>
        </div>
        <p className="text-neutral-500 mt-1">
          You are signed in as <span className="font-medium text-neutral-700">Owner</span>.
        </p>

        <div className="mt-8 bg-white border border-neutral-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-neutral-700">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Your workspace is being prepared</span>
          </div>
          <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
            This is a placeholder dashboard for the <strong>Owner</strong> role. The next pages
            (inventory overview, reports, staff management, product intake) will be added here in
            upcoming updates.
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["Inventory", "Reports", "Activity"].map((label) => (
              <div
                key={label}
                className="border border-dashed border-neutral-200 rounded-xl p-4 text-center text-xs text-neutral-400 bg-neutral-50"
              >
                {label} · coming soon
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
