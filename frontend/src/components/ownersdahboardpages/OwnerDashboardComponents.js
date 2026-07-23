import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Truck,
  Package,
  Boxes,
  IndianRupee,
  AlertTriangle,
  Loader2,
  Send,
  ChevronRight,
  ChevronDown,
  User,
  Check,
  X,
  Edit,
  Upload,
  Paperclip,
  XCircle,
  Image as ImageIcon,
  Hash,
  Tag,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import CourierForm from "@/components/CourierForm";

// ==================== STAT TILE ====================
export function StatTile({ icon: Icon, label, value, tone = "neutral" }) {
  const tones = {
    primary: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    info: "bg-cyan-50 text-cyan-600",
    warning: "bg-amber-50 text-amber-600",
    success: "bg-emerald-50 text-emerald-600",
    neutral: "bg-neutral-100 text-neutral-600",
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${tones[tone]} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
          <div className="text-lg font-semibold text-neutral-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

// ==================== PRODUCT LINE ====================
export function ProductLine({ p, index }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b border-neutral-100 last:border-0 text-xs hover:bg-neutral-50">
      <span className="text-neutral-400 w-6">{index + 1}.</span>
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="font-medium text-neutral-800 truncate">
          {p.product_name || p.name || "—"}
        </span>
        <span className="text-neutral-400">
          {p.quantity || 0} × {p.price ? `₹${p.price}` : "—"}
        </span>
        {p.damaged_count > 0 && (
          <span className="text-red-600 text-[10px] font-medium">({p.damaged_count} damaged)</span>
        )}
      </div>
    </div>
  );
}

// ==================== PENDING CASHIER COURIER CARD ====================
export function PendingCashierCourierCard({
  courier,
  onApprove,
  onReject,
  onEdit,
  onUploadListWithRate,
  onUploadListWithoutRate,
  onUploadInvoice,
  onGstToggle,
  busy,
}) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const items = courier.products || [];
  const totalDamaged = items.reduce((n, p) => n + (p.damaged_count || 0), 0);

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(courier, rejectReason);
      setShowRejectModal(false);
      setRejectReason("");
    }
  };

  return (
    <>
      <div className="border border-purple-200 rounded-2xl bg-purple-50/30 overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 py-3 bg-purple-100/30 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono font-semibold text-neutral-900">{courier.courier_number}</span>
              {courier.courier_company && (
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                  <Truck className="w-3 h-3" /> {courier.courier_company}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700">
                <Package className="w-3 h-3" /> {courier.num_packages} pkgs
              </span>
              {totalDamaged > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                  <AlertTriangle className="w-3 h-3" /> {totalDamaged} damaged
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500 flex-wrap">
              {courier.created_at && <span>Date: {new Date(courier.created_at).toLocaleString()}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <select
              value={courier.document_type || "GST"}
              onChange={(e) => onGstToggle(courier, e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium bg-white"
            >
              <option value="GST">GST</option>
              <option value="SEMI_GST">SEMI GST</option>
              <option value="CHALLAN">CHALLAN</option>
            </select>

            <button
              onClick={() => onUploadListWithRate(courier)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" /> List With Rate
            </button>

            <button
              onClick={() => onUploadListWithoutRate(courier)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-medium hover:bg-cyan-700 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" /> List Without Rate
            </button>

            <button
              onClick={() => onUploadInvoice(courier)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <Paperclip className="w-3.5 h-3.5" /> Upload Invoice
            </button>

            <button
              onClick={() => onEdit(courier)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700"
            >
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>

            <button
              onClick={() => onApprove(courier)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
            </button>

            <button
              onClick={() => setShowRejectModal(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700"
            >
              <X className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Reject Courier</h3>
                <p className="text-sm text-neutral-500">{courier.courier_number} will be sent back to Cashier</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Reason for rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Missing invoice, wrong courier company, incomplete details..."
                className="w-full p-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none"
                rows={4}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
                className="px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== PENDING WAREHOUSE COURIER CARD ====================
export function PendingWarehouseCourierCard({ courier, onForward, onEdit, busy }) {
  const [open, setOpen] = useState(true);
  const items = courier.products || [];
  const totalUnits = items.reduce((n, p) => n + (p.quantity || 0), 0);
  const totalDamaged = items.reduce((n, p) => n + (p.damaged_count || 0), 0);
  const totalValue = items.reduce((s, p) => s + (p.price ? p.price * (p.quantity || 0) : 0), 0);

  return (
    <div className="border border-neutral-200 rounded-2xl bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3 bg-neutral-50/60 flex-wrap">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-start gap-3 min-w-0 flex-1 text-left"
        >
          <div className="mt-1 text-neutral-400 shrink-0">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono font-semibold text-neutral-900">{courier.courier_number}</span>
              {courier.courier_company && (
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                  <Truck className="w-3 h-3" /> {courier.courier_company}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700">
                <Package className="w-3 h-3" /> {courier.num_packages} pkgs
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-900 text-white">
                <Boxes className="w-3 h-3" /> {items.length} items · {totalUnits} units
              </span>
              {totalDamaged > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                  <AlertTriangle className="w-3 h-3" /> {totalDamaged} damaged
                </span>
              )}
              {totalValue > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-neutral-600">
                  <IndianRupee className="w-3 h-3" /> {totalValue.toLocaleString()}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500 flex-wrap">
              {courier.sent_to_owner_by && (
                <span className="inline-flex items-center gap-1">
                  <User className="w-3 h-3" /> Submitted by {courier.sent_to_owner_by}
                </span>
              )}
              {courier.sent_to_owner_at && <span>· {new Date(courier.sent_to_owner_at).toLocaleString()}</span>}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(courier)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700"
          >
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={() => onForward(courier)}
            disabled={busy || !items.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 shrink-0"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send to Data Entry
          </button>
        </div>
      </div>
      {open && (
        <div>
          {items.length === 0 ? (
            <div className="py-6 px-4 text-center text-sm text-neutral-400">No items in this courier.</div>
          ) : (
            items.map((p, idx) => <ProductLine key={p.id} p={p} index={idx} />)
          )}
        </div>
      )}
    </div>
  );
}

// ==================== EDIT COURIER MODAL ====================
export function EditCourierModal({ courier, onClose, onSave }) {
  const { API, authHeaders } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      const res = await axios.patch(`${API}/couriers/${courier.id}`, payload, {
        headers: authHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      toast.success("Courier updated successfully");
      onSave(res.data);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update courier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 bg-gradient-to-r from-purple-700 to-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <Edit className="w-5 h-5" />
            <div>
              <div className="text-sm font-semibold">Edit Courier</div>
              <div className="text-xs text-purple-200">{courier.courier_number}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <CourierForm
            initialData={courier}
            onSubmit={handleSave}
            onCancel={onClose}
            submitLabel="Save Changes"
            isSubmitting={saving}
            readOnlyProducts={true}
          />
        </div>
      </div>
    </div>
  );
}