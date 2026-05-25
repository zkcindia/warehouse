import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  X,
  Loader2,
  CheckCircle2,
  Save,
  Building2,
  Hash,
  Calendar,
  Truck,
  Boxes,
  IndianRupee,
  Percent,
  Package,
  Tag,
  AlertTriangle,
} from "lucide-react";

const TRANSPORT_OPTIONS = ["Road", "Air", "Train", "Courier", "Self pickup", "Other"];

function asNumOrEmpty(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

export default function DataEntryItemModal({ courier, item, onClose, onUpdated }) {
  const { API, authHeaders } = useAuth();

  const [form, setForm] = useState({
    supplier: "",
    invoice_number: "",
    invoice_date: "",
    transportation_method: "",
    transporter_name: "",
    transportation_cost: "",
    gst_percent: "",
    total_invoice_amount: "",
    cost_per_unit: "",
    gst_amount: "",
    hsn_code: "",
    unit: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setForm({
      supplier: item.supplier || "",
      invoice_number: item.invoice_number || "",
      invoice_date: item.invoice_date || "",
      transportation_method: item.transportation_method || "",
      transporter_name: item.transporter_name || "",
      transportation_cost: asNumOrEmpty(item.transportation_cost),
      gst_percent: asNumOrEmpty(item.gst_percent),
      total_invoice_amount: asNumOrEmpty(item.total_invoice_amount),
      cost_per_unit: asNumOrEmpty(item.cost_per_unit),
      gst_amount: asNumOrEmpty(item.gst_amount),
      hsn_code: item.hsn_code || "",
      unit: item.unit || "",
    });
  }, [item]);

  if (!item || !courier) return null;

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const close = () => {
    if (saving) return;
    onClose?.();
  };

  const buildPayload = () => ({
    supplier: form.supplier.trim() || null,
    invoice_number: form.invoice_number.trim() || null,
    invoice_date: form.invoice_date.trim() || null,
    transportation_method: form.transportation_method.trim() || null,
    transporter_name: form.transporter_name.trim() || null,
    transportation_cost:
      form.transportation_cost === "" ? null : Number(form.transportation_cost),
    gst_percent: form.gst_percent === "" ? null : Number(form.gst_percent),
    total_invoice_amount:
      form.total_invoice_amount === "" ? null : Number(form.total_invoice_amount),
    cost_per_unit: form.cost_per_unit === "" ? null : Number(form.cost_per_unit),
    gst_amount: form.gst_amount === "" ? null : Number(form.gst_amount),
    hsn_code: form.hsn_code.trim() || null,
    unit: form.unit.trim() || null,
  });

  const save = async ({ markDone = null } = {}) => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (markDone !== null) payload.data_entry_done = markDone;
      const res = await axios.patch(
        `${API}/couriers/${courier.id}/items/${item.id}/data-entry`,
        payload,
        { headers: authHeaders() }
      );
      toast.success(
        markDone === true
          ? `${item.name} marked as done`
          : markDone === false
          ? `${item.name} reopened`
          : `${item.name} saved`
      );
      onUpdated?.(res.data);
      if (markDone === true) onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={close}
      data-testid="data-entry-item-modal"
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Data entry · {courier.courier_number}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <div className="text-base font-semibold text-neutral-900">
                {item.name}
              </div>
              {item.brand && (
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                  <Tag className="w-3 h-3" /> {item.brand}
                </span>
              )}
              {item.code && (
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 font-mono">
                  <Hash className="w-3 h-3" /> {item.code}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded-full">
                <Package className="w-3 h-3" /> Qty {item.quantity}
              </span>
              {item.damaged_count > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> {item.damaged_count} damaged
                </span>
              )}
              {item.data_entry_done && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Done
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
            data-testid="de-item-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Supplier / Invoice */}
          <Section title="Supplier & Invoice">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Supplier / Vendor" icon={Building2}>
                <input
                  value={form.supplier}
                  onChange={(e) => setField("supplier", e.target.value)}
                  placeholder="e.g. ABC Distributors"
                  data-testid="de-supplier"
                  className={inputCls}
                />
              </Field>
              <Field label="Invoice number" icon={Hash}>
                <input
                  value={form.invoice_number}
                  onChange={(e) => setField("invoice_number", e.target.value)}
                  placeholder="INV-2026-001"
                  data-testid="de-invoice-number"
                  className={inputCls}
                />
              </Field>
              <Field label="Invoice / Purchase date" icon={Calendar}>
                <input
                  type="date"
                  value={form.invoice_date}
                  onChange={(e) => setField("invoice_date", e.target.value)}
                  data-testid="de-invoice-date"
                  className={inputCls}
                />
              </Field>
              <Field label="Total invoice amount" icon={IndianRupee}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total_invoice_amount}
                  onChange={(e) => setField("total_invoice_amount", e.target.value)}
                  placeholder="0.00"
                  data-testid="de-invoice-total"
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          {/* Transportation */}
          <Section title="Transportation">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Method" icon={Truck}>
                <select
                  value={form.transportation_method}
                  onChange={(e) => setField("transportation_method", e.target.value)}
                  data-testid="de-transport-method"
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  {TRANSPORT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Transporter name" icon={Truck}>
                <input
                  value={form.transporter_name}
                  onChange={(e) => setField("transporter_name", e.target.value)}
                  placeholder="e.g. DTDC / Driver name"
                  data-testid="de-transporter"
                  className={inputCls}
                />
              </Field>
              <Field label="Transportation cost" icon={IndianRupee}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.transportation_cost}
                  onChange={(e) => setField("transportation_cost", e.target.value)}
                  placeholder="0.00"
                  data-testid="de-transport-cost"
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          {/* Tax / Cost */}
          <Section title="Tax & Cost details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="HSN code" icon={Hash}>
                <input
                  value={form.hsn_code}
                  onChange={(e) => setField("hsn_code", e.target.value)}
                  placeholder="e.g. 8517"
                  data-testid="de-hsn"
                  className={inputCls}
                />
              </Field>
              <Field label="Unit" icon={Boxes}>
                <input
                  list="de-unit-options"
                  value={form.unit}
                  onChange={(e) => setField("unit", e.target.value)}
                  placeholder="pcs / box / kg"
                  data-testid="de-unit"
                  className={inputCls}
                />
                <datalist id="de-unit-options">
                  <option value="pcs" />
                  <option value="box" />
                  <option value="kg" />
                  <option value="ltr" />
                  <option value="set" />
                </datalist>
              </Field>
              <Field label="Cost per unit" icon={IndianRupee}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost_per_unit}
                  onChange={(e) => setField("cost_per_unit", e.target.value)}
                  placeholder="0.00"
                  data-testid="de-cost-per-unit"
                  className={inputCls}
                />
              </Field>
              <Field label="GST %" icon={Percent}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.gst_percent}
                  onChange={(e) => setField("gst_percent", e.target.value)}
                  placeholder="18"
                  data-testid="de-gst-percent"
                  className={inputCls}
                />
              </Field>
              <Field label="GST amount" icon={IndianRupee}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.gst_amount}
                  onChange={(e) => setField("gst_amount", e.target.value)}
                  placeholder="0.00"
                  data-testid="de-gst-amount"
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-neutral-100 bg-white">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => save()}
              disabled={saving}
              data-testid="de-save-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
            {item.data_entry_done ? (
              <button
                type="button"
                onClick={() => save({ markDone: false })}
                disabled={saving}
                data-testid="de-reopen-btn"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60"
              >
                Reopen
              </button>
            ) : (
              <button
                type="button"
                onClick={() => save({ markDone: true })}
                disabled={saving}
                data-testid="de-mark-done-btn"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900";

function Section({ title, children }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-neutral-400 font-medium mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
        {Icon ? <Icon className="w-3.5 h-3.5" /> : null} {label}
      </label>
      {children}
    </div>
  );
}
