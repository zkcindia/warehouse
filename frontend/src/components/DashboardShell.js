import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { roleByKey } from "@/lib/roles";
import { LogOut, Package } from "lucide-react";
import { toast } from "sonner";

export default function DashboardShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = roleByKey(user?.role);
  const RoleIcon = role?.icon || Package;

  const handleLogout = () => {
    logout();
    toast.success("You have been logged out.");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Warehouse OS</div>
              <div className="text-xs text-neutral-500 -mt-0.5">{role?.label || "Dashboard"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-200 bg-white">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${role?.accent || "bg-neutral-900 text-white"}`}>
                <RoleIcon className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs text-neutral-700">
                <span className="font-medium">{user?.full_name}</span>
                <span className="text-neutral-400"> · {user?.email}</span>
              </div>
            </div>
            <button
              data-testid="logout-btn"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8 fade-in">{children}</main>
    </div>
  );
}
