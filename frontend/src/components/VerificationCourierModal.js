import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  X,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Circle,
  IndianRupee,
  Truck,
  Package,
  Boxes,
  Image as ImageIcon,
  Hash,
  Tag,
  RotateCcw,
  Edit3,
  Lock,
  AlertTriangle,
  Receipt,
  FileText,
  Building2,
} from "lucide-react";

function inr(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function CalcRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between py-1 text-[12px]">
      <span className={strong ? "font-medium text-neutral-700" : "text-neutral-500"}>
        {label}
      </span>
      <span
        className={`font-mono ${
          strong ? "font-semibold text-neutral-900" : "text-neutral-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ProductVerifyCard({ product, courierId, onUpdated, locked }) {
  const { API, authHeaders } = useAuth();
  const p = product;
  const qty = p.quantity || 0;
  const costPerUnit = p.cost_per_unit;
  const gstPercent = p.gst_percent;
  const gstAmount =
    costPerUnit != null && gstPercent != null
      ? (costPerUnit * gstPercent) / 100
      : null;
  const cgst = gstAmount != null ? gstAmount / 2 : null;
  const sgst = cgst;
  const transportPerUnit = p.transport_per_unit;
  const finalAutoPerUnit = p.final_per_unit_auto;
  const finalAutoTotal = p.final_total_auto;

  const [useManual, setUseManual] = useState(p.final_price_manual != null);
  const [manualVal, setManualVal] = useState(
    p.final_price_manual != null ? String(p.final_price_manual) : ""
  );
  const [notes, setNotes] = useState(p.verification_notes || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUseManual(p.final_price_manual != null);
    setManualVal(p.final_price_manual != null ? String(p.final_price_manual) : "");
    setNotes(p.verification_notes || "");
  }, [p.id, p.final_price_manual, p.verification_notes]);

  const effectivePerUnit = useManual
    ? manualVal === ""
      ? null
      : Number(manualVal)
    : finalAutoPerUnit;
  const effectiveTotal =
    effectivePerUnit != null && qty > 0 ? effectivePerUnit * qty : null;

  const saveManual = async () => {
    if (locked) return;
    if (manualVal === "" || Number.isNaN(Number(manualVal))) {
      toast.error("Enter a valid final price.");
      return;
    }
    setBusy(true);
    try {
      const res = await axios.patch(
        `${API}/couriers/${courierId}/items/${p.id}/verification`,
        {
          final_price_manual: Number(manualVal),
          verification_notes: notes,
        },
        { headers: authHeaders() }
      );
      toast.success(`${p.name} · manual price saved`);
      onUpdated?.(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const revertToAuto = async () => {
    if (locked) return;
    setBusy(true);
    try {
      const res = await axios.patch(
        `${API}/couriers/${courierId}/items/${p.id}/verification`,
        { clear_manual: true, verification_notes: notes },
        { headers: authHeaders() }
      );
      setManualVal("");
      setUseManual(false);
      toast.success(`${p.name} · reverted to auto`);
      onUpdated?.(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to revert");
    } finally {
      setBusy(false);
    }
  };

  const toggleVerified = async () => {
    if (locked) return;
    setBusy(true);
    try {
      // If user is switching to manual, persist it first
      const body = { verification_done: !p.verification_done };
      if (useManual && manualVal !== "") {
        body.final_price_manual = Number(manualVal);
      }
      if (notes !== (p.verification_notes || "")) {
        body.verification_notes = notes;
      }
      const res = await axios.patch(
        `${API}/couriers/${courierId}/items/${p.id}/verification`,
        body,
        { headers: authHeaders() }
      );
      onUpdated?.(res.data);
      toast.success(
        `${p.name} · ${!p.verification_done ? "verified" : "unmarked"}`
      );
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid={`verify-item-${p.id}`}
      className={`border rounded-2xl p-4 ${
        p.verification_done
          ? "bg-emerald-50/40 border-emerald-200"
          : "bg-white border-neutral-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {p.photo ? (
          <img
            src={p.photo}
            alt={p.name}
            className="w-14 h-14 rounded-lg object-cover border border-neutral-100 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-neutral-50 border border-neutral-100 text-neutral-300 flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-neutral-900 truncate">
              {p.name}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-900 text-white">
              <Boxes className="w-2.5 h-2.5" /> {qty}
            </span>
            {p.damaged_count > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                <AlertTriangle className="w-2.5 h-2.5" /> {p.damaged_count}{" "}
                damaged
              </span>
            )}
            {p.verification_done && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5" /> verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-neutral-500">
            {p.brand && (
              <span className="inline-flex items-center gap-1">
                <Tag className="w-3 h-3" /> {p.brand}
              </span>
            )}
            {p.category && (
              <span className="px-1.5 py-0.5 rounded-full bg-neutral-100">
                {p.category}
              </span>
            )}
            {p.code && (
              <span className="font-mono inline-flex items-center gap-0.5">
                <Hash className="w-3 h-3" /> {p.code}
              </span>
            )}
            {p.hsn_code && (
              <span className="font-mono inline-flex items-center gap-0.5">
                HSN {p.hsn_code}
              </span>
            )}
            {p.unit && <span className="text-neutral-500">/ {p.unit}</span>}
          </div>
          {(p.supplier || p.invoice_number) && (
            <div className="mt-1 text-[11px] text-neutral-500 flex items-center gap-2 flex-wrap">
              {p.supplier && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {p.supplier}
                </span>
              )}
              {p.invoice_number && (
                <span className="inline-flex items-center gap-1">
                  <Receipt className="w-3 h-3" /> Inv {p.invoice_number}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calculation breakdown */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5">
            Cost breakdown · per unit
          </div>
          <CalcRow
            label="Cost / unit"
            value={costPerUnit != null ? `₹ ${inr(costPerUnit)}` : "—"}
          />
          <CalcRow
            label={`GST ${gstPercent != null ? `(${gstPercent}%)` : ""}`}
            value={gstAmount != null ? `₹ ${inr(gstAmount)}` : "—"}
          />
          <CalcRow
            label="CGST (½)"
            value={cgst != null ? `₹ ${inr(cgst)}` : "—"}
          />
          <CalcRow
            label="SGST (½)"
            value={sgst != null ? `₹ ${inr(sgst)}` : "—"}
          />
          <CalcRow
            label={`Transport / unit ${
              p.transportation_cost != null && qty > 0
                ? `(${inr(p.transportation_cost)} ÷ ${qty})`
                : ""
            }`}
            value={transportPerUnit != null ? `₹ ${inr(transportPerUnit)}` : "—"}
          />
          <div className="border-t border-neutral-200 my-1.5" />
          <CalcRow
            label="Final / unit (auto)"
            value={finalAutoPerUnit != null ? `₹ ${inr(finalAutoPerUnit)}` : "—"}
            strong
          />
          <CalcRow
            label={`Final total (× ${qty})`}
            value={finalAutoTotal != null ? `₹ ${inr(finalAutoTotal)}` : "—"}
            strong
          />
        </div>

        <div className="rounded-xl border border-neutral-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">
              Final price · choose source
            </div>
            <div className="inline-flex bg-neutral-100 rounded-full p-0.5 text-[11px] font-medium">
              <button
                type="button"
                disabled={locked}
                onClick={() => setUseManual(false)}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  !useManual
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
                data-testid={`verify-mode-auto-${p.id}`}
              >
                Auto
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => setUseManual(true)}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  useManual
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
                data-testid={`verify-mode-manual-${p.id}`}
              >
                Manual
              </button>
            </div>
          </div>

          {useManual ? (
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-neutral-600">
                Manual final price / unit (₹)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center px-3 py-2 rounded-lg border border-neutral-200 focus-within:ring-2 focus-within:ring-neutral-900 flex-1 bg-white">
                  <IndianRupee className="w-3.5 h-3.5 text-neutral-400 mr-1" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualVal}
                    onChange={(e) => setManualVal(e.target.value)}
                    disabled={locked || busy}
                    data-testid={`verify-manual-input-${p.id}`}
                    placeholder={
                      finalAutoPerUnit != null ? inr(finalAutoPerUnit) : "0.00"
                    }
                    className="bg-transparent outline-none text-sm w-full font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={saveManual}
                  disabled={locked || busy}
                  data-testid={`verify-manual-save-${p.id}`}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Edit3 className="w-3.5 h-3.5" />
                  )}
                  Save
                </button>
              </div>
              {p.final_price_manual != null && (
                <button
                  type="button"
                  onClick={revertToAuto}
                  disabled={locked || busy}
                  data-testid={`verify-revert-${p.id}`}
                  className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900"
                >
                  <RotateCcw className="w-3 h-3" /> Revert to auto
                </button>
              )}
            </div>
          ) : (
            <div className="text-[12px] text-neutral-600">
              Using auto-calculated value:
              <div className="mt-1 font-mono text-base font-semibold text-neutral-900">
                ₹ {finalAutoPerUnit != null ? inr(finalAutoPerUnit) : "—"}{" "}
                <span className="text-neutral-400 font-normal text-xs">
                  / unit
                </span>
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-neutral-100">
            <CalcRow
              label="Effective / unit"
              value={
                effectivePerUnit != null ? `₹ ${inr(effectivePerUnit)}` : "—"
              }
              strong
            />
            <CalcRow
              label={`Effective total (× ${qty})`}
              value={effectiveTotal != null ? `₹ ${inr(effectiveTotal)}` : "—"}
              strong
            />
          </div>
        </div>
      </div>

      {/* Notes + verify */}
      <div className="mt-3 flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] font-medium text-neutral-600">
            Verifier notes <span className="text-neutral-400">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={locked || busy}
            placeholder="e.g. 1 damaged unit replaced, packaging intact"
            data-testid={`verify-notes-${p.id}`}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <button
          type="button"
          onClick={toggleVerified}
          disabled={locked || busy}
          data-testid={`verify-toggle-${p.id}`}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border ${
            p.verification_done
              ? "bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              : "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
          } disabled:opacity-50`}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : p.verification_done ? (
            <Circle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {p.verification_done ? "Unmark" : "Mark verified"}
        </button>
      </div>
    </div>
  );
}

export default function VerificationCourierModal({
  courier,
  onClose,
  onUpdated,
  onCompleted,
}) {
  const { API, authHeaders } = useAuth();
  const [completing, setCompleting] = useState(false);

  const items = courier?.products || [];
  const verifiedCount = items.filter((i) => i.verification_done).length;
  const allVerified = items.length > 0 && verifiedCount === items.length;
  const locked = !!courier?.verification_complete;

  const grandTotal = useMemo(
    () =>
      items.reduce((sum, p) => {
        const effPerUnit =
          p.final_price_manual != null
            ? p.final_price_manual
            : p.final_per_unit_auto || 0;
        return sum + effPerUnit * (p.quantity || 0);
      }, 0),
    [items]
  );

  if (!courier) return null;

  const close = () => {
    if (completing) return;
    onClose?.();
  };

  const completeCourier = async () => {
    setCompleting(true);
    try {
      const res = await axios.patch(
        `${API}/couriers/${courier.id}/complete-verification`,
        { complete: true },
        { headers: authHeaders() }
      );
      toast.success(`${courier.courier_number} verification complete`);
      onCompleted?.(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to complete");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4"
      onClick={close}
      data-testid="verification-modal"
    >
      <div
        className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Verification
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
              {locked ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Lock className="w-3 h-3" /> Verified · locked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <FileText className="w-3 h-3" /> {verifiedCount}/{items.length}{" "}
                  items verified
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
            data-testid="verify-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-neutral-400">
              No items in this courier.
            </div>
          ) : (
            items.map((p) => (
              <ProductVerifyCard
                key={p.id}
                product={p}
                courierId={courier.id}
                onUpdated={onUpdated}
                locked={locked}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-white">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[12px] text-neutral-500">
              Grand total ·{" "}
              <span className="font-semibold text-neutral-900 font-mono">
                ₹ {inr(grandTotal)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50"
                data-testid="verify-cancel-btn"
              >
                Close
              </button>
              {!locked && (
                <button
                  type="button"
                  onClick={completeCourier}
                  disabled={!allVerified || completing}
                  data-testid="verify-complete-btn"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {completing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  Complete verification
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
