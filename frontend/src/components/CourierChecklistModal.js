import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  X,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Loader2,
  Truck,
  ArrowRight,
  Lock,
} from "lucide-react";
import {
  COURIER_CHECKLIST,
  defaultChecklistState,
  checklistProgress,
} from "@/lib/checklist";

export default function CourierChecklistModal({ courier, onClose, onUpdated, onNext }) {
  const { API, authHeaders } = useAuth();
  const [state, setState] = useState(defaultChecklistState());
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!courier) return;
    setState({ ...defaultChecklistState(), ...(courier.checklist || {}) });
    setDirty(false);
  }, [courier]);

  const progress = useMemo(() => checklistProgress(state), [state]);

  if (!courier) return null;

  const toggle = (key) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const close = () => {
    if (saving) return;
    onClose?.();
  };

  const handleSave = async ({ goNext = false } = {}) => {
    setSaving(true);
    try {
      const res = await axios.patch(
        `${API}/couriers/${courier.id}/checklist`,
        { checklist: state },
        { headers: authHeaders() }
      );
      const p = checklistProgress(res.data?.checklist);
      toast.success(
        p.complete
          ? `${courier.courier_number} · Checklist complete`
          : `${courier.courier_number} · Saved (${p.done}/${p.total})`
      );
      onUpdated?.(res.data);
      setDirty(false);
      if (goNext && p.complete) {
        onNext?.(res.data);
      } else {
        onClose?.();
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save checklist");
    } finally {
      setSaving(false);
    }
  };

  const pct = Math.round((progress.done / progress.total) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={close}
      data-testid="courier-checklist-modal"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[92vh] overflow-hidden flex flex-col fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5" /> Warehouse checklist
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
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
            data-testid="checklist-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs font-medium text-neutral-600">
              Progress
            </div>
            <div className="text-xs font-semibold text-neutral-900">
              {progress.done}/{progress.total}
            </div>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                progress.complete ? "bg-emerald-500" : "bg-neutral-900"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {COURIER_CHECKLIST.map((item) => {
            const checked = !!state[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggle(item.key)}
                data-testid={`checklist-item-${item.key}`}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  checked
                    ? "border-emerald-300 bg-emerald-50/60"
                    : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                <div
                  className={`mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${
                    checked
                      ? "text-emerald-600"
                      : "text-neutral-300"
                  }`}
                >
                  {checked ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-sm font-medium ${
                      checked
                        ? "text-emerald-900 line-through decoration-emerald-400/60"
                        : "text-neutral-900"
                    }`}
                  >
                    {item.label}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-neutral-100 bg-white">
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            {progress.complete ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> All steps complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                {progress.total - progress.done} step
                {progress.total - progress.done === 1 ? "" : "s"} remaining to
                unlock next
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              data-testid="checklist-cancel-btn"
            >
              Cancel
            </button>
            {!progress.complete ? (
              <button
                type="button"
                onClick={() => handleSave({ goNext: false })}
                disabled={saving || !dirty}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
                data-testid="checklist-save-btn"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>Save checklist</>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!dirty) {
                    onNext?.(courier);
                  } else {
                    handleSave({ goNext: true });
                  }
                }}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                data-testid="checklist-next-btn"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    Next: Add items <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
