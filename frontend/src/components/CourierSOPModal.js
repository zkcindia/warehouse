import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { COURIER_CHECKLIST, checklistProgress } from "@/lib/checklist";
import {
  X,
  FileText,
  CheckCircle2,
  Circle,
  Truck,
  Package,
  AlertTriangle,
  Image as ImageIcon,
  Send,
  Loader2,
  Lock,
  Hash,
  Tag,
  IndianRupee,
  ClipboardCheck,
  Boxes,
  User,
  XCircle,
  RotateCcw,
} from "lucide-react";

export default function CourierSOPModal({ courier, onClose, onUpdated }) {
  const { API, authHeaders } = useAuth();
  const [sending, setSending] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  if (!courier) return null;
  const cp = checklistProgress(courier.checklist);
  const items = courier.products || [];
  const totalUnits = items.reduce((n, p) => n + (p.quantity || 0), 0);
  const totalDamaged = items.reduce((n, p) => n + (p.damaged_count || 0), 0);
  const alreadySent = !!courier.sent_to_data_entry;

  const close = () => {
    if (sending || rejecting) return;
    setRejectMode(false);
    setRejectReason("");
    onClose?.();
  };

  const sendToDataEntry = async () => {
    setSending(true);
    try {
      const res = await axios.patch(
        `${API}/couriers/${courier.id}/send-to-data-entry`,
        { sent: true },
        { headers: authHeaders() }
      );
      toast.success(`${courier.courier_number} sent to Data Entry`);
      onUpdated?.(res.data);
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const rejectCourier = async () => {
    setRejecting(true);
    try {
      const res = await axios.patch(
        `${API}/couriers/${courier.id}/reject`,
        { reason: rejectReason.trim() || null },
        { headers: authHeaders() }
      );
      toast.success(`${courier.courier_number} sent back to Cashier`);
      onUpdated?.(res.data);
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to reject");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={close}
      data-testid="courier-sop-modal"
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> SOP review
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <div className="text-base font-semibold text-neutral-900 font-mono">
                {courier.courier_number}
              </div>
              {courier.courier_company && (
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                  <Truck className="w-3 h-3" /> {courier.courier_company}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
                <Package className="w-3 h-3" /> {courier.num_packages} pkgs
              </span>
              {alreadySent && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  <Lock className="w-3 h-3" /> Already sent to Data Entry
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
            data-testid="sop-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Section 1: Checklist details */}
          <section data-testid="sop-checklist-section">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    Checklist details
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {cp.done}/{cp.total} steps complete
                  </div>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                  cp.complete
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {cp.complete ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                {cp.complete ? "All passed" : `${cp.total - cp.done} pending`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COURIER_CHECKLIST.map((item) => {
                const ok = !!courier.checklist?.[item.key];
                return (
                  <div
                    key={item.key}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                      ok
                        ? "bg-emerald-50/60 border-emerald-200"
                        : "bg-neutral-50 border-neutral-200"
                    }`}
                  >
                    <div
                      className={`mt-0.5 ${
                        ok ? "text-emerald-600" : "text-neutral-300"
                      }`}
                    >
                      {ok ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          ok
                            ? "text-emerald-900 line-through decoration-emerald-400/50"
                            : "text-neutral-700"
                        }`}
                      >
                        {item.label}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {item.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 2: Courier / product details */}
          <section data-testid="sop-products-section">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    Courier / product details
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {items.length} item{items.length === 1 ? "" : "s"} ·{" "}
                    {totalUnits} units
                    {totalDamaged > 0 && (
                      <> · <span className="text-red-700">{totalDamaged} damaged</span></>
                    )}
                  </div>
                </div>
              </div>
              {courier.handled_by && (
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-600">
                  <User className="w-3 h-3" /> {courier.handled_by}
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-6 text-center text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
                No items added
              </div>
            ) : (
              <div className="border border-neutral-100 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium w-14">Photo</th>
                        <th className="text-left px-3 py-2 font-medium">Item</th>
                        <th className="text-left px-3 py-2 font-medium">Code</th>
                        <th className="text-right px-3 py-2 font-medium w-24">Qty</th>
                        <th className="text-left px-3 py-2 font-medium w-28">Damaged</th>
                        <th className="text-right px-3 py-2 font-medium w-24">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {items.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-50/60">
                          <td className="px-3 py-2.5">
                            {p.photo ? (
                              <img
                                src={p.photo}
                                alt={p.name}
                                className="w-9 h-9 rounded-md object-cover border border-neutral-100"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-md bg-neutral-50 border border-neutral-100 text-neutral-300 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-neutral-900 truncate">
                              {p.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-500">
                              {p.brand && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Tag className="w-3 h-3" /> {p.brand}
                                </span>
                              )}
                              {p.category && (
                                <span className="px-1.5 py-0.5 rounded-full bg-neutral-100">
                                  {p.category}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[12px] text-neutral-700">
                            {p.code ? (
                              <span className="inline-flex items-center gap-0.5">
                                <Hash className="w-3 h-3 text-neutral-300" />
                                {p.code}
                              </span>
                            ) : (
                              <span className="text-neutral-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-neutral-900 text-white text-xs font-semibold">
                              {p.quantity}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {p.damaged_count > 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
                                <AlertTriangle className="w-3 h-3" /> {p.damaged_count}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                OK
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right text-neutral-700">
                            {p.price != null ? (
                              <span className="inline-flex items-center gap-0.5">
                                <IndianRupee className="w-3 h-3" />
                                {p.price.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-neutral-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-white">
          {rejectMode ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-neutral-900">
                    Reject courier · send back to Cashier
                  </div>
                  <div className="text-[12px] text-neutral-500 mt-0.5">
                    The Cashier will see this courier with your reason and can
                    fix it before re-submitting.
                  </div>
                </div>
              </div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional but recommended) — e.g. wrong company name, missing slip photo, mismatched packages…"
                data-testid="sop-reject-reason"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectMode(false);
                    setRejectReason("");
                  }}
                  disabled={rejecting}
                  className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={rejectCourier}
                  disabled={rejecting}
                  data-testid="sop-confirm-reject-btn"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
                >
                  {rejecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Confirm reject
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] text-neutral-500">
                {alreadySent
                  ? "This courier is locked in Data Entry."
                  : cp.complete && items.length > 0
                  ? "Review and choose: accept (forward) or reject (send back)"
                  : "Complete checklist and add items to proceed."}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setRejectMode(true)}
                  disabled={alreadySent}
                  data-testid="sop-reject-btn"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 bg-white text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button
                  type="button"
                  onClick={sendToDataEntry}
                  disabled={
                    sending || alreadySent || !cp.complete || items.length === 0
                  }
                  data-testid="sop-send-data-entry-btn"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {alreadySent ? "Already accepted" : "Accept & forward"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
