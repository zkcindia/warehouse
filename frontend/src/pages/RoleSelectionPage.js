import React from "react";
import { useNavigate } from "react-router-dom";
import { ROLES } from "@/lib/roles";
import { ArrowRight, Package } from "lucide-react";

export default function RoleSelectionPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen wms-grid-bg flex flex-col">
      {/* Top bar */}
      <header className="px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Warehouse OS</div>
            <div className="text-xs text-neutral-500 -mt-0.5">Inventory & Operations</div>
          </div>
        </div>
        <div className="text-xs text-neutral-500">v1.0</div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="max-w-3xl text-center fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200 text-xs text-neutral-600 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Secure role-based access
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-neutral-900">
            Sign in to continue
          </h1>
          <p className="mt-3 text-neutral-500 text-base md:text-lg">
            Choose your role to access your dashboard.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 w-full max-w-7xl fade-in">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.key}
                data-testid={`role-card-${r.slug}`}
                onClick={() => navigate(`/login/${r.slug}`)}
                className="wms-card group text-left bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col gap-5 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${r.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-neutral-900">{r.label}</div>
                  <p className="mt-1 text-sm text-neutral-500 leading-relaxed">{r.description}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-neutral-100">
                  <span className="text-xs uppercase tracking-wider text-neutral-400">Login</span>
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-12 text-xs text-neutral-400">
          Don't have an account? Contact your Owner to get access.
        </div>
      </main>
    </div>
  );
}
