import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ClipboardList,
  Loader2,
  RefreshCw,
  Truck,
  Package,
  CheckCircle2,
  AlertCircle,
  Search,
  Image as ImageIcon,
  IndianRupee,
  Hash,
  Calendar,
  Tag,
  Building2,
  ChevronRight,
  X,
  Boxes,
  ChevronDown,
  ChevronUp,
  Save,
  Eye,
  Filter,
  ArrowLeft,
  ArrowRight,
  Percent,
  DollarSign,
  FileText,
} from "lucide-react";

const PAGE_SIZE = 25;

function StatTile({ icon: Icon, label, value, accent = "neutral" }) {
  const accents = {
    neutral: "bg-neutral-50 text-neutral-700 border-neutral-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${accents[accent]}`}>
      <div className="w-9 h-9 rounded-lg bg-white/70 border border-white flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-lg font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done === total;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="h-1.5 w-24 bg-neutral-100 rounded-full overflow-hidden">
        <div className={`h-full transition-all ${complete ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-medium text-neutral-600 font-mono">{done}/{total}</span>
    </div>
  );
}

function CourierRow({ courier, onOpen, index }) {
  const items = courier.products || [];
  const done = courier.data_entry_done_count || 0;
  const total = items.length;
  const pending = total - done;
  const allDone = pending === 0 && total > 0;
  
  return (
    <div className="grid grid-cols-[1fr_140px_180px_120px_120px] gap-3 items-center px-4 py-2.5 border-t border-neutral-100 hover:bg-neutral-50/60 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-neutral-400">#{index + 1}</span>
          <span className="text-sm font-mono font-semibold text-neutral-900">{courier.courier_number}</span>
          {courier.courier_company && (
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 truncate">
              <Truck className="w-3 h-3" /> {courier.courier_company}
            </span>
          )}
        </div>
        {courier.sent_to_data_entry_at && (
          <div className="text-[11px] text-neutral-400 mt-0.5">sent {new Date(courier.sent_to_data_entry_at).toLocaleString()}</div>
        )}
      </div>
      <div className="text-[12px] text-neutral-700">
        <span className="font-semibold">{courier.num_packages}</span> <span className="text-neutral-400">pkgs</span>
      </div>
      <div><ProgressBar done={done} total={total} /></div>
      <div>
        {allDone ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3" /> {pending} pending
          </span>
        )}
      </div>
      <button
        onClick={() => onOpen(courier)}
        disabled={allDone}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium justify-self-end ${
          allDone 
            ? "bg-emerald-100 text-emerald-700 cursor-not-allowed" 
            : "bg-neutral-900 text-white hover:bg-neutral-800"
        }`}
      >
        {allDone ? "Completed" : "Enter data"}
        {!allDone && <ChevronRight className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// Main Data Entry Table Modal - Products disappear when marked done
function DataEntryTableModal({ courier, onClose, onUpdated }) {
  const { API, authHeaders } = useAuth();
  const [items, setItems] = useState([]);
  const [savingItemId, setSavingItemId] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;

  useEffect(() => {
    if (courier) {
      setItems(courier.products || []);
    }
  }, [courier]);

  const pendingItems = items.filter(item => !item.data_entry_done);
  const completedItems = items.filter(item => item.data_entry_done);
  const totalItems = items.length;
  const doneCount = completedItems.length;
  const pendingCount = pendingItems.length;

  useEffect(() => {
    setCurrentPage(0);
  }, [pendingCount]);

  if (!courier) return null;

  const totalPages = Math.ceil(pendingItems.length / itemsPerPage);
  const currentItems = pendingItems.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  const allDone = totalItems > 0 && pendingCount === 0;



  const handleFieldChange = (itemId, field, value) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const autoCalculate = (item) => {
    const costPerUnit = parseFloat(item.cost_per_unit) || 0;
    const gstPercent = parseFloat(item.gst_percent) || 0;
    const gstAmount = (costPerUnit * gstPercent) / 100;
    
    handleFieldChange(item.id, 'gst_amount', gstAmount.toFixed(2));
    if (item.quantity) {
      handleFieldChange(item.id, 'total_invoice_amount', ((costPerUnit + gstAmount) * item.quantity).toFixed(2));
    }
  };

  const saveItem = async (item) => {
    setSavingItemId(item.id);
    try {
      const payload = {
        supplier: item.supplier || null,
        invoice_number: item.invoice_number || null,
        invoice_date: item.invoice_date || null,
        transportation_method: item.transportation_method || null,
        transporter_name: item.transporter_name || null,
        transportation_cost: item.transportation_cost ? parseFloat(item.transportation_cost) : null,
        gst_percent: item.gst_percent ? parseFloat(item.gst_percent) : null,
        total_invoice_amount: item.total_invoice_amount ? parseFloat(item.total_invoice_amount) : null,
        cost_per_unit: item.cost_per_unit ? parseFloat(item.cost_per_unit) : null,
        gst_amount: item.gst_amount ? parseFloat(item.gst_amount) : null,
        hsn_code: item.hsn_code || null,
        unit: item.unit || null,
        po_number: item.po_number || null,
        batch_number: item.batch_number || null,
        mrp: item.mrp ? parseFloat(item.mrp) : null,
        discount_percent: item.discount_percent ? parseFloat(item.discount_percent) : null,
        igst_percent: item.igst_percent ? parseFloat(item.igst_percent) : null,
        expiry_date: item.expiry_date || null,
        remarks: item.remarks || null,
      };

      const res = await axios.patch(
        `${API}/couriers/${courier.id}/items/${item.id}/data-entry`,
        payload,
        { headers: authHeaders() }
      );
      
      toast.success(`${item.name} saved`);
      // Update the item in state
      const updatedItem = res.data.products?.find(p => p.id === item.id);
      if (updatedItem) {
        setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
      }
      onUpdated?.(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    } finally {
      setSavingItemId(null);
    }
  };

  const markComplete = async (item) => {
    setSavingItemId(item.id);
    try {
      const res = await axios.patch(
        `${API}/couriers/${courier.id}/items/${item.id}/data-entry`,
        { data_entry_done: true },
        { headers: authHeaders() }
      );
      toast.success(`${item.name} marked as complete`);
      
      // Update local state - this will remove the item from pending list
      const updatedItem = res.data.products?.find(p => p.id === item.id);
      if (updatedItem) {
        setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
      }
      
      onUpdated?.(res.data);
      
      // If all items are done, close modal after a short delay
      const newPendingCount = (res.data.products?.filter(p => !p.data_entry_done).length || 0);
      if (newPendingCount === 0 && res.data.products?.length > 0) {
        toast.success("All items completed! Moving to verification...");
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to mark complete");
    } finally {
      setSavingItemId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[98vw] bg-white rounded-2xl shadow-2xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-100 bg-gradient-to-r from-blue-900 to-blue-800 text-white">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Data Entry
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <div className="text-xl font-bold font-mono">{courier.courier_number}</div>
              {courier.courier_company && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-200">
                  <Truck className="w-3.5 h-3.5" /> {courier.courier_company}
                </span>
              )}
            </div>
            <div className="text-xs text-blue-200 mt-1">
              {courier.num_packages} packages · {totalItems} items · {doneCount} completed · {pendingCount} pending
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-neutral-600">Overall Progress</span>
            <span className="text-xs font-medium text-blue-600">{doneCount}/{totalItems} items completed</span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${(doneCount / totalItems) * 100}%` }} />
          </div>
          {pendingCount === 0 && totalItems > 0 && (
            <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> All items completed! Closing automatically...
            </div>
          )}
        </div>

        {/* Table View - Only showing PENDING items */}
        <div className="flex-1 overflow-auto p-4">
          {pendingCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">All Done!</h3>
              <p className="text-sm text-neutral-500 mt-1">All items have been completed for this courier.</p>
              <p className="text-xs text-neutral-400 mt-2">Closing automatically...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] border-collapse">
                <thead className="sticky top-0 z-10 bg-neutral-100">
                  <tr className="border-b-2 border-neutral-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-12">#</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-44">Product</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-32">Supplier</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-28">Invoice No</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-24">Invoice Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-24">PO Number</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-24">Cost/Unit</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-20">GST%</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-28">HSN Code</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-20">Unit</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-28">Batch No</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-28">Expiry Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-24">Transport Method</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-24">Transport Cost</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-700 w-32">Remarks</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-neutral-700 w-20">Status</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-neutral-700 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, idx) => {
                    const isSaving = savingItemId === item.id;
                    
                    return (
                      <tr key={item.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                        <td className="px-3 py-3 text-sm text-neutral-600">{currentPage * itemsPerPage + idx + 1}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {item.photo ? (
                              <img src={item.photo} alt={item.name} className="w-8 h-8 rounded object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center">
                                <Package className="w-4 h-4 text-neutral-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-sm text-neutral-900">{item.name}</div>
                              <div className="text-xs text-neutral-500">Qty: {item.quantity}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={item.supplier || ''}
                            onChange={(e) => handleFieldChange(item.id, 'supplier', e.target.value)}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                            placeholder="—"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={item.invoice_number || ''}
                            onChange={(e) => handleFieldChange(item.id, 'invoice_number', e.target.value)}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm font-mono focus:border-blue-400"
                            placeholder="—"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="date"
                            value={item.invoice_date || ''}
                            onChange={(e) => handleFieldChange(item.id, 'invoice_date', e.target.value)}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm focus:border-blue-400"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={item.po_number || ''}
                            onChange={(e) => handleFieldChange(item.id, 'po_number', e.target.value)}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm font-mono focus:border-blue-400"
                            placeholder="—"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.cost_per_unit || ''}
                              onChange={(e) => {
                                handleFieldChange(item.id, 'cost_per_unit', e.target.value);
                                autoCalculate({ ...item, cost_per_unit: e.target.value });
                              }}
                              className="w-full pl-6 pr-2 py-1.5 border border-neutral-200 rounded-lg text-sm focus:border-blue-400"
                              placeholder="0.00"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={item.gst_percent || ''}
                              onChange={(e) => {
                                handleFieldChange(item.id, 'gst_percent', e.target.value);
                                autoCalculate({ ...item, gst_percent: e.target.value });
                              }}
                              className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm focus:border-blue-400"
                              placeholder="18"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={item.hsn_code || ''}
                            onChange={(e) => handleFieldChange(item.id, 'hsn_code', e.target.value)}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm font-mono focus:border-blue-400"
                            placeholder="—"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={item.unit || ''}
                            onChange={(e) => handleFieldChange(item.id, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm focus:border-blue-400"
                          >
                            <option value="">—</option>
                            <option value="pcs">Pieces</option>
                            <option value="kg">KG</option>
                            <option value="gram">Gram</option>
                            <option value="liter">Liter</option>
                            <option value="meter">Meter</option>
                            <option value="box">Box</option>
                            <option value="dozen">Dozen</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={item.batch_number || ''}
                            onChange={(e) => handleFieldChange(item.id, 'batch_number', e.target.value)}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm font-mono focus:border-blue-400"
                            placeholder="—"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="date"
                            value={item.expiry_date || ''}
                            onChange={(e) => handleFieldChange(item.id, 'expiry_date', e.target.value)}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm focus:border-blue-400"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={item.transportation_method || ''}
                            onChange={(e) => handleFieldChange(item.id, 'transportation_method', e.target.value)}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm focus:border-blue-400"
                          >
                            <option value="">—</option>
                            <option value="Road">Road</option>
                            <option value="Air">Air</option>
                            <option value="Train">Train</option>
                            <option value="Courier">Courier</option>
                            <option value="Self Pickup">Self Pickup</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.transportation_cost || ''}
                              onChange={(e) => handleFieldChange(item.id, 'transportation_cost', e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 border border-neutral-200 rounded-lg text-sm focus:border-blue-400"
                              placeholder="0.00"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={item.remarks || ''}
                            onChange={(e) => handleFieldChange(item.id, 'remarks', e.target.value)}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-sm focus:border-blue-400"
                            placeholder="Optional"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                            <AlertCircle className="w-3 h-3" /> Pending
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveItem(item)}
                              disabled={isSaving}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                              title="Save"
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => markComplete(item)}
                              disabled={isSaving}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                              title="Mark Complete"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination - Only show if there are pending items */}
        {pendingCount > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-100 bg-neutral-50">
            <div className="text-xs text-neutral-500">Page {currentPage + 1} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-300 text-sm text-neutral-700 hover:bg-white disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-300 text-sm text-neutral-700 hover:bg-white disabled:opacity-50"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-white">
          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-500">
              {allDone ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> All items completed! Closing automatically...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <AlertCircle className="w-4 h-4" /> {pendingCount} item(s) pending
                </span>
              )}
            </div>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DataEntryDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openedCourier, setOpenedCourier] = useState(null);
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [sortNewest, setSortNewest] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/data-entry/couriers`, { headers: authHeaders() });
      setCouriers(res.data || []);
    } catch (e) {
      console.error("Failed to load couriers:", e);
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const applyUpdate = (updated) => {
    // Check if courier is ready for verification (all items done)
    if (updated.ready_for_verification) {
      setCouriers((arr) => arr.filter((c) => c.id !== updated.id));
      if (openedCourier?.id === updated.id) setOpenedCourier(null);
      toast.success(`Courier ${updated.courier_number} moved to verification`);
      return;
    }
    setCouriers((arr) => arr.map((c) => (c.id === updated.id ? updated : c)));
    if (openedCourier?.id === updated.id) setOpenedCourier(updated);
  };

  const filtered = useMemo(() => {
    let list = couriers;
    if (showOnlyPending) {
      list = list.filter((c) => (c.data_entry_done_count || 0) < (c.products?.length || 0));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          (c.courier_number || "").toLowerCase().includes(q) ||
          (c.courier_company || "").toLowerCase().includes(q) ||
          (c.products || []).some((p) => (p.name || "").toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => {
      const da = new Date(a.sent_to_data_entry_at || a.created_at).getTime();
      const db = new Date(b.sent_to_data_entry_at || b.created_at).getTime();
      return sortNewest ? db - da : da - db;
    });
    return list;
  }, [couriers, search, showOnlyPending, sortNewest]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, showOnlyPending, sortNewest]);

  const stats = useMemo(() => {
    let totalItems = 0, doneItems = 0;
    couriers.forEach((c) => {
      totalItems += c.products?.length || 0;
      doneItems += c.data_entry_done_count || 0;
    });
    return { totalCouriers: couriers.length, totalItems, doneItems, pendingItems: totalItems - doneItems };
  }, [couriers]);

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto pb-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-400">Data Entry Staff</div>
              <div className="text-2xl font-semibold tracking-tight text-neutral-900">Data Entry workspace</div>
              <div className="text-sm text-neutral-500">
                Hi {user?.full_name?.split(" ")[0] || "there"}, click "Enter data" to open table and fill details directly.
              </div>
            </div>
          </div>
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={Truck} label="Couriers pending" value={stats.totalCouriers} accent="neutral" />
          <StatTile icon={Package} label="Total items" value={stats.totalItems} accent="blue" />
          <StatTile icon={AlertCircle} label="Items pending" value={stats.pendingItems} accent="amber" />
          <StatTile icon={CheckCircle2} label="Items done" value={stats.doneItems} accent="emerald" />
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by courier #, company, item, supplier, invoice…"
                className="pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm w-full focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
              <input type="checkbox" checked={showOnlyPending} onChange={(e) => setShowOnlyPending(e.target.checked)} className="rounded border-neutral-300" />
              Only with pending items
            </label>
            <button onClick={() => setSortNewest((v) => !v)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50">
              {sortNewest ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              {sortNewest ? "Newest first" : "Oldest first"}
            </button>
            <span className="text-[11px] text-neutral-500 ml-auto">Showing {pageItems.length} of {filtered.length}</span>
          </div>

          {/* Column header */}
          <div className="grid grid-cols-[1fr_140px_180px_120px_120px] gap-3 items-center px-4 py-2 bg-neutral-50/60 border-b border-neutral-100 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
            <div>Courier</div>
            <div>Packages</div>
            <div>DE progress</div>
            <div>State</div>
            <div className="justify-self-end">Action</div>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center text-neutral-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-lg bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="text-sm text-neutral-700 font-medium">
                {couriers.length === 0 ? "No couriers waiting for data entry" : "No couriers match your filters"}
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                {couriers.length === 0 ? "Couriers will appear here after the Owner forwards them." : "Try clearing the search."}
              </div>
            </div>
          ) : (
            <>
              <div>
                {pageItems.map((c, i) => (
                  <CourierRow key={c.id} courier={c} index={(safePage - 1) * PAGE_SIZE + i} onOpen={setOpenedCourier} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-neutral-100 bg-neutral-50/60">
                  <div className="text-[11px] text-neutral-500">Page {safePage} of {totalPages}</div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="px-2.5 py-1 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-white disabled:opacity-50">Prev</button>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-2.5 py-1 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-white disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Data Entry Table Modal */}
      {openedCourier && (
        <DataEntryTableModal
          courier={openedCourier}
          onClose={() => setOpenedCourier(null)}
          onUpdated={applyUpdate}
        />
      )}
    </DashboardShell>
  );
}