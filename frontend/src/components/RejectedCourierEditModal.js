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
  Crown,
  UserX,
  DollarSign,
  Building2,
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
  const packagePhotoRef = useRef(null);
  const [form, setForm] = useState({
    courier_company: "",
    num_packages: "",
    slip_photo: null,
    package_photo: null,
    courier_charge: "",
    vehicle: "",
    payment_mode: "none",
    handled_by: "",
    transport_charge: "",
    transport_vehicle: "",
    transport_payment_mode: "none",
  });
  const [saving, setSaving] = useState(false);
  const [origSlipPhoto, setOrigSlipPhoto] = useState(null);
  const [origPackagePhoto, setOrigPackagePhoto] = useState(null);

  // Determine rejection type
  const isOwnerRejected = courier?.owner_rejected === true;
  const rejectionReason = isOwnerRejected 
    ? (courier?.owner_rejected_reason || courier?.rejected_reason)
    : (courier?.rejected_reason || courier?.owner_rejected_reason);
  const rejectedBy = isOwnerRejected 
    ? (courier?.owner_rejected_by || courier?.rejected_by)
    : (courier?.rejected_by || courier?.owner_rejected_by);

  useEffect(() => {
    if (!courier) return;
    setForm({
      courier_company: courier.courier_company || "",
      num_packages: String(courier.num_packages ?? ""),
      slip_photo: courier.slip_photo || null,
      package_photo: courier.package_photo || null,
      courier_charge: courier.charges?.toString() || "",
      vehicle: courier.vehicle || "",
      payment_mode: courier.payment_made
        ? courier.payment_mode || "none"
        : "none",
      handled_by: courier.handled_by || "",
      transport_charge: courier.transport_charge?.toString() || "",
      transport_vehicle: courier.transport_vehicle || "",
      transport_payment_mode: courier.transport_payment_mode || "none",
    });
    setOrigSlipPhoto(courier.slip_photo || null);
    setOrigPackagePhoto(courier.package_photo || null);
  }, [courier]);

  if (!courier) return null;

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handlePhoto = async (e, type = "slip") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return toast.error("Choose an image file.");
    if (file.size > MAX_IMG_BYTES)
      return toast.error("Image must be under 4MB.");
    try {
      const dataUrl = await fileToDataURL(file);
      if (type === "slip") {
        update({ slip_photo: dataUrl });
      } else {
        update({ package_photo: dataUrl });
      }
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
      const isTransportPaid = form.transport_payment_mode !== "none";
      
      // Build patch body
      const patchBody = {
        courier_company: form.courier_company.trim() || null,
        num_packages: Number(form.num_packages),
        handled_by: form.handled_by.trim() || null,
        payment_made: isPaid,
        payment_mode: isPaid ? form.payment_mode : null,
        charges: form.courier_charge ? parseFloat(form.courier_charge) : null,
        vehicle: form.vehicle || null,
        transport_charge: form.transport_charge ? parseFloat(form.transport_charge) : null,
        transport_vehicle: form.transport_vehicle || null,
        transport_payment_mode: isTransportPaid ? form.transport_payment_mode : null,
      };
      
      // Only include slip_photo if it changed
      if (form.slip_photo !== origSlipPhoto) {
        patchBody.slip_photo = form.slip_photo || "";
      }
      
      // Only include package_photo if it changed
      if (form.package_photo !== origPackagePhoto) {
        patchBody.package_photo = form.package_photo || "";
      }
      
      // 1) Patch fields
      await axios.patch(`${API}/couriers/${courier.id}`, patchBody, {
        headers: authHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      // 2) Mark as resolved (clears rejection, courier goes back to Owner/Warehouse)
      const res = await axios.patch(
        `${API}/couriers/${courier.id}/resolve`,
        {},
        { headers: authHeaders() }
      );
      
      // Success message based on rejection type
      if (isOwnerRejected) {
        toast.success(`${courier.courier_number} fixed and sent back to Owner for approval`);
      } else {
        toast.success(`${courier.courier_number} fixed and sent back to Warehouse`);
      }
      
      onResent?.(res.data);
      onClose?.();
    } catch (e) {
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-neutral-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-neutral-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isOwnerRejected 
                ? "bg-orange-100 text-orange-700" 
                : "bg-amber-100 text-amber-700"
            }`}>
              {isOwnerRejected ? (
                <Crown className="w-5 h-5" />
              ) : (
                <RotateCcw className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-neutral-900">
                {isOwnerRejected ? "Fix & resend to Owner" : "Fix & resend to Warehouse"}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">
                <span className="font-mono">{courier.courier_number}</span> —
                update details below and resend.
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

        {/* Rejection reason banner */}
        {rejectionReason && (
          <div className={`mx-5 mt-4 p-3 rounded-xl border ${
            isOwnerRejected 
              ? "bg-orange-50 border-orange-200" 
              : "bg-red-50 border-red-200"
          }`}>
            <div className="flex items-start gap-2">
              {isOwnerRejected ? (
                <UserX className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              )}
              <div className="text-[12px]">
                <div className={`font-semibold mb-0.5 ${
                  isOwnerRejected ? "text-orange-800" : "text-red-800"
                }`}>
                  {isOwnerRejected ? "Owner rejection reason" : "Warehouse rejection reason"}
                </div>
                <div className={isOwnerRejected ? "text-orange-700" : "text-red-700"}>
                  {rejectionReason}
                </div>
                {rejectedBy && (
                  <div className={`text-[11px] mt-1 ${
                    isOwnerRejected ? "text-orange-500/80" : "text-red-500/80"
                  }`}>
                    rejected by {rejectedBy}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-5 space-y-5">
          {/* Section 1 - Courier Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-5 w-1 rounded-full bg-purple-500" />
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Courier Details</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-neutral-400" />
                  Courier Name
                </label>
                <input
                  data-testid="rej-edit-company"
                  value={form.courier_company}
                  onChange={(e) => update({ courier_company: e.target.value })}
                  placeholder="DTDC"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400"
                  disabled={saving}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                  Slip Photo
                </label>
                <div className="flex items-center gap-3">
                  {form.slip_photo ? (
                    <div className="relative">
                      <img
                        src={form.slip_photo}
                        alt="slip"
                        className="w-16 h-16 rounded-xl object-cover border border-neutral-200"
                      />
                      <button
                        type="button"
                        onClick={() => update({ slip_photo: null })}
                        disabled={saving}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-neutral-200 text-neutral-600 flex items-center justify-center hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhoto(e, "slip")}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    <Upload className="w-3.5 h-3.5 inline mr-1" />
                    {form.slip_photo ? "Replace" : "Upload"}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-neutral-400" />
                  No. of Packages
                </label>
                <input
                  data-testid="rej-edit-packages"
                  type="number"
                  min="1"
                  value={form.num_packages}
                  onChange={(e) => update({ num_packages: e.target.value })}
                  placeholder="0"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400"
                  disabled={saving}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-neutral-400" />
                  Package Photo
                </label>
                <div className="flex items-center gap-3">
                  {form.package_photo ? (
                    <div className="relative">
                      <img
                        src={form.package_photo}
                        alt="package"
                        className="w-16 h-16 rounded-xl object-cover border border-neutral-200"
                      />
                      <button
                        type="button"
                        onClick={() => update({ package_photo: null })}
                        disabled={saving}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-neutral-200 text-neutral-600 flex items-center justify-center hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center">
                      <Package className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}
                  <input
                    ref={packagePhotoRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhoto(e, "package")}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => packagePhotoRef.current?.click()}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    <Upload className="w-3.5 h-3.5 inline mr-1" />
                    {form.package_photo ? "Replace" : "Upload"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 - Courier Payment Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-5 w-1 rounded-full bg-blue-500" />
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Courier Payment & Vehicle</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-neutral-400" />
                  Courier Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-medium">₹</span>
                  <input
                    type="number"
                    value={form.courier_charge}
                    onChange={(e) => update({ courier_charge: e.target.value })}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-neutral-400" />
                  Courier By
                </label>
                <select
                  value={form.vehicle}
                  onChange={(e) => update({ vehicle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  disabled={saving}
                >
                  <option value="">Select</option>
                  <option value="bike">Bike</option>
                  <option value="car">Car</option>
                  <option value="auto">Auto</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                  Payment Mode
                </label>
                <select
                  value={form.payment_mode}
                  onChange={(e) => update({ payment_mode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  disabled={saving}
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="none">Unpaid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3 - Transportation Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-5 w-1 rounded-full bg-orange-500" />
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Transportation Details</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                  Transportation Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 font-medium">₹</span>
                  <input
                    type="number"
                    value={form.transport_charge}
                    onChange={(e) => update({ transport_charge: e.target.value })}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                  Transportation By
                </label>
                <select
                  value={form.transport_vehicle}
                  onChange={(e) => update({ transport_vehicle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
                  disabled={saving}
                >
                  <option value="">Select</option>
                  <option value="bike">Bike</option>
                  <option value="car">Car</option>
                  <option value="auto">Auto</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                  Payment Mode
                </label>
                <select
                  value={form.transport_payment_mode}
                  onChange={(e) => update({ transport_payment_mode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
                  disabled={saving}
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="none">Unpaid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4 - Additional Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-5 w-1 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Additional Info</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Handled by{" "}
                <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                data-testid="rej-edit-handled-by"
                value={form.handled_by}
                onChange={(e) => update({ handled_by: e.target.value })}
                placeholder="e.g. Biswajit"
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400"
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-neutral-100 bg-neutral-50/40 rounded-b-2xl sticky bottom-0">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
            data-testid="rej-edit-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed ${
              isOwnerRejected 
                ? "bg-orange-600 hover:bg-orange-700" 
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
            data-testid="rej-edit-resend-btn"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isOwnerRejected ? "Save & Send to Owner" : "Save & Send to Warehouse"}
          </button>
        </div>
      </div>
    </div>
  );
}