import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileCheck,
  ClipboardList,
  ShoppingCart,
  PackageCheck,
  ArrowRight,
} from "lucide-react";

export default function PurchaseDashboard() {
  const navigate = useNavigate();

  const modules = [
    {
      title: "Purchase Request",
      desc: "Create and manage purchase requests.",
      icon: ClipboardList,
      path: "/purchase/purchase-request",
      accent: "bg-blue-600 text-white",
    },
    {
      title: "Note for Approval",
      desc: "Send purchase notes for approval.",
      icon: FileCheck,
      path: "/purchase/note-for-approval",
      accent: "bg-purple-600 text-white",
    },
    {
      title: "Purchase Order",
      desc: "Generate and track purchase orders.",
      icon: ShoppingCart,
      path: "/purchase/purchase-order",
      accent: "bg-emerald-600 text-white",
    },
    {
      title: "Goods Receipt Note",
      desc: "Receive goods and verify deliveries.",
      icon: PackageCheck,
      path: "/purchase/goods-receipt-note",
      accent: "bg-amber-600 text-white",
    },
  ];

  return (
    <div className="min-h-screen wms-grid-bg px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-wider text-neutral-400">
            Purchase Dashboard
          </div>
          <h1 className="text-3xl font-semibold text-neutral-900 mt-1">
            Purchase Modules
          </h1>
          <p className="text-neutral-500 mt-2">
            Manage complete purchase workflow from request to goods receipt.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {modules.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.title}
                onClick={() => navigate(item.path)}
                className="bg-white border border-neutral-200 rounded-2xl p-6 text-left shadow-sm hover:shadow-md transition-all group"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.accent}`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="mt-5">
                  <h3 className="text-base font-semibold text-neutral-900">
                    {item.title}
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-neutral-400">
                    Open
                  </span>
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}