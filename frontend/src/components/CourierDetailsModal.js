import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import {
  X,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Image as ImageIcon,
  Package,
  CreditCard,
  Smartphone,
  Wallet,
  Truck,
  CircleAlert,
  CircleCheck,
  Pencil,
  Calendar,
  UserRound,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";

const MAX_IMG_BYTES = 4 * 1024 * 1024;

const PAYMENT_OPTIONS = [
  { key: "upi", label: "UPI", Icon: Smartphone },
  { key: "card", label: "Card", Icon: CreditCard },
  { key: "cash", label: "Cash", Icon: Wallet },
  { key: "none", label: "Unpaid", Icon: CircleAlert },
];

function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

export default function CourierDetailsModal({ courier, onClose, onUpdated, onDeleted, readOnly = false, initialEdit = false }) {
  const { API, authHeaders } = useAuth();
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(false);

  // editable state
  const [company, setCompany] = useState("");
  const [packages, setPackages] = useState("");
  const [handledBy, setHandledBy] = useState("");
  const [photo, setPhoto] = useState(null);
  const [paymentMode, setPaymentMode] = useState("none");
  const [products, setProducts] = useState([]);
  const [orig, setOrig] = useState(null);

  useEffect(() => {
    if (!courier) return;
    setCompany(courier.courier_company || "");
    setPackages(String(courier.num_packages || ""));
    setHandledBy(courier.handled_by || "");
    setPhoto(courier.slip_photo || null);
    setPaymentMode(courier.payment_made && courier.payment_mode ? courier.payment_mode : "none");
    setProducts((courier.products || []).map((p) => ({ name: p.name, quantity: String(p.quantity) })));
    setOrig(courier);
    setEditing(!!initialEdit && !readOnly);
  }, [courier, initialEdit, readOnly]);

  if (!courier) return null;

  const close = () => {
    if (saving) return;
    onClose();
  };

  const cancelEdit = () => {
    if (!orig) return;
    setCompany(orig.courier_company || "");
    setPackages(String(orig.num_packages || ""));
    setHandledBy(orig.handled_by || "");
    setPhoto(orig.slip_photo || null);
    setPaymentMode(orig.payment_made && orig.payment_mode ? orig.payment_mode : "none");
    setProducts((orig.products || []).map((p) => ({ name: p.name, quantity: String(p.quantity) })));
    setEditing(false);
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (file.size > MAX_IMG_BYTES) return toast.error("Image must be under 4MB.");
    try {
      setPhoto(await fileToDataURL(file));
    } catch {
      toast.error("Failed to read image.");
    }
  };

  const addProductRow = () => setProducts((arr) => [...arr, { name: "", quantity: "" }]);
  const removeProductRow = (idx) =>
    setProducts((arr) => (arr.length === 1 ? arr : arr.filter((_, i) => i !== idx)));
  const updateProduct = (idx, field, val) =>
    setProducts((arr) => arr.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));

  const handleDeleteCourier = async () => {
    if (!window.confirm(`Delete courier ${courier.courier_number}? This cannot be undone.`)) return;
    setDeletingId(true);
    try {
      await axios.delete(`${API}/couriers/${courier.id}`, { headers: authHeaders() });
      toast.success(`${courier.courier_number} deleted`);
      onDeleted?.(courier.id);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete");
    } finally {
      setDeletingId(false);
    }
  };

  const handleSave = async () => {
    if (!packages || Number(packages) < 1) return toast.error("Number of packages must be at least 1.");
    setSaving(true);
    try {
      const isPaid = paymentMode !== "none";
      let photoField;
      if (photo === orig?.slip_photo) photoField = undefined;
      else if (!photo) photoField = "";
      else photoField = photo;
      const payload = {
        courier_company: company.trim() || "",
        num_packages: Number(packages),
        handled_by: handledBy.trim() || "",
        payment_made: isPaid,
        payment_mode: isPaid ? paymentMode : null,
      };
      if (photoField !== undefined) payload.slip_photo = photoField;
      const res = await axios.patch(`${API}/couriers/${courier.id}`, payload, {
        headers: authHeaders(),
      });
      toast.success(`${courier.courier_number} updated`);
      onUpdated?.(res.data);
      setEditing(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const PaymentBadge = () => {
    if (!courier.payment_made) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <CircleAlert className="w-3 h-3" /> Unpaid
        </span>
      );
    }
    const Icon =
      courier.payment_mode === "upi"
        ? Smartphone
        : courier.payment_mode === "card"
        ? CreditCard
        : Wallet;
    const label =
      courier.payment_mode === "upi" ? "UPI" : courier.payment_mode === "card" ? "Card" : "Cash";
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CircleCheck className="w-3 h-3" /> Paid · <Icon className="w-3 h-3" /> {label}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[92vh] overflow-hidden flex flex-col fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-neutral-400">Courier entry</div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <div className="text-base font-semibold text-neutral-900">
                {courier.courier_number}
              </div>
              <PaymentBadge />
            </div>
          </div>
          <button
            onClick={close}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {!editing ? (
            <>
              {/* VIEW MODE */}
              {courier.slip_photo && (
                <img
                  src={courier.slip_photo}
                  alt={courier.courier_number}
                  className="w-full max-h-64 object-cover rounded-xl border border-neutral-200"
                />
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoTile icon={Truck} label="Courier company" value={courier.courier_company || "—"} />
                <InfoTile icon={Package} label="Packages" value={courier.num_packages} />
                <InfoTile icon={Boxes} label="Total units" value={courier.total_quantity} />
                <InfoTile icon={UserRound} label="Handled by" value={courier.handled_by || "—"} />
                <InfoTile icon={UserRound} label="Logged by" value={courier.created_by_name} />
                <InfoTile
                  icon={Calendar}
                  label="Logged at"
                  value={new Date(courier.created_at).toLocaleString()}
                />
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">
                  Items ({courier.products.length})
                </div>
                <div className="border border-neutral-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-500">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-right px-3 py-2 font-medium w-24">Qty</th>
                        <th className="text-left px-3 py-2 font-medium">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {courier.products.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-50">
                          <td className="px-3 py-2 text-neutral-800">{p.name}</td>
                          <td className="px-3 py-2 text-right text-neutral-900 font-semibold">
                            {p.quantity}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-neutral-400">
                            {p.id.slice(0, 8)}…
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* EDIT MODE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-neutral-600">Courier company <span className="text-neutral-400 font-normal">(optional)</span></label>
                  <input
                    data-testid="edit-courier-company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. DTDC"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-600">Number of packages</label>
                  <input
                    data-testid="edit-courier-packages"
                    type="number"
                    min="1"
                    value={packages}
                    onChange={(e) => setPackages(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600">Slip photo (optional)</label>
                <div className="mt-1 flex items-center gap-3">
                  {photo ? (
                    <div className="relative">
                      <img
                        src={photo}
                        alt="slip"
                        className="w-20 h-20 object-cover rounded-xl border border-neutral-200"
                      />
                      <button
                        type="button"
                        onClick={() => setPhoto(null)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-neutral-200 text-neutral-600 shadow flex items-center justify-center hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    <Upload className="w-3.5 h-3.5" /> {photo ? "Replace" : "Upload"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600">Handled by</label>
                <input
                  value={handledBy}
                  onChange={(e) => setHandledBy(e.target.value)}
                  placeholder="e.g. Biswajit"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <div className="text-xs font-medium text-neutral-600 mb-2">Payment mode</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PAYMENT_OPTIONS.map((m) => {
                    const active = paymentMode === m.key;
                    const isNone = m.key === "none";
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setPaymentMode(m.key)}
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-neutral-100 bg-white">
          {!editing ? (
            <>
              <button
                type="button"
                data-testid="courier-delete-btn"
                onClick={handleDeleteCourier}
                disabled={deletingId}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-red-600 hover:bg-red-50 hover:border-red-200 disabled:opacity-60"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Delete
                  </>
                )}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Close
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    data-testid="courier-edit-btn"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] text-neutral-400">
                {(courier.products?.length || 0)} item{(courier.products?.length || 0) === 1 ? "" : "s"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="courier-save-btn"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>Save changes</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-400">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="mt-1 text-sm font-medium text-neutral-800 break-words">{value}</div>
    </div>
  );
}
