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
  Database,
  Check,
  Info,
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
  
  const alreadyInDataEntry = !!courier.sent_to_data_entry;
  const locked = alreadyInDataEntry;
  const canSubmit = cp.complete && items.length > 0 && !locked;

  const close = () => {
    if (sending) return;
    onClose?.();
  };

  const sendToDataEntry = async () => {
    setSending(true);
    try {
      await axios.patch(
        `${API}/couriers/${courier.id}/send-to-owner`,
        { sent: true },
        { headers: authHeaders() }
      );
      
      const res = await axios.patch(
        `${API}/couriers/${courier.id}/forward-to-data-entry`,
        { sent: true },
        { headers: authHeaders() }
      );
      
      toast.success(`${courier.courier_number} sent to Data Entry team`);
      onUpdated?.(res.data);
      onClose?.();
    } catch (e) {
      console.error("Send error:", e);
      toast.error(e?.response?.data?.detail || "Failed to send to Data Entry");
    } finally {
      setSending(false);
    }
  };

  // Helper function to display value or "—" for empty
  const displayValue = (value) => {
    if (value === undefined || value === null || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return value.toLocaleString();
    return value;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={close}
      data-testid="courier-sop-modal"
    >
      <div
        className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-100 bg-gradient-to-r from-neutral-900 to-neutral-800 text-white">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Final Review & Handover
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <div className="text-xl font-bold font-mono">
                {courier.courier_number}
              </div>
              {courier.courier_company && (
                <span className="inline-flex items-center gap-1 text-xs text-neutral-300">
                  <Truck className="w-3.5 h-3.5" /> {courier.courier_company}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white">
                <Package className="w-3 h-3" /> {courier.num_packages} packages
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Overview Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-blue-600 uppercase tracking-wider">Total Items</p>
                    <p className="text-2xl font-bold text-blue-900">{items.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-200 text-blue-700 flex items-center justify-center">
                    <Boxes className="w-5 h-5" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Total Units</p>
                    <p className="text-2xl font-bold text-emerald-900">{totalUnits}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-200 text-emerald-700 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
              </div>
              
              <div className={`bg-gradient-to-br rounded-xl p-3 border ${
                totalDamaged > 0 
                  ? "from-red-50 to-red-100 border-red-200" 
                  : "from-neutral-50 to-neutral-100 border-neutral-200"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Damaged Units</p>
                    <p className={`text-2xl font-bold ${totalDamaged > 0 ? "text-red-700" : "text-neutral-700"}`}>
                      {totalDamaged}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${
                    totalDamaged > 0 ? "bg-red-200 text-red-700" : "bg-neutral-200 text-neutral-600"
                  } flex items-center justify-center`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-purple-600 uppercase tracking-wider">Total Value</p>
                    <p className="text-xl font-bold text-purple-900">
                      {totalValue > 0 ? `₹${totalValue.toLocaleString()}` : "—"}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-purple-200 text-purple-700 flex items-center justify-center">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT COLUMN: Checklist Section */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ClipboardCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">Warehouse Checklist</h3>
                      <p className="text-[11px] text-neutral-500">Verify all steps before handover</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                    cp.complete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {cp.complete ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    <span>{cp.complete ? "All Completed" : `${cp.done}/${cp.total} Completed`}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {COURIER_CHECKLIST.map((item) => {
                    const isChecked = !!courier.checklist?.[item.key];
                    return (
                      <div
                        key={item.key}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                          isChecked
                            ? "bg-emerald-50/50 border-emerald-200"
                            : "bg-white border-neutral-200"
                        }`}
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                          isChecked ? "bg-emerald-500" : "border-2 border-neutral-300 bg-white"
                        }`}>
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium text-sm ${
                            isChecked ? "text-emerald-800" : "text-neutral-700"
                          }`}>
                            {item.label}
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {item.description}
                          </div>
                        </div>
                        {isChecked && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {courier.handled_by && (
                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-neutral-500" />
                      <span className="text-xs text-neutral-600">
                        Handled by: <span className="font-medium text-neutral-800">{courier.handled_by}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Products Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">Products & Items</h3>
                    <p className="text-[11px] text-neutral-500">
                      {items.length} item(s) · All details listed below
                    </p>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-8 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                    <Package className="w-12 h-12 mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm text-neutral-500">No items added yet</p>
                    <p className="text-xs text-neutral-400">Add items before completing SOP</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {items.map((product, idx) => (
                      <ProductDetailCard
                        key={product.id}
                        product={product}
                        index={idx}
                        displayValue={displayValue}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Info className="w-4 h-4 text-blue-500" />
              <span>
                {alreadyInDataEntry
                  ? "This courier is already in Data Entry."
                  : canSubmit
                  ? "✓ All checks passed. Ready to forward to Data Entry team."
                  : "⚠ Complete all checklist items and add at least one product to proceed."}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 rounded-lg border border-neutral-300 text-sm text-neutral-700 hover:bg-white transition-colors"
              >
                Close
              </button>
              {!locked && canSubmit && (
                <button
                  type="button"
                  onClick={sendToDataEntry}
                  disabled={sending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                  Forward to Data Entry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Product Detail Card - Basic Info and Quantity Info side by side
function ProductDetailCard({ product, index, displayValue }) {
  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-neutral-50 to-white border-b border-neutral-100">
        <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-sm font-bold">
          {index + 1}
        </div>
        {product.photo ? (
          <img
            src={product.photo}
            alt={product.name}
            className="w-12 h-12 rounded-lg object-cover border border-neutral-200"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-400 flex items-center justify-center">
            <ImageIcon className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-semibold text-neutral-900 text-lg">
            {product.name || "Untitled Product"}
          </h4>
          <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" /> Qty: {product.quantity}
            </span>
            {product.brand && (
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" /> {product.brand}
              </span>
            )}
            {product.category && (
              <span className="flex items-center gap-1">
                {product.category}
              </span>
            )}
          </div>
        </div>
        {product.damaged_count > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
            <AlertTriangle className="w-3 h-3" /> {product.damaged_count} damaged
          </span>
        )}
      </div>

      {/* Card Body - Basic Info and Quantity Info Side by Side */}
      <div className="p-5 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* LEFT COLUMN - Basic Information */}
          <div className="bg-neutral-50 rounded-xl p-4">
            <h5 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Info className="w-3.5 h-3.5" /> Basic Information
            </h5>
            <div className="space-y-2">
              <div className="flex justify-between items-start text-sm">
                <span className="text-neutral-500 w-1/3">Product Name:</span>
                <span className="font-medium text-neutral-800 w-2/3 text-right">{displayValue(product.name)}</span>
              </div>
              <div className="flex justify-between items-start text-sm">
                <span className="text-neutral-500 w-1/3">Brand:</span>
                <span className="text-neutral-800 w-2/3 text-right">{displayValue(product.brand)}</span>
              </div>
              <div className="flex justify-between items-start text-sm">
                <span className="text-neutral-500 w-1/3">Category:</span>
                <span className="text-neutral-800 w-2/3 text-right">{displayValue(product.category)}</span>
              </div>
              <div className="flex justify-between items-start text-sm">
                <span className="text-neutral-500 w-1/3">Code/SKU:</span>
                <span className="font-mono text-neutral-800 w-2/3 text-right">{displayValue(product.code)}</span>
              </div>
              <div className="flex justify-between items-start text-sm">
                <span className="text-neutral-500 w-1/3">Description:</span>
                <span className="text-neutral-800 w-2/3 text-right break-words">{displayValue(product.description)}</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Quantity Information */}
          <div className="bg-neutral-50 rounded-xl p-4">
            <h5 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Package className="w-3.5 h-3.5" /> Quantity Information
            </h5>
            <div className="space-y-2">
              <div className="flex justify-between items-start text-sm">
                <span className="text-neutral-500 w-1/3">Total Quantity:</span>
                <span className="font-semibold text-emerald-700 w-2/3 text-right">{product.quantity} units</span>
              </div>
              <div className="flex justify-between items-start text-sm">
                <span className="text-neutral-500 w-1/3">Damaged Count:</span>
                <span className={`font-medium w-2/3 text-right ${product.damaged_count > 0 ? "text-red-600" : "text-neutral-600"}`}>
                  {displayValue(product.damaged_count)}
                </span>
              </div>
              <div className="flex justify-between items-start text-sm">
                <span className="text-neutral-500 w-1/3">Damaged Status:</span>
                <span className="w-2/3 text-right">
                  {product.damaged ? (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <AlertTriangle className="w-3 h-3" /> Yes
                    </span>
                  ) : (
                    <span className="text-emerald-600">No</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-start text-sm pt-1 border-t border-neutral-200">
                <span className="text-neutral-500 w-1/3">Good Units:</span>
                <span className="font-semibold text-emerald-700 w-2/3 text-right">
                  {product.quantity - (product.damaged_count || 0)} units
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tags Section */}
        {(product.brand || product.category || product.code) && (
          <div className="mt-4 pt-3 border-t border-neutral-200 flex flex-wrap gap-2">
            <span className="text-[10px] text-neutral-500">Tags:</span>
            {product.brand && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                <Tag className="w-2.5 h-2.5" /> {product.brand}
              </span>
            )}
            {product.category && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                {product.category}
              </span>
            )}
            {product.code && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-neutral-100 text-neutral-700 font-mono">
                <Hash className="w-2.5 h-2.5" /> {product.code}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}