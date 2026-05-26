import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  X,
  AlertTriangle,
  Truck,
  Package,
  Upload,
  Image as ImageIcon,
  CreditCard,
  Smartphone,
  Wallet,
  CircleAlert,
  Send,
  Loader2,
  RotateCcw,
} from "lucide-react";

const MAX_IMG_BYTES = 4 * 1024 * 1024;

function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

const PAYMENT_OPTIONS = [
  { key: "upi", label: "UPI", Icon: Smartphone },
  { key: "card", label: "Card", Icon: CreditCard },
  { key: "cash", label: "Cash", Icon: Wallet },
  { key: "none", label: "Unpaid", Icon: CircleAlert },
];

export default function RejectedCourierEditModal({
  courier,
  onClose,
  onResent,
}) {
  const { API, authHeaders } = useAuth();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    courier_company: "",
    num_packages: "",
    slip_photo: null,
    payment_mode: "none",
    handled_by: "",
  });
  const [saving, setSaving] = useState(false);
  const [origSlipPhoto, setOrigSlipPhoto] = useState(null);

  useEffect(() => {
    if (!courier) return;
    setForm({
      courier_company: courier.courier_company || "",
      num_packages: String(courier.num_packages ?? ""),
      slip_photo: courier.slip_photo || null,
      payment_mode: courier.payment_made
        ? courier.payment_mode || "none"
        : "none",
      handled_by: courier.handled_by || "",
    });
    setOrigSlipPhoto(courier.slip_photo || null);
  }, [courier]);

  if (!courier) return null;

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return toast.error("Choose an image file.");
    if (file.size > MAX_IMG_BYTES)
      return toast.error("Image must be under 4MB.");
    try {
      update({ slip_photo: await fileToDataURL(file) });
    } catch {
      toast.error("Failed to read image.");
    }
  };

  const close = () => {
    if (saving) return;
    onClose?.();
  };

  const submit = async () => {
    if (!form.num_packages || Number(form.num_packages) < 1) {
      toast.error("Enter a valid number of packages.");
      return;
    }
    setSaving(true);
    try {
      const isPaid = form.payment_mode !== "none";
      // Build patch body — use empty string ("") for fields backend treats as "clear",
      // and only include slip_photo when it actually changed (avoid sending huge base64 every time).
      const patchBody = {
        courier_company: form.courier_company.trim(),
        num_packages: Number(form.num_packages),
        handled_by: form.handled_by.trim(),
        payment_made: isPaid,
        payment_mode: isPaid ? form.payment_mode : null,
      };
      if (form.slip_photo !== origSlipPhoto) {
        patchBody.slip_photo = form.slip_photo ?? "";
      }
      // 1) Patch fields
      await axios.patch(`${API}/couriers/${courier.id}`, patchBody, {
        headers: authHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      // 2) Mark as resolved (clears rejection, courier goes back to Warehouse queue)
      const res = await axios.patch(
        `${API}/couriers/${courier.id}/resolve`,
        {},
        { headers: authHeaders() }
      );
      toast.success(`${courier.courier_number} re-sent to Warehouse`);
      onResent?.(res.data);
      onClose?.();
    } catch (e) {
      // Surface the actual server error so user knows why it failed
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Failed to resend courier";
      console.error("Resend error:", e?.response?.data || e);
      toast.error(typeof detail === "string" ? detail : "Failed to resend courier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4"
      onClick={close}
      data-testid="rejected-edit-dialog"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-neutral-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-neutral-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-neutral-900">
                Fix &amp; resend courier
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">
                <span className="font-mono">{courier.courier_number}</span> —
                update details below and resend to Warehouse.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md hover:bg-neutral-50"
            data-testid="rejected-edit-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warehouse reason banner */}
        {courier.rejected_reason && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div className="text-[12px] text-red-800">
                <div className="font-semibold mb-0.5">
                  Warehouse rejection reason
                </div>
                <div className="text-red-700">{courier.rejected_reason}</div>
                {courier.rejected_by && (
                  <div className="text-[11px] text-red-500/80 mt-1">
                    by {courier.rejected_by}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Courier company{" "}
                <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                data-testid="rej-edit-company"
                value={form.courier_company}
                onChange={(e) => update({ courier_company: e.target.value })}
                placeholder="e.g. DTDC, BlueDart, Delhivery"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                disabled={saving}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Number of packages
              </label>
              <input
                data-testid="rej-edit-packages"
                type="number"
                min="1"
                value={form.num_packages}
                onChange={(e) => update({ num_packages: e.target.value })}
                placeholder="e.g. 3"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                disabled={saving}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-600">
              Slip / receipt photo{" "}
              <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <div className="mt-1 flex items-center gap-3">
              {form.slip_photo ? (
                <div className="relative">
                  <img
                    src={form.slip_photo}
                    alt="slip"
                    className="w-20 h-20 object-cover rounded-xl border border-neutral-200"
                  />
                  <button
                    type="button"
                    onClick={() => update({ slip_photo: null })}
                    disabled={saving}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-neutral-200 text-neutral-600 shadow flex items-center justify-center hover:text-red-600"
                    data-testid="rej-edit-photo-remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={saving}
                data-testid="rej-edit-photo-upload"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
              >
                <Upload className="w-3.5 h-3.5" />{" "}
                {form.slip_photo ? "Replace" : "Upload"}
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-neutral-600 mb-2">
              Payment mode
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PAYMENT_OPTIONS.map((m) => {
                const active = form.payment_mode === m.key;
                const isNone = m.key === "none";
                return (
                  <button
                    key={m.key}
                    type="button"
                    data-testid={`rej-edit-payment-${m.key}`}
                    onClick={() => update({ payment_mode: m.key })}
                    disabled={saving}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      active
                        ? isNone
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-neutral-900 bg-white text-neutral-900"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                    }`}
                  >
                    <m.Icon className="w-4 h-4" /> {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-600">
              Handled by{" "}
              <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              data-testid="rej-edit-handled-by"
              value={form.handled_by}
              onChange={(e) => update({ handled_by: e.target.value })}
              placeholder="e.g. Biswajit"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              disabled={saving}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-neutral-100 bg-neutral-50/40 rounded-b-2xl sticky bottom-0">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
            data-testid="rej-edit-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="rej-edit-resend-btn"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Save &amp; resend to Warehouse
          </button>
        </div>
      </div>
    </div>
  );
}
