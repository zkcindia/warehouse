import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ShieldCheck,
  RefreshCw,
  Loader2,
  Truck,
  Package,
  Boxes,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Building2,
  Lock,
  Edit,
  Save,
  X,
  Hash,
  Tag,
  Percent,
  DollarSign,
  FileText,
  Info,
  Calculator,
  Minus,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
} from "lucide-react";

function StatTile({ icon: Icon, label, value, tone = "neutral" }) {
  const tones = {
    neutral: "bg-white border-neutral-200 text-neutral-700",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };
  const iconBg = {
    neutral: "bg-neutral-100 text-neutral-600",
    warning: "bg-amber-200/60 text-amber-800",
    success: "bg-emerald-200/60 text-emerald-800",
    info: "bg-blue-200/60 text-blue-800",
  };
  return (
    <div className={`p-3.5 rounded-2xl border ${tones[tone]} flex items-start gap-3`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10.5px] uppercase tracking-wider opacity-80">{label}</div>
        <div className="mt-0.5 text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

// Confirmation Modal Component
function ConfirmationModal({ courier, summary, items, onConfirm, onCancel }) {
  const [isConfirming, setIsConfirming] = useState(false);
  
  const handleConfirm = async () => {
    setIsConfirming(true);
    await onConfirm();
    setIsConfirming(false);
  };
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5" />
            <div>
              <div className="text-sm font-semibold">Confirm Final Verification</div>
              <div className="text-xs text-emerald-200">Please review all details before finalizing</div>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-800">Ready for Final Verification!</h4>
                <p className="text-xs text-emerald-600">All items have been verified. Confirm to complete the verification process.</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-neutral-800 mb-2">Courier Information</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-neutral-500">Courier Number:</span> <span className="font-mono font-medium">{courier.courier_number}</span></div>
              <div><span className="text-neutral-500">Courier Company:</span> <span className="font-medium">{courier.courier_company || "—"}</span></div>
              <div><span className="text-neutral-500">Packages:</span> <span className="font-medium">{courier.num_packages}</span></div>
              <div><span className="text-neutral-500">Total Items:</span> <span className="font-medium">{summary.totalCount}</span></div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Final Price Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-600">Auto-calculated Total:</span><span className="font-semibold">₹{summary.totalAutoValue.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-neutral-600">Final Verified Total:</span><span className="font-semibold text-emerald-700">₹{summary.totalManualValue.toLocaleString()}</span></div>
              {summary.difference !== 0 && (
                <div className="flex justify-between pt-1 border-t border-blue-200">
                  <span className="text-neutral-600">Adjustment:</span>
                  <span className={`font-semibold ${summary.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {summary.difference > 0 ? '▲' : '▼'} ₹{Math.abs(summary.difference).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-neutral-800 mb-2">Verified Items ({summary.totalCount})</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {items.map((item, idx) => {
                const costPerUnit = item.cost_per_unit || 0;
                const gstPercent = item.gst_percent || 0;
                const transportCost = item.transportation_cost || 0;
                const quantity = item.quantity || 0;
                const discountPercent = item.discount_percent || 0;
                const discountAmount = (costPerUnit * discountPercent) / 100;
                const costAfterDiscount = costPerUnit - discountAmount;
                const gstAmount = (costAfterDiscount * gstPercent) / 100;
                const transportPerUnit = quantity > 0 ? transportCost / quantity : 0;
                const autoPrice = costAfterDiscount + gstAmount + transportPerUnit;
                const finalPrice = item.final_price_manual || autoPrice;
                const totalValue = finalPrice * quantity;
                const isManual = item.final_price_manual !== null && item.final_price_manual !== undefined;
                
                return (
                  <div key={item.id} className={`p-2 rounded-lg border ${isManual ? 'bg-blue-50/30 border-blue-200' : 'bg-neutral-50 border-neutral-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                        <span className="font-medium text-sm text-neutral-900">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700">₹{totalValue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-neutral-500">
                      <span>Qty: {quantity}</span>
                      <span>Rate: ₹{finalPrice.toLocaleString()}/unit</span>
                      {isManual && <span className="text-blue-600 text-[10px]">(Manual Override)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 bg-neutral-50">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-neutral-300 text-sm text-neutral-700 hover:bg-white">Cancel</button>
          <button onClick={handleConfirm} disabled={isConfirming} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Confirm & Complete Verification
          </button>
        </div>
      </div>
    </div>
  );
}

// Verification Item Card
function VerificationItemCard({ item, index, courierId, onUpdate, isVerified }) {
  const { API, authHeaders } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [formData, setFormData] = useState({
    final_price_manual: item.final_price_manual || "",
    cgst_per_unit: item.cgst_per_unit || "",
    sgst_per_unit: item.sgst_per_unit || "",
    transport_per_unit: item.transport_per_unit || "",
    verification_notes: item.verification_notes || "",
  });

  const costPerUnit = item.cost_per_unit || 0;
  const gstPercent = item.gst_percent || 0;
  const discountPercent = item.discount_percent || 0;
  const quantity = item.quantity || 0;
  const transportationCost = item.transportation_cost || 0;
  const supplier = item.supplier || "—";
  const invoiceNumber = item.invoice_number || "—";
  const invoiceDate = item.invoice_date || "—";
  const poNumber = item.po_number || "—";
  const batchNumber = item.batch_number || "—";
  const expiryDate = item.expiry_date || "—";
  const hsnCode = item.hsn_code || "—";
  const unit = item.unit || "—";
  const remarks = item.remarks || "—";
  
  const discountAmount = (costPerUnit * discountPercent) / 100;
  const costAfterDiscount = costPerUnit - discountAmount;
  const gstAmount = (costAfterDiscount * gstPercent) / 100;
  const cgstAmount = gstAmount / 2;
  const sgstAmount = gstAmount / 2;
  const transportPerUnit = quantity > 0 ? transportationCost / quantity : 0;
  const autoFinalPrice = costAfterDiscount + gstAmount + transportPerUnit;
  const manualFinalPrice = formData.final_price_manual ? parseFloat(formData.final_price_manual) : null;
  const finalPrice = manualFinalPrice !== null ? manualFinalPrice : autoFinalPrice;
  const finalTotal = finalPrice * quantity;
  const priceDifference = manualFinalPrice !== null ? manualFinalPrice - autoFinalPrice : 0;
  const priceDifferencePercent = autoFinalPrice > 0 ? (priceDifference / autoFinalPrice * 100) : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (formData.final_price_manual !== "" && formData.final_price_manual !== item.final_price_manual) {
        payload.final_price_manual = parseFloat(formData.final_price_manual);
      }
      if (formData.cgst_per_unit !== "" && formData.cgst_per_unit !== item.cgst_per_unit) {
        payload.cgst_per_unit = parseFloat(formData.cgst_per_unit);
      }
      if (formData.sgst_per_unit !== "" && formData.sgst_per_unit !== item.sgst_per_unit) {
        payload.sgst_per_unit = parseFloat(formData.sgst_per_unit);
      }
      if (formData.transport_per_unit !== "" && formData.transport_per_unit !== item.transport_per_unit) {
        payload.transport_per_unit = parseFloat(formData.transport_per_unit);
      }
      if (formData.verification_notes !== item.verification_notes) {
        payload.verification_notes = formData.verification_notes;
      }
      
      const res = await axios.patch(
        `${API}/couriers/${courierId}/items/${item.id}/verification`,
        payload,
        { headers: authHeaders() }
      );
      toast.success(`${item.name} verification updated`);
      onUpdate(res.data);
      setIsEditing(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setSaving(true);
    try {
      const payload = { verification_done: true };
      if (formData.final_price_manual !== "" && formData.final_price_manual !== item.final_price_manual) {
        payload.final_price_manual = parseFloat(formData.final_price_manual);
      }
      if (formData.cgst_per_unit !== "" && formData.cgst_per_unit !== item.cgst_per_unit) {
        payload.cgst_per_unit = parseFloat(formData.cgst_per_unit);
      }
      if (formData.sgst_per_unit !== "" && formData.sgst_per_unit !== item.sgst_per_unit) {
        payload.sgst_per_unit = parseFloat(formData.sgst_per_unit);
      }
      if (formData.transport_per_unit !== "" && formData.transport_per_unit !== item.transport_per_unit) {
        payload.transport_per_unit = parseFloat(formData.transport_per_unit);
      }
      if (formData.verification_notes !== item.verification_notes) {
        payload.verification_notes = formData.verification_notes;
      }
      
      const res = await axios.patch(
        `${API}/couriers/${courierId}/items/${item.id}/verification`,
        payload,
        { headers: authHeaders() }
      );
      toast.success(`${item.name} verified successfully`);
      onUpdate(res.data);
      setIsEditing(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to verify");
    } finally {
      setSaving(false);
    }
  };

  if (isVerified && !isEditing) {
    return (
      <div className="border border-emerald-200 rounded-xl overflow-hidden bg-emerald-50/30">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900">{item.name}</h4>
                <p className="text-xs text-neutral-500">Qty: {quantity} {unit}</p>
              </div>
            </div>
            <button onClick={() => setIsEditing(true)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100">
              <Edit className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <div className="bg-white rounded-lg p-2"><p className="text-[9px] text-neutral-500">Final Price/Unit</p><p className="font-bold text-emerald-700">₹{finalPrice.toLocaleString()}</p></div>
            <div className="bg-white rounded-lg p-2"><p className="text-[9px] text-neutral-500">Total Value</p><p className="font-semibold">₹{finalTotal.toLocaleString()}</p></div>
            <div className="bg-white rounded-lg p-2"><p className="text-[9px] text-neutral-500">CGST/Unit</p><p className="text-sm">₹{(item.cgst_per_unit || cgstAmount).toLocaleString()}</p></div>
            <div className="bg-white rounded-lg p-2"><p className="text-[9px] text-neutral-500">SGST/Unit</p><p className="text-sm">₹{(item.sgst_per_unit || sgstAmount).toLocaleString()}</p></div>
            <div className="bg-white rounded-lg p-2"><p className="text-[9px] text-neutral-500">Transport/Unit</p><p className="text-sm">₹{(item.transport_per_unit || transportPerUnit).toLocaleString()}</p></div>
          </div>
          {item.verification_notes && <p className="text-xs text-neutral-600 mt-3 bg-white/50 rounded-lg p-2">📝 {item.verification_notes}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-white border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">{index + 1}</div>
          <div>
            <h4 className="font-semibold text-neutral-900">{item.name}</h4>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Qty: {quantity} {unit}</span>
              {item.brand && <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {item.brand}</span>}
              {hsnCode !== "—" && <span className="font-mono">HSN: {hsnCode}</span>}
              <button onClick={() => setShowAllDetails(!showAllDetails)} className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1">
                <Info className="w-3 h-3" /> {showAllDetails ? "Hide details" : "Show all details"}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} disabled={saving} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"><X className="w-4 h-4" /></button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"><Edit className="w-4 h-4" /></button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Final Price Section */}
        <div className={`rounded-lg p-4 ${isEditing ? 'bg-blue-50 border-2 border-blue-300' : 'bg-emerald-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-bold flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-600" /> FINAL PRICE PER UNIT (Manual Override)</h5>
            {priceDifference !== 0 && !isEditing && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${priceDifference > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {priceDifference > 0 ? '▲' : '▼'} {Math.abs(priceDifferencePercent).toFixed(1)}%
              </span>
            )}
          </div>
          
          {isEditing ? (
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-lg font-bold">₹</span>
                <input type="number" step="0.01" value={formData.final_price_manual} onChange={(e) => setFormData(prev => ({ ...prev, final_price_manual: e.target.value }))} placeholder={`Auto: ₹${autoFinalPrice.toFixed(2)}`} className="w-full pl-8 pr-3 py-3 rounded-lg border border-blue-300 text-lg font-bold bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                <p className="text-neutral-500">Auto-calculated: ₹{autoFinalPrice.toLocaleString()}</p>
                <p className="text-neutral-500">Total Value: ₹{(finalPrice * quantity).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-bold text-emerald-700">₹{finalPrice.toLocaleString()}<span className="text-sm text-neutral-400 ml-1">/unit</span></p>
              <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                <p className="text-neutral-500">Total Value: <span className="font-semibold">₹{finalTotal.toLocaleString()}</span></p>
                {manualFinalPrice !== null && <p className="text-neutral-500">Auto would be: ₹{autoFinalPrice.toLocaleString()}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Price Calculation Breakdown */}
        <div className="bg-neutral-50 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2 flex items-center gap-1"><Calculator className="w-3 h-3" /> Price Calculation Breakdown</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center pb-1 border-b border-neutral-200"><span className="text-neutral-500">Cost per Unit:</span><span className="font-medium">₹{costPerUnit.toLocaleString()}</span></div>
            {discountPercent > 0 && (<div className="flex justify-between items-center text-green-600"><span>Discount ({discountPercent}%): <Minus className="w-3 h-3 inline" /></span><span>- ₹{discountAmount.toLocaleString()}</span></div>)}
            <div className="flex justify-between items-center"><span className="text-neutral-500">Cost after Discount:</span><span className="font-medium">₹{costAfterDiscount.toLocaleString()}</span></div>
            {gstPercent > 0 && (<div className="flex justify-between items-center"><span className="text-neutral-500">GST ({gstPercent}%):</span><span className="font-medium">+ ₹{gstAmount.toLocaleString()}</span></div>)}
            {transportationCost > 0 && (<div className="flex justify-between items-center"><span className="text-neutral-500">Transportation:</span><span className="font-medium">+ ₹{transportPerUnit.toLocaleString()}/unit</span></div>)}
            <div className="flex justify-between items-center pt-1 border-t border-neutral-300 font-bold"><span className="text-emerald-700">Auto Price/Unit:</span><span className="text-emerald-700">₹{autoFinalPrice.toLocaleString()}</span></div>
          </div>
        </div>

        {/* GST & Transportation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-50 rounded-lg p-3">
            <h5 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2 flex items-center gap-1"><Percent className="w-3 h-3" /> GST Breakdown</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Total GST/Unit:</span><span className="font-medium">₹{gstAmount.toLocaleString()}</span></div>
              <div className="flex justify-between pl-3"><span className="text-neutral-500">CGST (50%):</span>{isEditing ? <input type="number" step="0.01" value={formData.cgst_per_unit} onChange={(e) => setFormData(prev => ({ ...prev, cgst_per_unit: e.target.value }))} className="w-28 px-2 py-1 rounded border border-neutral-300 text-right text-sm" placeholder={cgstAmount.toFixed(2)} /> : <span className="font-medium">₹{(item.cgst_per_unit || cgstAmount).toLocaleString()}</span>}</div>
              <div className="flex justify-between pl-3"><span className="text-neutral-500">SGST (50%):</span>{isEditing ? <input type="number" step="0.01" value={formData.sgst_per_unit} onChange={(e) => setFormData(prev => ({ ...prev, sgst_per_unit: e.target.value }))} className="w-28 px-2 py-1 rounded border border-neutral-300 text-right text-sm" placeholder={sgstAmount.toFixed(2)} /> : <span className="font-medium">₹{(item.sgst_per_unit || sgstAmount).toLocaleString()}</span>}</div>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-3">
            <h5 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2 flex items-center gap-1"><Truck className="w-3 h-3" /> Transportation</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Method:</span><span className="font-medium">{item.transportation_method || "—"}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Total Cost:</span><span className="font-medium">₹{transportationCost.toLocaleString()}</span></div>
              <div className="flex justify-between items-center"><span className="text-neutral-500">Cost per Unit:</span>{isEditing ? <input type="number" step="0.01" value={formData.transport_per_unit} onChange={(e) => setFormData(prev => ({ ...prev, transport_per_unit: e.target.value }))} className="w-28 px-2 py-1 rounded border border-neutral-300 text-right text-sm" placeholder={transportPerUnit.toFixed(2)} /> : <span className="font-medium">₹{(item.transport_per_unit || transportPerUnit).toLocaleString()}</span>}</div>
            </div>
          </div>
        </div>

        {showAllDetails && (
          <div className="bg-neutral-50 rounded-lg p-3">
            <h5 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2 flex items-center gap-1"><Building2 className="w-3 h-3" /> Purchase Details</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-[10px] text-neutral-500">Supplier</p><p className="font-medium">{supplier}</p></div>
              <div><p className="text-[10px] text-neutral-500">Invoice No.</p><p className="font-mono text-sm">{invoiceNumber}</p></div>
              <div><p className="text-[10px] text-neutral-500">Invoice Date</p><p>{invoiceDate}</p></div>
              <div><p className="text-[10px] text-neutral-500">PO Number</p><p className="font-mono text-sm">{poNumber}</p></div>
              <div><p className="text-[10px] text-neutral-500">Batch Number</p><p className="font-mono text-sm">{batchNumber}</p></div>
              <div><p className="text-[10px] text-neutral-500">Expiry Date</p><p>{expiryDate}</p></div>
              <div><p className="text-[10px] text-neutral-500">HSN Code</p><p className="font-mono text-sm">{hsnCode}</p></div>
            </div>
          </div>
        )}

        {remarks !== "—" && (
          <div className="bg-neutral-50 rounded-lg p-3">
            <h5 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">Remarks</h5>
            <p className="text-sm text-neutral-600">{remarks}</p>
          </div>
        )}

        {/* Verification Notes */}
        <div className="bg-neutral-50 rounded-lg p-3">
          <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider flex items-center gap-1 mb-2"><FileText className="w-3 h-3" /> Verification Notes</label>
          {isEditing ? <textarea value={formData.verification_notes} onChange={(e) => setFormData(prev => ({ ...prev, verification_notes: e.target.value }))} placeholder="Add verification notes..." rows={2} className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm resize-none" /> : <p className="text-sm text-neutral-600">{item.verification_notes || "No verification notes added"}</p>}
        </div>

        {/* Verify Button */}
        {!isVerified && (
          <div className="flex justify-end pt-2">
            <button onClick={handleVerify} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Verify & Complete Item
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Modal Component
function VerificationCourierModal({ courier, onClose, onUpdated, onCompleted, api, authHeaders }) {
  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const itemsPerPage = 5;

  useEffect(() => {
    if (courier) setItems(courier.products || []);
  }, [courier]);

  const summary = useMemo(() => {
    let totalAuto = 0, totalManual = 0, verified = 0;
    items.forEach(item => {
      const costPerUnit = item.cost_per_unit || 0;
      const gstPercent = item.gst_percent || 0;
      const transportationCost = item.transportation_cost || 0;
      const quantity = item.quantity || 0;
      const discountPercent = item.discount_percent || 0;
      const discountAmount = (costPerUnit * discountPercent) / 100;
      const costAfterDiscount = costPerUnit - discountAmount;
      const gstAmount = (costAfterDiscount * gstPercent) / 100;
      const transportPerUnit = quantity > 0 ? transportationCost / quantity : 0;
      const autoPrice = costAfterDiscount + gstAmount + transportPerUnit;
      const finalPrice = item.final_price_manual || autoPrice;
      totalAuto += autoPrice * quantity;
      totalManual += finalPrice * quantity;
      if (item.verification_done) verified++;
    });
    return { totalAutoValue: totalAuto, totalManualValue: totalManual, difference: totalManual - totalAuto, verifiedCount: verified, totalCount: items.length };
  }, [items]);

  if (!courier) return null;

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const currentItems = items.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const allVerified = items.length > 0 && items.every(i => i.verification_done);

  const handleItemUpdate = (updatedItem) => {
    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    onUpdated?.(updatedItem);
  };

  const handleCompleteVerification = async () => {
    if (!allVerified) {
      toast.error("Please verify all items before completing");
      return;
    }
    setShowConfirmModal(false);
    try {
      const res = await axios.patch(
        `${api}/couriers/${courier.id}/complete-verification`,
        { complete: true },
        { headers: authHeaders() }
      );
      toast.success(`✨ Verification completed successfully! Courier ${courier.courier_number} has been locked. ✨`);
      onCompleted?.(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to complete verification");
    }
  };

  const openConfirmModal = () => {
    if (!allVerified) {
      toast.error("Please verify all items before completing");
      return;
    }
    setShowConfirmModal(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-100 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-emerald-200">Final Verification</div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <div className="text-xl font-bold font-mono">{courier.courier_number}</div>
                {courier.courier_company && <span className="text-xs text-emerald-200"><Truck className="w-3.5 h-3.5 inline mr-1" />{courier.courier_company}</span>}
              </div>
              <div className="text-xs text-emerald-200 mt-1">{courier.num_packages} packages · {items.length} items</div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"><X className="w-5 h-5" /></button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 bg-neutral-50 border-b border-neutral-200">
            <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-[10px] text-neutral-500 uppercase">Total Items</p><p className="text-2xl font-bold">{summary.totalCount}</p><p className="text-xs text-emerald-600">{summary.verifiedCount} verified</p></div>
            <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-[10px] text-neutral-500 uppercase">Auto Total</p><p className="text-lg font-semibold">₹{summary.totalAutoValue.toLocaleString()}</p></div>
            <div className={`bg-white rounded-xl p-3 shadow-sm ${summary.difference !== 0 ? 'ring-2 ring-amber-200' : ''}`}>
              <p className="text-[10px] text-neutral-500 uppercase">Final Total</p>
              <p className="text-lg font-bold text-emerald-700">₹{summary.totalManualValue.toLocaleString()}</p>
              {summary.difference !== 0 && <p className={`text-xs font-medium ${summary.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>{summary.difference > 0 ? '▲' : '▼'} ₹{Math.abs(summary.difference).toLocaleString()}</p>}
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-[10px] text-neutral-500 uppercase">Progress</p>
              <div className="h-2 bg-neutral-200 rounded-full mt-2"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(summary.verifiedCount / summary.totalCount) * 100}%` }} /></div>
              <p className="text-xs text-neutral-500 mt-1">{Math.round((summary.verifiedCount / summary.totalCount) * 100)}% complete</p>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-8 text-neutral-400"><Package className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No items to verify</p></div>
            ) : (
              items.map((item, idx) => <VerificationItemCard key={item.id} item={item} index={idx} courierId={courier.id} onUpdate={handleItemUpdate} isVerified={item.verification_done} />)
            )}
          </div>

          {/* Summary Table */}
          <div className="border-t border-neutral-200 bg-neutral-50">
            <div className="flex items-center justify-between px-5 py-3"><h4 className="text-sm font-semibold">All Products Summary</h4><span className="text-xs text-neutral-500">{items.length} items total</span></div>
            <div className="overflow-x-auto px-5 pb-4">
              <table className="w-full min-w-[800px] border-collapse">
                <thead className="bg-neutral-100">
                  <tr className="border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold">#</th><th className="px-3 py-2 text-left text-xs font-semibold">Product</th><th className="px-3 py-2 text-left text-xs font-semibold">Qty</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Auto Price</th><th className="px-3 py-2 text-left text-xs font-semibold">Final Price</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Total Value</th><th className="px-3 py-2 text-center text-xs font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, idx) => {
                    const costPerUnit = item.cost_per_unit || 0;
                    const gstPercent = item.gst_percent || 0;
                    const transportationCost = item.transportation_cost || 0;
                    const quantity = item.quantity || 0;
                    const discountPercent = item.discount_percent || 0;
                    const discountAmount = (costPerUnit * discountPercent) / 100;
                    const costAfterDiscount = costPerUnit - discountAmount;
                    const gstAmount = (costAfterDiscount * gstPercent) / 100;
                    const transportPerUnit = quantity > 0 ? transportationCost / quantity : 0;
                    const autoPrice = costAfterDiscount + gstAmount + transportPerUnit;
                    const finalPrice = item.final_price_manual || autoPrice;
                    const totalValue = finalPrice * quantity;
                    return (
                      <tr key={item.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="px-3 py-2 text-sm">{currentPage * itemsPerPage + idx + 1}</td>
                        <td className="px-3 py-2"><div className="flex items-center gap-2">{item.photo ? <img src={item.photo} className="w-6 h-6 rounded object-cover" /> : <Package className="w-4 h-4 text-neutral-400" />}<span className="text-sm">{item.name}</span></div></td>
                        <td className="px-3 py-2 text-sm">{quantity}</td>
                        <td className="px-3 py-2 text-sm">₹{autoPrice.toLocaleString()}</td>
                        <td className="px-3 py-2"><span className={`text-sm font-medium ${finalPrice !== autoPrice ? 'text-blue-600' : ''}`}>₹{finalPrice.toLocaleString()}</span></td>
                        <td className="px-3 py-2 text-sm font-semibold text-emerald-700">₹{totalValue.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">{item.verification_done ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Verified</span> : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700"><AlertCircle className="w-3 h-3" /> Pending</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 bg-white">
                <div className="text-xs text-neutral-500">Page {currentPage + 1} of {totalPages}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-white disabled:opacity-50"><ArrowLeft className="w-4 h-4" /> Previous</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-white disabled:opacity-50">Next <ArrowRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-neutral-100 bg-white">
            <div className="flex items-center justify-between">
              <div className="text-xs">
                {allVerified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-4 h-4" /> All items verified! Ready to complete.</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="w-4 h-4" /> {summary.totalCount - summary.verifiedCount} item(s) pending verification</span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm hover:bg-white">Close</button>
                {!courier.verification_complete && (
                  <button onClick={openConfirmModal} disabled={!allVerified} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                    <Lock className="w-4 h-4" /> Complete Verification
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmationModal
          courier={courier}
          summary={summary}
          items={items}
          onConfirm={handleCompleteVerification}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </>
  );
}

// Main Dashboard Component
export default function StaffDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/verification/couriers`, { headers: authHeaders() });
      // Filter ONLY couriers that have pending items (not fully verified)
      const filteredCouriers = (res.data || []).filter(courier => {
        const items = courier.products || [];
        const verifiedCount = courier.verification_done_count || 0;
        // Only show if not all items are verified AND verification is not complete
        return verifiedCount < items.length && !courier.verification_complete;
      });
      setCouriers(filteredCouriers);
    } catch (e) {
      toast.error("Failed to load couriers");
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]);

  useEffect(() => { load(); }, [load]);

  const pending = useMemo(() => couriers.filter(c => !c.verification_complete), [couriers]);
  const completed = useMemo(() => couriers.filter(c => c.verification_complete), [couriers]);

  const applyUpdate = (updated) => {
    setCouriers(arr => arr.map(c => c.id === updated.id ? updated : c));
    if (opened?.id === updated.id) setOpened(updated);
  };

  const handleCompleted = (updated) => {
    // Remove from pending list immediately
    setCouriers(prev => prev.filter(c => c.id !== updated.id));
    setOpened(null);
    toast.success(`✅ Verification Complete! Courier ${updated.courier_number} has been successfully verified and locked. ✅`);
    // Reload to update stats
    load();
  };

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto pb-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-400">Verification</div>
              <div className="text-2xl font-semibold tracking-tight text-neutral-900">Final Verification</div>
              <div className="text-sm text-neutral-500">Hi {user?.full_name?.split(" ")[0] || "there"}, verify products physically and finalise pricing.</div>
            </div>
          </div>
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={Building2} label="Pending verification" value={pending.length} tone="warning" />
          <StatTile icon={CheckCircle2} label="Verified couriers" value={completed.length} tone="success" />
          <StatTile icon={Boxes} label="Items pending" value={pending.reduce((n, c) => n + ((c.products?.length || 0) - (c.verification_done_count || 0)), 0)} tone="info" />
          <StatTile icon={ShieldCheck} label="Items verified" value={couriers.reduce((n, c) => n + (c.verification_done_count || 0), 0)} tone="primary" />
        </div>

        {/* Pending list - Only shows couriers with pending items */}
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-neutral-100">
            <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center"><ClipboardCheck className="w-5 h-5" /></div>
              <div><div className="text-base font-semibold text-neutral-900">Couriers awaiting verification</div><div className="text-xs text-neutral-500">Data Entry is complete for these · verify items and finalise pricing.</div></div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">{pending.length} pending</span>
          </div>

          {loading ? <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-400" /></div> : pending.length === 0 ? (
            <div className="py-10 text-center"><CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" /><p className="text-sm font-medium">All caught up! No pending verifications.</p><p className="text-xs text-neutral-500 mt-1">New couriers will appear here when Data Entry completes them.</p></div>
          ) : (
            <div>{pending.map(c => <CourierRow key={c.id} courier={c} onOpen={setOpened} />)}</div>
          )}
        </div>

        {/* Completed list */}
        {completed.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center"><Lock className="w-5 h-5" /></div>
                <div><div className="text-base font-semibold text-neutral-900">Recently verified</div><div className="text-xs text-neutral-500">Locked · click to review the final pricing.</div></div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{completed.length} done</span>
            </div>
            <div>{completed.map(c => <CourierRow key={c.id} courier={c} onOpen={setOpened} />)}</div>
          </div>
        )}
      </div>

      <VerificationCourierModal 
        courier={opened} 
        onClose={() => setOpened(null)} 
        onUpdated={applyUpdate} 
        onCompleted={handleCompleted}
        api={API}
        authHeaders={authHeaders}
      />
    </DashboardShell>
  );
}

// Courier Row Component
function CourierRow({ courier, onOpen }) {
  const items = courier.products || [];
  const totalUnits = items.reduce((n, p) => n + (p.quantity || 0), 0);
  const verifiedCount = courier.verification_done_count || 0;
  const allVerified = items.length > 0 && verifiedCount === items.length;
  let totalValue = 0;
  items.forEach(item => {
    const costPerUnit = item.cost_per_unit || 0;
    const gstPercent = item.gst_percent || 0;
    const transportCost = item.transportation_cost || 0;
    const quantity = item.quantity || 0;
    const discountPercent = item.discount_percent || 0;
    const discountAmount = (costPerUnit * discountPercent) / 100;
    const costAfterDiscount = costPerUnit - discountAmount;
    const gstAmount = (costAfterDiscount * gstPercent) / 100;
    const transportPerUnit = quantity > 0 ? transportCost / quantity : 0;
    const autoPrice = costAfterDiscount + gstAmount + transportPerUnit;
    const finalPrice = item.final_price_manual || autoPrice;
    totalValue += finalPrice * quantity;
  });

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-neutral-100 first:border-t-0 hover:bg-neutral-50/60 transition-colors cursor-pointer" onClick={() => onOpen(courier)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono font-semibold text-neutral-900">{courier.courier_number}</span>
          {courier.courier_company && <span className="text-[11px] text-neutral-500"><Truck className="w-3 h-3 inline mr-1" />{courier.courier_company}</span>}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100"><Package className="w-3 h-3" /> {courier.num_packages} pkgs</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-900 text-white"><Boxes className="w-3 h-3" /> {items.length} items · {totalUnits} units</span>
          {totalValue > 0 && <span className="text-[11px] font-semibold text-emerald-700"><IndianRupee className="w-3 h-3 inline" />₹{totalValue.toLocaleString()}</span>}
          {courier.verification_complete ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><Lock className="w-3 h-3" /> Verified</span> : <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${allVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}><ClipboardCheck className="w-3 h-3" /> {verifiedCount}/{items.length} verified</span>}
        </div>
        {courier.ready_for_verification_at && <div className="mt-1 text-[11px] text-neutral-500">Ready since {new Date(courier.ready_for_verification_at).toLocaleString()}</div>}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onOpen(courier); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 shrink-0">
        {courier.verification_complete ? "Review" : "Verify items"} <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}