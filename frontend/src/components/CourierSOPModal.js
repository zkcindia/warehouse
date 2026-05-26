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
  Layers,
  Building2,
} from "lucide-react";

export default function CourierSOPModal({ courier, onClose, onUpdated }) {
  const { API, authHeaders } = useAuth();
  const [sending, setSending] = useState(false);

  if (!courier) return null;
  const cp = checklistProgress(courier.checklist);
  const items = courier.products || [];
  const totalUnits = items.reduce((n, p) => n + (p.quantity || 0), 0);
  const totalDamaged = items.reduce((n, p) => n + (p.damaged_count || 0), 0);
  const totalValue = items.reduce(
    (sum, p) => sum + (p.price ? p.price * (p.quantity || 0) : 0),
    0
  );
  const alreadySentToOwner = !!courier.sent_to_owner;
  const alreadyInDataEntry = !!courier.sent_to_data_entry;
  const locked = alreadySentToOwner || alreadyInDataEntry;
  const canSubmit = cp.complete && items.length > 0 && !locked;

  const close = () => {
    if (sending) return;
    onClose?.();
  };

  const sendToOwner = async () => {
    setSending(true);
    try {
      const res = await axios.patch(
        `${API}/couriers/${courier.id}/send-to-data-entry`,
        { sent: true },
        { headers: authHeaders() }
      );
      toast.success(`${courier.courier_number} sent to Owner for review`);
      onUpdated?.(res.data);
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to submit");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={close}
      data-testid="courier-sop-modal"
    >
      <div
        className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col fade-in"
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
              {alreadyInDataEntry ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  <Lock className="w-3 h-3" /> In Data Entry
                </span>
              ) : alreadySentToOwner ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <Building2 className="w-3 h-3" /> Awaiting Owner review
                </span>
              ) : null}
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

          {/* Section 2: Summary tiles */}
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <SummaryTile
                icon={Layers}
                label="Items"
                value={items.length}
                tone="neutral"
              />
              <SummaryTile
                icon={Boxes}
                label="Total units"
                value={totalUnits}
                tone="neutral"
              />
              <SummaryTile
                icon={AlertTriangle}
                label="Damaged"
                value={totalDamaged}
                tone={totalDamaged > 0 ? "danger" : "neutral"}
              />
              <SummaryTile
                icon={IndianRupee}
                label="Total declared value"
                value={
                  totalValue > 0 ? `₹ ${totalValue.toLocaleString()}` : "—"
                }
                tone="neutral"
              />
            </div>
          </section>

          {/* Section 3: All product details, list-wise */}
          <section data-testid="sop-products-section">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    Product details — list view
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    All items entered by Warehouse · review before submitting to
                    Owner
                  </div>
                </div>
              </div>
              {courier.handled_by && (
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-600">
                  <User className="w-3 h-3" /> Handled by {courier.handled_by}
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-6 text-center text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
                No items added yet. Go back to the items step and add at least
                one item.
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((p, idx) => (
                  <ProductDetailCard key={p.id} product={p} index={idx} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-white">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[12px] text-neutral-500 min-w-0 flex-1">
              {alreadyInDataEntry
                ? "This courier is locked in Data Entry."
                : alreadySentToOwner
                ? "Awaiting Owner review — nothing more to do here."
                : canSubmit
                ? "Submit the full courier & product list to the Owner for review."
                : "Complete checklist and add at least one item to proceed."}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50"
                data-testid="sop-cancel-btn"
              >
                Close
              </button>
              {!locked && (
                <button
                  type="button"
                  onClick={sendToOwner}
                  disabled={sending || !canSubmit}
                  data-testid="sop-send-owner-btn"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Complete & send to Owner
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, tone = "neutral" }) {
  const tones = {
    neutral: "bg-neutral-50 border-neutral-100 text-neutral-700",
    danger: "bg-red-50 border-red-100 text-red-700",
  };
  return (
    <div className={`p-2.5 rounded-xl border ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-500">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="mt-1 text-base font-semibold text-neutral-900">
        {value ?? 0}
      </div>
    </div>
  );
}

function ProductDetailCard({ product: p, index }) {
  const hasMeta = p.brand || p.category || p.code;
  return (
    <div
      data-testid={`sop-product-${index}`}
      className="border border-neutral-100 rounded-xl bg-white p-3 hover:border-neutral-200 transition-colors"
    >
      <div className="flex items-start gap-3">
        {p.photo ? (
          <img
            src={p.photo}
            alt={p.name}
            className="w-16 h-16 rounded-lg object-cover border border-neutral-100 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-neutral-50 border border-neutral-100 text-neutral-300 flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-md bg-neutral-900 text-white text-[11px] font-bold">
              {index + 1}
            </span>
            <span className="text-sm font-semibold text-neutral-900 truncate">
              {p.name || "(Untitled item)"}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-900 text-white">
              <Boxes className="w-3 h-3" /> Qty {p.quantity}
            </span>
            {p.damaged_count > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
                <AlertTriangle className="w-3 h-3" /> {p.damaged_count} damaged
              </span>
            )}
            {p.price != null && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-neutral-600">
                <IndianRupee className="w-3 h-3" />
                {p.price.toLocaleString()}
                <span className="text-neutral-400">/unit</span>
              </span>
            )}
          </div>
          {hasMeta && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] text-neutral-600">
              {p.brand && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-50 border border-neutral-100">
                  <Tag className="w-3 h-3" /> {p.brand}
                </span>
              )}
              {p.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-50 border border-neutral-100">
                  {p.category}
                </span>
              )}
              {p.code && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-50 border border-neutral-100 font-mono">
                  <Hash className="w-3 h-3" /> {p.code}
                </span>
              )}
            </div>
          )}
          {p.description && (
            <div className="mt-1.5 text-[12px] text-neutral-600 line-clamp-2">
              {p.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
