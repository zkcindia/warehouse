import React from "react";
import {
  X,
  Package,
  Boxes,
  Calendar,
  CreditCard,
  Smartphone,
  Wallet,
  CircleCheck,
  CircleAlert,
  Building2,
  User,
} from "lucide-react";

export default function ParcelDetailModal({ parcel, onClose }) {
  if (!parcel) return null;
  const mode = parcel.payment_mode;
  const ModeIcon = mode === "upi" ? Smartphone : mode === "card" ? CreditCard : Wallet;
  const modeLabel = mode === "upi" ? "UPI" : mode === "card" ? "Card" : mode === "cash" ? "Cash" : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[90vh] overflow-hidden flex flex-col fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400">Parcel detail</div>
            <div className="text-base font-semibold text-neutral-900">{parcel.parcel_number}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {parcel.carton_photo && (
            <img
              src={parcel.carton_photo}
              alt={parcel.parcel_number}
              className="w-full max-h-64 object-cover rounded-xl border border-neutral-200"
            />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <InfoTile icon={Building2} label="Company" value={parcel.company_name} />
            <InfoTile icon={Package} label="Packages" value={parcel.num_packages} />
            <InfoTile icon={Boxes} label="Total units" value={parcel.total_quantity} />
            <InfoTile
              icon={Calendar}
              label="Received at"
              value={new Date(parcel.created_at).toLocaleString()}
            />
            <InfoTile icon={User} label="Logged by" value={parcel.created_by_name} />
            <InfoTile
              icon={parcel.payment_made ? CircleCheck : CircleAlert}
              label="Payment"
              value={
                parcel.payment_made ? (
                  <span className="inline-flex items-center gap-1">
                    Paid · <ModeIcon className="w-3.5 h-3.5" /> {modeLabel}
                  </span>
                ) : (
                  "Unpaid"
                )
              }
            />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">
              Products ({parcel.products.length})
            </div>
            <div className="border border-neutral-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Product ID</th>
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-right px-3 py-2 font-medium">Qty</th>
                    <th className="text-left px-3 py-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {parcel.products.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50">
                      <td className="px-3 py-2 font-mono text-[11px] text-neutral-500">
                        {p.id.slice(0, 8)}…
                      </td>
                      <td className="px-3 py-2 text-neutral-800">{p.name}</td>
                      <td className="px-3 py-2 text-right text-neutral-800">{p.quantity}</td>
                      <td className="px-3 py-2 text-neutral-500">
                        {new Date(p.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-400">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="mt-1 text-sm font-medium text-neutral-800 break-words">{value}</div>
    </div>
  );
}
