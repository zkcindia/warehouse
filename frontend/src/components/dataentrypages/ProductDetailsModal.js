import React from "react";
import {
  Package,
  X,
  Tag,
  Grid,
  Hash,
  FileText,
  Building2,
  Receipt,
  Calendar,
  IndianRupee,
  AlertCircle,
  CreditCard,
  Truck,
  User,
  Layers,
  Clock,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";

export default function ProductDetailsModal({ product, onClose }) {
  if (!product) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "N/A";
    return `₹${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const DetailRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-3 py-2 border-b border-neutral-100 last:border-b-0">
      <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-neutral-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
        <div className="text-sm font-medium text-neutral-900 break-words">{value || "N/A"}</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-neutral-900 to-neutral-800 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              {product.photo ? (
                <img src={product.photo} alt={product.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Package className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{product.name || "Untitled Product"}</div>
              <div className="text-xs text-neutral-300 flex items-center gap-2">
                <span className="font-mono">{product.courier_number}</span>
                {product.courier_company && <><span>•</span><span>{product.courier_company}</span></>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {/* Left Column - Product Image & Basic Info */}
            <div className="md:col-span-1 p-6 bg-neutral-50 border-r border-neutral-200">
              <div className="space-y-4">
                <div className="aspect-square rounded-xl bg-white border border-neutral-200 overflow-hidden">
                  {product.photo ? (
                    <img src={product.photo} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-50">
                      <Package className="w-16 h-16 text-neutral-300" />
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Quantity</span>
                    <span className="text-xl font-bold text-neutral-900">{product.quantity || 0}</span>
                  </div>
                  {product.unit && <div className="text-xs text-neutral-500 mt-1">Unit: {product.unit}</div>}
                </div>

                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Price / Unit</span>
                    <span className="text-xl font-bold text-emerald-600">{formatCurrency(product.price)}</span>
                  </div>
                  {product.cost_per_unit && (
                    <div className="text-xs text-neutral-500 mt-1">Cost: {formatCurrency(product.cost_per_unit)}</div>
                  )}
                </div>

                <div className="bg-white rounded-xl p-4 border border-neutral-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.data_entry_done && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                        <CheckCircle2 className="w-3 h-3" /> Data Entry Done
                      </span>
                    )}
                    {product.verification_done && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - All Details */}
            <div className="md:col-span-2 p-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Complete Product Details
              </h3>
              <div className="space-y-1">
                <DetailRow label="Product Name" value={product.name} icon={Package} />
                <DetailRow label="Brand" value={product.brand} icon={Tag} />
                <DetailRow label="Category" value={product.category} icon={Grid} />
                <DetailRow label="Product Code" value={product.code} icon={Hash} />
                <DetailRow label="Description" value={product.description} icon={FileText} />
                <DetailRow label="HSN Code" value={product.hsn_code} icon={Hash} />
                <DetailRow label="Supplier" value={product.supplier} icon={Building2} />
                <DetailRow label="Invoice Number" value={product.invoice_number} icon={Receipt} />
                <DetailRow label="Invoice Date" value={formatDate(product.invoice_date)} icon={Calendar} />
                <DetailRow label="PO Number" value={product.po_number} icon={FileText} />
                <DetailRow label="Batch Number" value={product.batch_number} icon={Hash} />
                <DetailRow label="Expiry Date" value={formatDate(product.expiry_date)} icon={Calendar} />
                <DetailRow label="MRP" value={formatCurrency(product.mrp)} icon={IndianRupee} />
                <DetailRow label="GST %" value={product.gst_percent ? `${product.gst_percent}%` : "N/A"} icon={AlertCircle} />
                <DetailRow label="GST Amount" value={formatCurrency(product.gst_amount)} icon={CreditCard} />
                <DetailRow label="IGST %" value={product.igst_percent ? `${product.igst_percent}%` : "N/A"} icon={AlertCircle} />
                <DetailRow label="Total Invoice Amount" value={formatCurrency(product.total_invoice_amount)} icon={IndianRupee} />
                <DetailRow label="Discount %" value={product.discount_percent ? `${product.discount_percent}%` : "N/A"} icon={ChevronLeft} />
                <DetailRow label="Transportation Method" value={product.transportation_method} icon={Truck} />
                <DetailRow label="Transporter Name" value={product.transporter_name} icon={User} />
                <DetailRow label="Transportation Cost" value={formatCurrency(product.transportation_cost)} icon={Truck} />
                <DetailRow label="Remarks" value={product.remarks} icon={FileText} />
                <DetailRow label="Created At" value={formatDate(product.created_at)} icon={Clock} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50">
          <div className="text-xs text-neutral-500">Product ID: {product.id || "N/A"}</div>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}