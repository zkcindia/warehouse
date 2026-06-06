import React, { useCallback, useEffect, useState , useRef } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

import {
  Crown,
  Truck,
  Package,
  Boxes,
  Layers,
  IndianRupee,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Send,
  Building2,
  ClipboardList,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
  Hash,
  Tag,
  User,
  Lock,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Clock,
  UserPlus,
  Edit,
  Save,
  Upload,
  CreditCard,
  Smartphone,
  Wallet,
  CircleAlert,
  Paperclip,
} from "lucide-react";

function StatTile({ icon: Icon, label, value, tone = "neutral", testId }) {


  const tones = {
    neutral: "bg-white border-neutral-200 text-neutral-700",
    primary: "bg-neutral-900 border-neutral-900 text-white",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    danger: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
  };
  const iconBg = {
    neutral: "bg-neutral-100 text-neutral-600",
    primary: "bg-white/10 text-white",
    warning: "bg-amber-200/60 text-amber-800",
    success: "bg-emerald-200/60 text-emerald-800",
    danger: "bg-red-200/60 text-red-800",
    info: "bg-blue-200/60 text-blue-800",
    purple: "bg-purple-200/60 text-purple-800",
  };
  return (
    <div
      data-testid={testId}
      className={`p-3.5 rounded-2xl border ${tones[tone]} flex items-start gap-3`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg[tone]}`}
      >
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10.5px] uppercase tracking-wider opacity-80">
          {label}
        </div>
        <div className="mt-0.5 text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

// Product Line Component for Display
function ProductLine({ p, index }) {
  return (
    <div className="flex items-start gap-3 py-2.5 px-3 border-t border-neutral-100 first:border-t-0">
      {p.photo ? (
        <img
          src={p.photo}
          alt={p.name}
          className="w-10 h-10 rounded-md object-cover border border-neutral-100 shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-md bg-neutral-50 border border-neutral-100 text-neutral-300 flex items-center justify-center shrink-0">
          <ImageIcon className="w-4 h-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-sm bg-neutral-900 text-white text-[10px] font-bold">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-neutral-900 truncate">
            {p.name || "(Untitled item)"}
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-900 text-white">
            <Boxes className="w-2.5 h-2.5" /> {p.quantity}
          </span>
          {p.damaged_count > 0 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
              <AlertTriangle className="w-2.5 h-2.5" /> {p.damaged_count}
            </span>
          )}
          {p.price != null && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-neutral-600">
              <IndianRupee className="w-2.5 h-2.5" />
              {p.price.toLocaleString()}
              <span className="text-neutral-400">/unit</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px] text-neutral-500">
          {p.brand && (
            <span className="inline-flex items-center gap-0.5">
              <Tag className="w-2.5 h-2.5" /> {p.brand}
            </span>
          )}
          {p.category && (
            <span className="px-1.5 py-0.5 rounded-full bg-neutral-100">
              {p.category}
            </span>
          )}
          {p.code && (
            <span className="font-mono inline-flex items-center gap-0.5">
              <Hash className="w-2.5 h-2.5" /> {p.code}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Full Edit Courier Modal - Like Cashier Form
function EditCourierModal({ courier, onClose, onSave }) {
  const { API, authHeaders } = useAuth();
  const fileRef = useRef(null);
  const packagePhotoRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    courier_company: "",
    num_packages: "",
    photo: null,
    package_photo: null,
    courier_charge: "",
    vehicle: "",
    payment_mode: "none",
    handled_by: "",
    transport_charge: "",
    transport_vehicle: "",
    transport_payment_mode: "none",
    attachments: [],
  });
  const [originalPhoto, setOriginalPhoto] = useState(null);
  const [originalPackagePhoto, setOriginalPackagePhoto] = useState(null);

  useEffect(() => {
    if (courier) {
      setFormData({
        courier_company: courier.courier_company || "",
        num_packages: courier.num_packages || "",
        photo: courier.slip_photo || null,
        package_photo: courier.package_photo || null,
        courier_charge: courier.charges?.toString() || "",
        vehicle: courier.vehicle || "",
        payment_mode: courier.payment_made ? (courier.payment_mode || "none") : "none",
        handled_by: courier.handled_by || "",
        transport_charge: courier.transport_charge?.toString() || "",
        transport_vehicle: courier.transport_vehicle || "",
        transport_payment_mode: courier.transport_payment_mode || "none",
        attachments: courier.attachments || [],
      });
      setOriginalPhoto(courier.slip_photo || null);
      setOriginalPackagePhoto(courier.package_photo || null);
    }
  }, [courier]);

  if (!courier) return null;

  const update = (patch) => setFormData(prev => ({ ...prev, ...patch }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (file.size > 4 * 1024 * 1024) return toast.error("Image must be under 4MB.");
    try {
      const reader = new FileReader();
      reader.onloadend = () => update({ photo: reader.result });
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to read image.");
    }
  };

  const handlePackagePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose image file");
    if (file.size > 4 * 1024 * 1024) return toast.error("Image must be under 4MB");
    try {
      const reader = new FileReader();
      reader.onloadend = () => update({ package_photo: reader.result });
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to read image");
    }
  };

  const handleSave = async () => {
    if (!formData.num_packages || parseInt(formData.num_packages) < 1) {
      toast.error("Number of packages is required");
      return;
    }
    
    setSaving(true);
    try {
      const isPaid = formData.payment_mode !== "none";
      const isTransportPaid = formData.transport_payment_mode !== "none";
      
      const payload = {
        courier_company: formData.courier_company.trim() || null,
        num_packages: parseInt(formData.num_packages),
        handled_by: formData.handled_by.trim() || null,
        payment_made: isPaid,
        payment_mode: isPaid ? formData.payment_mode : null,
        charges: formData.courier_charge ? parseFloat(formData.courier_charge) : null,
        vehicle: formData.vehicle || null,
        transport_charge: formData.transport_charge ? parseFloat(formData.transport_charge) : null,
        transport_vehicle: formData.transport_vehicle || null,
        transport_payment_mode: isTransportPaid ? formData.transport_payment_mode : null,
      };
      
      if (formData.photo !== originalPhoto) {
        payload.slip_photo = formData.photo || "";
      }
      if (formData.package_photo !== originalPackagePhoto) {
        payload.package_photo = formData.package_photo || "";
      }
      
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

  const PAYMENT_ICON = {
    upi: Smartphone,
    card: CreditCard,
    cash: Wallet,
    none: CircleAlert,
  };
  const PAYMENT_LABEL = {
    upi: "UPI",
    card: "Card",
    cash: "Cash",
    none: "Unpaid",
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 bg-gradient-to-r from-neutral-800 to-neutral-700 text-white">
          <div className="flex items-center gap-3">
            <Edit className="w-5 h-5" />
            <div>
              <div className="text-sm font-semibold">Edit Courier</div>
              <div className="text-xs text-neutral-300">{courier.courier_number}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Courier Details Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-1 rounded-full bg-purple-500" />
              <h3 className="text-sm font-semibold text-neutral-700">Courier Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Courier Name
                </label>
                <input
                  value={formData.courier_company}
                  onChange={(e) => update({ courier_company: e.target.value })}
                  placeholder="DTDC"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Slip Photo
                </label>
                <div className="mt-1 flex items-center gap-2">
                  {formData.photo ? (
                    <img src={formData.photo} alt="slip" className="w-12 h-12 rounded-lg object-cover border border-neutral-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                  <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs hover:bg-neutral-50">
                    <Upload className="w-3.5 h-3.5 inline mr-1" /> {formData.photo ? "Change" : "Upload"}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> No. of Packages *
                </label>
                <input
                  type="number"
                  value={formData.num_packages}
                  onChange={(e) => update({ num_packages: e.target.value })}
                  placeholder="0"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Package Photo
                </label>
                <div className="mt-1 flex items-center gap-2">
                  {formData.package_photo ? (
                    <img src={formData.package_photo} alt="package" className="w-12 h-12 rounded-lg object-cover border border-neutral-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                      <Package className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}
                  <input ref={packagePhotoRef} type="file" accept="image/*" onChange={handlePackagePhoto} className="hidden" />
                  <button onClick={() => packagePhotoRef.current?.click()} className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs hover:bg-neutral-50">
                    <Upload className="w-3.5 h-3.5 inline mr-1" /> {formData.package_photo ? "Change" : "Upload"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Vehicle Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-1 rounded-full bg-blue-500" />
              <h3 className="text-sm font-semibold text-neutral-700">Payment & Vehicle</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" /> Courier Amount
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
                  <input
                    type="number"
                    value={formData.courier_charge}
                    onChange={(e) => update({ courier_charge: e.target.value })}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Courier By
                </label>
                <select
                  value={formData.vehicle}
                  onChange={(e) => update({ vehicle: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm"
                >
                  <option value="">Select</option>
                  <option value="bike">Bike</option>
                  <option value="car">Car</option>
                  <option value="auto">Auto</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Payment Mode
                </label>
                <select
                  value={formData.payment_mode}
                  onChange={(e) => update({ payment_mode: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm"
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="none">Unpaid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transportation Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-1 rounded-full bg-orange-500" />
              <h3 className="text-sm font-semibold text-neutral-700">Transportation Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-neutral-600">Transportation Amount</label>
                <input
                  type="number"
                  value={formData.transport_charge}
                  onChange={(e) => update({ transport_charge: e.target.value })}
                  placeholder="₹ 0"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600">Transportation By</label>
                <select
                  value={formData.transport_vehicle}
                  onChange={(e) => update({ transport_vehicle: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm"
                >
                  <option value="">Select</option>
                  <option value="bike">Bike</option>
                  <option value="car">Car</option>
                  <option value="auto">Auto</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600">Payment Mode</label>
                <select
                  value={formData.transport_payment_mode}
                  onChange={(e) => update({ transport_payment_mode: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm"
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="none">Unpaid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-1 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold text-neutral-700">Additional Info</h3>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600">Handled by (optional)</label>
              <input
                value={formData.handled_by}
                onChange={(e) => update({ handled_by: e.target.value })}
                placeholder="e.g. Biswajit"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-50 text-sm"
              />
            </div>
          </div>

          {/* Products Section - Readonly Display */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-1 rounded-full bg-rose-500" />
              <h3 className="text-sm font-semibold text-neutral-700">Products</h3>
              <span className="text-xs text-neutral-500">({courier.products?.length || 0} items)</span>
            </div>
            <div className="border border-neutral-200 rounded-xl max-h-48 overflow-y-auto">
              {courier.products?.length === 0 ? (
                <div className="py-4 text-center text-sm text-neutral-400">No products in this courier</div>
              ) : (
                courier.products.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 border-b border-neutral-100 last:border-b-0">
                    {p.photo ? (
                      <img src={p.photo} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-neutral-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-neutral-500">Qty: {p.quantity} | Price: ₹{p.price?.toLocaleString() || 0}/unit</div>
                      {p.brand && <div className="text-xs text-neutral-400">{p.brand}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 bg-neutral-50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-300 text-sm text-neutral-700 hover:bg-white">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Component for Cashier couriers waiting for Owner approval
function PendingCashierCourierCard({
  courier,
  onApprove,
  onReject,
  onEdit,
  onUploadList,
  onUploadInvoice,
  busy,
}) {
  const [open, setOpen] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  
  const items = courier.products || [];
  const totalUnits = items.reduce((n, p) => n + (p.quantity || 0), 0);
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
        <div className="flex items-start justify-between gap-3 px-4 py-3 bg-purple-100/30">
          <button onClick={() => setOpen((v) => !v)} className="flex items-start gap-3 min-w-0 flex-1 text-left">
            <div className="mt-1 text-neutral-400 shrink-0">
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-mono font-semibold text-neutral-900">{courier.courier_number}</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                  <Clock className="w-3 h-3" /> Pending Owner Approval
                </span>
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
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500 flex-wrap">
                <span className="inline-flex items-center gap-1"><UserPlus className="w-3 h-3" /> Created by: {courier.created_by_name || "Cashier"}</span>
                {courier.created_at && <span>· {new Date(courier.created_at).toLocaleString()}</span>}
              </div>
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0">

<button
  onClick={() => onUploadList(courier)}
  disabled={busy}
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
>
  <Upload className="w-3.5 h-3.5" /> Upload List
</button>




            <button onClick={() => onEdit(courier)} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700" title="Edit Courier">
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={() => onApprove(courier)} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
            </button>
            <button onClick={() => setShowRejectModal(true)} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700">
              <X className="w-3.5 h-3.5" /> Reject
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
      
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center"><XCircle className="w-5 h-5" /></div>
              <div><h3 className="text-lg font-semibold text-neutral-900">Reject Courier</h3><p className="text-sm text-neutral-500">{courier.courier_number} will be sent back to Cashier</p></div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Reason for rejection <span className="text-red-500">*</span></label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Missing invoice, wrong courier company, incomplete details..." className="w-full p-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none" rows={4} autoFocus />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowRejectModal(false); setRejectReason(""); }} className="px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason.trim()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Component for Warehouse couriers waiting for Owner to forward to Data Entry
function PendingWarehouseCourierCard({ courier, onForward, onEdit, busy }) {
  const [open, setOpen] = useState(true);
  const items = courier.products || [];
  const totalUnits = items.reduce((n, p) => n + (p.quantity || 0), 0);
  const totalDamaged = items.reduce((n, p) => n + (p.damaged_count || 0), 0);
  const totalValue = items.reduce((s, p) => s + (p.price ? p.price * (p.quantity || 0) : 0), 0);

  return (
    <div className="border border-neutral-200 rounded-2xl bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3 bg-neutral-50/60">
        <button onClick={() => setOpen((v) => !v)} className="flex items-start gap-3 min-w-0 flex-1 text-left">
          <div className="mt-1 text-neutral-400 shrink-0">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono font-semibold text-neutral-900">{courier.courier_number}</span>
              {courier.courier_company && <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500"><Truck className="w-3 h-3" /> {courier.courier_company}</span>}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700"><Package className="w-3 h-3" /> {courier.num_packages} pkgs</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-900 text-white"><Boxes className="w-3 h-3" /> {items.length} items · {totalUnits} units</span>
              {totalDamaged > 0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200"><AlertTriangle className="w-3 h-3" /> {totalDamaged} damaged</span>}
              {totalValue > 0 && <span className="inline-flex items-center gap-0.5 text-[11px] text-neutral-600"><IndianRupee className="w-3 h-3" /> {totalValue.toLocaleString()}</span>}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500 flex-wrap">
              {courier.sent_to_owner_by && <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> Submitted by {courier.sent_to_owner_by}</span>}
              {courier.sent_to_owner_at && <span>· {new Date(courier.sent_to_owner_at).toLocaleString()}</span>}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onEdit(courier)} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700" title="Edit Courier">
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={() => onForward(courier)} disabled={busy || !items.length} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 shrink-0">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send to Data Entry
          </button>
        </div>
      </div>
      {open && (
        <div>
          {items.length === 0 ? <div className="py-6 px-4 text-center text-sm text-neutral-400">No items in this courier.</div> : items.map((p, idx) => <ProductLine key={p.id} p={p} index={idx} />)}
        </div>
      )}
    </div>
  );
}

export default function OwnerDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [pendingCashierCouriers, setPendingCashierCouriers] = useState([]);
  const [pendingWarehouseCouriers, setPendingWarehouseCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [editingCourier, setEditingCourier] = useState(null);



  const uploadListRef = useRef(null);
const uploadInvoiceRef = useRef(null);
const [uploadCourier, setUploadCourier] = useState(null);
const [showListUploadModal, setShowListUploadModal] = useState(false);
const [listText, setListText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, cashierPending, warehousePending] = await Promise.all([
        axios.get(`${API}/owner/analytics`, { headers: authHeaders() }),
        axios.get(`${API}/owner/pending-cashier-couriers`, { headers: authHeaders() }),
        axios.get(`${API}/owner/couriers/pending`, { headers: authHeaders() }),
      ]);
      setAnalytics(a.data || null);
      setPendingCashierCouriers(cashierPending.data || []);
      setPendingWarehouseCouriers(warehousePending.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load owner data");
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]);

  useEffect(() => { load(); }, [load]);

  const handleEditSave = (updatedCourier) => {
    setPendingCashierCouriers(prev => prev.map(c => c.id === updatedCourier.id ? updatedCourier : c));
    setPendingWarehouseCouriers(prev => prev.map(c => c.id === updatedCourier.id ? updatedCourier : c));
  };

  const handleApprove = async (courier) => {
    setBusyId(courier.id);
    try {
      await axios.patch(`${API}/couriers/${courier.id}/owner-approve`, { accepted: true }, { headers: authHeaders() });
      toast.success(`${courier.courier_number} approved for Warehouse processing`);
      setPendingCashierCouriers((arr) => arr.filter((x) => x.id !== courier.id));
      axios.get(`${API}/owner/analytics`, { headers: authHeaders() }).then((r) => setAnalytics(r.data || null)).catch(() => {});
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to approve courier");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (courier, reason) => {
    setBusyId(courier.id);
    try {
      await axios.patch(`${API}/couriers/${courier.id}/owner-reject`, { reason: reason }, { headers: authHeaders() });
      toast.success(`${courier.courier_number} rejected, sent back to Cashier`);
      setPendingCashierCouriers((arr) => arr.filter((x) => x.id !== courier.id));
      axios.get(`${API}/owner/analytics`, { headers: authHeaders() }).then((r) => setAnalytics(r.data || null)).catch(() => {});
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to reject courier");
    } finally {
      setBusyId(null);
    }
  };

  const forwardCourier = async (c) => {
    setBusyId(c.id);
    try {
      await axios.patch(`${API}/couriers/${c.id}/owner-forward`, { forward: true }, { headers: authHeaders() });
      toast.success(`${c.courier_number} forwarded to Data Entry (${c.products?.length || 0} items)`);
      setPendingWarehouseCouriers((arr) => arr.filter((x) => x.id !== c.id));
      axios.get(`${API}/owner/analytics`, { headers: authHeaders() }).then((r) => setAnalytics(r.data || null)).catch(() => {});
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to forward");
    } finally {
      setBusyId(null);
    }
  };

  const handleUploadListText = async () => {
  if (!uploadCourier) return;
  if (!listText.trim()) return toast.error("Enter list text");

  try {
    await axios.patch(
      `${API}/couriers/${uploadCourier.id}`,
      {
        upload_list_type: "text",
        upload_list_text: listText.trim(),
      },
      { headers: authHeaders() }
    );

    toast.success("List text uploaded successfully");
    setShowListUploadModal(false);
    setListText("");
    setUploadCourier(null);
    load();
  } catch (err) {
    toast.error(err?.response?.data?.detail || "Failed to upload list text");
  }
};


const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const openUploadList = (courier) => {
  setUploadCourier(courier);
  setShowListUploadModal(true);
};

const openUploadInvoice = (courier) => {
  setUploadCourier(courier);
  uploadInvoiceRef.current?.click();
};


const handleUploadListFile = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!uploadCourier) return toast.error("Courier not selected");

  if (!file.type.startsWith("image/")) {
    e.target.value = "";
    return toast.error("Please select image file");
  }

  try {
    const dataUrl = await fileToDataURL(file);

    await axios.patch(
      `${API}/couriers/${uploadCourier.id}`,
      {
        upload_list_type: "image",
        upload_list_photo: dataUrl,
        upload_list_name: file.name,
        upload_list_mime: file.type || null,
      },
      {
        headers: authHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    toast.success("List image uploaded successfully");
    setShowListUploadModal(false);
    setListText("");
    setUploadCourier(null);
    load();
  } catch (err) {
    toast.error(err?.response?.data?.detail || "Failed to upload list image");
  } finally {
    e.target.value = "";
  }
};

const handleUploadInvoiceFile = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!uploadCourier) return toast.error("Courier not selected");

  if (!file.type.startsWith("image/")) {
    e.target.value = "";
    return toast.error("Invoice must be image");
  }

  try {
    const dataUrl = await fileToDataURL(file);

    await axios.patch(
      `${API}/couriers/${uploadCourier.id}`,
      {
        invoice_photo: dataUrl,
        invoice_name: file.name,
        invoice_mime: file.type || null,
      },
      {
        headers: authHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    toast.success("Invoice uploaded successfully");
    setUploadCourier(null);
    load();
  } catch (err) {
    toast.error(err?.response?.data?.detail || "Failed to upload invoice");
  } finally {
    e.target.value = "";
  }
};

  const a = analytics || {};

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto pb-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center"><Crown className="w-5 h-5" /></div>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-400">Owner</div>
              <div className="text-2xl font-semibold tracking-tight text-neutral-900">Owner Console</div>
              <div className="text-sm text-neutral-500">Hi {user?.full_name?.split(" ")[0] || "Owner"}, approve cashier couriers → monitor warehouse → forward to Data Entry.</div>
            </div>
          </div>
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>

        {/* Analytics Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatTile icon={Truck} label="Total couriers" value={loading ? "…" : a.total_couriers ?? 0} tone="primary" />
          <StatTile icon={UserPlus} label="Pending Cashier" value={loading ? "…" : a.pending_cashier ?? 0} tone="purple" />
          <StatTile icon={ClipboardList} label="Pending warehouse" value={loading ? "…" : a.pending_warehouse ?? 0} tone="info" />
          <StatTile icon={Building2} label="Pending your review" value={loading ? "…" : a.pending_owner_review ?? 0} tone="warning" />
          <StatTile icon={Lock} label="In Data Entry" value={loading ? "…" : a.in_data_entry ?? 0} tone="info" />
          <StatTile icon={ClipboardList} label="Ready for verification" value={loading ? "…" : a.ready_verification ?? 0} tone="warning" />
          <StatTile icon={CheckCircle2} label="Verified" value={loading ? "…" : a.verified ?? 0} tone="success" />
          <StatTile icon={Layers} label="Total items" value={loading ? "…" : a.total_items ?? 0} tone="neutral" />
          {/* <StatTile icon={Boxes} label="Total units" value={loading ? "…" : a.total_units ?? 0} tone="neutral" />
          <StatTile icon={AlertTriangle} label="Damaged units" value={loading ? "…" : a.damaged_units ?? 0} tone={a.damaged_units > 0 ? "danger" : "neutral"} />
          <StatTile icon={XCircle} label="Open rejections" value={loading ? "…" : a.rejected_open ?? 0} tone={a.rejected_open > 0 ? "danger" : "neutral"} /> */}
        </div>

        {/* SECTION 1: Cashier Submissions */}
        {pendingCashierCouriers.length > 0 && (
          <div className="bg-white border border-purple-200 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center"><UserPlus className="w-5 h-5" /></div>
                <div>
                  <div className="text-base font-semibold text-neutral-900">Cashier Submissions · Pending Your Approval</div>
                  <div className="text-xs text-neutral-500">Review couriers created by Cashier. Approve to send to Warehouse, or Reject to send back to Cashier.</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">{pendingCashierCouriers.length} pending approval</span>
            </div>
            {loading ? (
              <div className="py-10 flex items-center justify-center text-neutral-400 text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
            ) : (
              <div className="space-y-3">
                {pendingCashierCouriers.map((c) => (
   <PendingCashierCourierCard
  key={c.id}
  courier={c}
  busy={busyId === c.id}
  onApprove={handleApprove}
  onReject={handleReject}
  onEdit={setEditingCourier}
  onUploadList={openUploadList}
  onUploadInvoice={openUploadInvoice}
/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: Warehouse Completed */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
              <div>
                <div className="text-base font-semibold text-neutral-900">Warehouse Completed · Forward to Data Entry</div>
                <div className="text-xs text-neutral-500">Submitted by Warehouse after SOP completion. Review and forward to Data Entry team.</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">{pendingWarehouseCouriers.length} pending forward</span>
          </div>
          {loading ? (
            <div className="py-10 flex items-center justify-center text-neutral-400 text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : pendingWarehouseCouriers.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-neutral-200 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2"><CheckCircle2 className="w-5 h-5" /></div>
              <div className="text-sm text-neutral-700 font-medium">All caught up</div>
              <div className="text-xs text-neutral-500 mt-0.5">When Warehouse staff complete SOP, couriers land here for you to forward.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingWarehouseCouriers.map((c) => (
                <PendingWarehouseCourierCard key={c.id} courier={c} busy={busyId === c.id} onForward={forwardCourier} onEdit={setEditingCourier} />
              ))}
            </div>
          )}
        </div>
      </div>

{showListUploadModal && (
  <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-white rounded-2xl p-5">
      <h3 className="text-lg font-semibold mb-4">
        Upload List
      </h3>

      <textarea
        value={listText}
        onChange={(e) => setListText(e.target.value)}
        placeholder="Paste list here..."
        rows={6}
        className="w-full border border-neutral-200 rounded-xl p-3 text-sm mb-4"
      />

      <div className="flex gap-2">
        <button
          onClick={handleUploadListText}
          className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white"
        >
          Save Text
        </button>

        <button
          onClick={() => uploadListRef.current?.click()}
          className="flex-1 px-4 py-2 rounded-xl bg-neutral-900 text-white"
        >
          Upload Image
        </button>
      </div>

      <button
        onClick={() => {
          setShowListUploadModal(false);
          setListText("");
        }}
        className="w-full mt-3 px-4 py-2 rounded-xl border"
      >
        Cancel
      </button>
    </div>
  </div>
)}

      {/* Edit Courier Modal */}
      {editingCourier && (
        <EditCourierModal courier={editingCourier} onClose={() => setEditingCourier(null)} onSave={handleEditSave} />
      )}
    </DashboardShell>
  );
}