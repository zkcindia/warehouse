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
  CircleAlert,
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

export default function EditInvoiceModal({ parcel, onClose, onSaved }) {
  const { API, authHeaders } = useAuth();
  const fileRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [numPackages, setNumPackages] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [photo, setPhoto] = useState(null);
  const [paymentMode, setPaymentMode] = useState("none");
  const [products, setProducts] = useState([]);

  // Hydrate when modal opens with a parcel
  useEffect(() => {
    if (!parcel) return;
    setCompanyName(parcel.company_name || "");
    setNumPackages(String(parcel.num_packages || ""));
    setSubmittedBy(parcel.submitted_by || "");
    setPhoto(parcel.carton_photo || null);
    setPaymentMode(parcel.payment_made && parcel.payment_mode ? parcel.payment_mode : "none");
    setProducts(
      (parcel.products || []).map((p) => ({ name: p.name, quantity: String(p.quantity) }))
    );
  }, [parcel]);

  if (!parcel) return null;

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

  const updateProduct = (idx, field, val) =>
    setProducts((arr) => arr.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));
  const addProduct = () => setProducts((arr) => [...arr, { name: "", quantity: "" }]);
  const removeProduct = (idx) =>
    setProducts((arr) => (arr.length === 1 ? arr : arr.filter((_, i) => i !== idx)));

  const close = () => {
    if (saving) return;
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!numPackages || Number(numPackages) < 1)
      return toast.error("Number of packages must be at least 1.");
    const cleanProducts = products
      .map((p) => ({ name: p.name.trim(), quantity: Number(p.quantity) }))
      .filter((p) => p.name && p.quantity > 0);
    if (cleanProducts.length === 0)
      return toast.error("At least one product with name and quantity is required.");

    setSaving(true);
    try {
      const isPaid = paymentMode !== "none";
      // Photo: if unchanged keep, if cleared send '' to clear, if new send dataUrl
      let photoField;
      if (photo === parcel.carton_photo) photoField = undefined; // unchanged
      else if (!photo) photoField = ""; // cleared
      else photoField = photo;

      const payload = {
        company_name: companyName.trim() || "",
        num_packages: Number(numPackages),
        submitted_by: submittedBy.trim() || "",
        payment_made: isPaid,
        payment_mode: isPaid ? paymentMode : null,
        products: cleanProducts,
      };
      if (photoField !== undefined) payload.carton_photo = photoField;

      const res = await axios.patch(`${API}/parcels/${parcel.id}`, payload, {
        headers: authHeaders(),
      });
      toast.success(`${parcel.parcel_number} updated`);
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update invoice");
    } finally {
      setSaving(false);
    }
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-neutral-400">
              Edit stock invoice
            </div>
            <div className="text-base font-semibold text-neutral-900 truncate">
              {parcel.parcel_number}
              {parcel.company_name ? ` · ${parcel.company_name}` : ""}
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
        <form
          onSubmit={submit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
          id="edit-invoice-form"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-600">
                Company name <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                data-testid="edit-company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. ABC Traders"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600">
                Number of packages (cartons)
              </label>
              <input
                data-testid="edit-packages"
                type="number"
                min="1"
                value={numPackages}
                onChange={(e) => setNumPackages(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className="text-xs font-medium text-neutral-600">Carton photo (optional)</label>
            <div className="mt-1 flex items-center gap-3">
              {photo ? (
                <div className="relative">
                  <img
                    src={photo}
                    alt="carton"
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
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
              >
                <Upload className="w-3.5 h-3.5" /> {photo ? "Replace" : "Upload"}
              </button>
            </div>
          </div>

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Products
                </label>
                <p className="text-[11px] text-neutral-400">
                  Edit, remove, or add products. New rows get new IDs on save.
                </p>
              </div>
              <button
                type="button"
                data-testid="edit-add-product"
                onClick={addProduct}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
              >
                <Plus className="w-3.5 h-3.5" /> Add product
              </button>
            </div>
            <div className="space-y-2">
              {products.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    data-testid={`edit-product-name-${idx}`}
                    value={p.name}
                    onChange={(e) => updateProduct(idx, "name", e.target.value)}
                    placeholder="Product name"
                    className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <input
                    data-testid={`edit-product-qty-${idx}`}
                    type="number"
                    min="1"
                    value={p.quantity}
                    onChange={(e) => updateProduct(idx, "quantity", e.target.value)}
                    placeholder="Qty"
                    className="w-24 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => removeProduct(idx)}
                    disabled={products.length === 1}
                    className="p-2 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500 disabled:hover:border-neutral-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submitted by */}
          <div>
            <label className="text-xs font-medium text-neutral-600">
              Submitted by <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              data-testid="edit-submitted-by"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
              placeholder="e.g. Biswajit"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          {/* Payment mode */}
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
                    data-testid={`edit-payment-${m.key}`}
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
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-neutral-100 bg-white">
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5" />
            {products.length} product{products.length === 1 ? "" : "s"} ·{" "}
            {products.reduce((s, p) => s + (Number(p.quantity) || 0), 0)} units
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              form="edit-invoice-form"
              type="submit"
              data-testid="edit-submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                </>
              ) : (
                <>Submit changes</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
