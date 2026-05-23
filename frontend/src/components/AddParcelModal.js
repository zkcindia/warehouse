import React, { useRef, useState } from "react";
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
  Boxes,
  CircleAlert,
} from "lucide-react";
import { toast } from "sonner";

const MAX_IMG_BYTES = 4 * 1024 * 1024; // 4MB

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

export default function AddParcelModal({ open, onClose, onCreated }) {
  const { API, authHeaders } = useAuth();
  const fileRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [numPackages, setNumPackages] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [photo, setPhoto] = useState(null); // data URL
  const [products, setProducts] = useState([{ name: "", quantity: "" }]);
  // payment_mode: 'upi' | 'card' | 'cash' | 'none'
  const [paymentMode, setPaymentMode] = useState("none");

  if (!open) return null;

  const reset = () => {
    setCompanyName("");
    setNumPackages("");
    setSubmittedBy("");
    setPhoto(null);
    setProducts([{ name: "", quantity: "" }]);
    setPaymentMode("none");
  };

  const close = () => {
    if (submitting) return;
    onClose();
    setTimeout(reset, 200);
  };

  const updateProduct = (idx, field, val) => {
    setProducts((arr) => arr.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));
  };
  const addProductRow = () => setProducts((arr) => [...arr, { name: "", quantity: "" }]);
  const removeProductRow = (idx) =>
    setProducts((arr) => (arr.length === 1 ? arr : arr.filter((_, i) => i !== idx)));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMG_BYTES) {
      toast.error("Image must be under 4MB.");
      return;
    }
    try {
      const dataUrl = await fileToDataURL(file);
      setPhoto(dataUrl);
    } catch {
      toast.error("Failed to read image.");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!numPackages || Number(numPackages) < 1) return toast.error("Number of packages must be at least 1.");
    const cleanProducts = products
      .map((p) => ({ name: p.name.trim(), quantity: Number(p.quantity) }))
      .filter((p) => p.name && p.quantity > 0);
    if (cleanProducts.length === 0)
      return toast.error("Add at least one product with name and quantity.");

    setSubmitting(true);
    try {
      const isPaid = paymentMode !== "none";
      const payload = {
        company_name: companyName.trim() || null,
        num_packages: Number(numPackages),
        carton_photo: photo || null,
        products: cleanProducts,
        submitted_by: submittedBy.trim() || null,
        payment_made: isPaid,
        payment_mode: isPaid ? paymentMode : null,
      };
      const res = await axios.post(`${API}/parcels`, payload, { headers: authHeaders() });
      toast.success(`Stock invoice ${res.data.parcel_number} created`);
      onCreated?.(res.data);
      close();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create stock invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[90vh] overflow-hidden flex flex-col fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-neutral-900">Stock Invoice</div>
              <div className="text-xs text-neutral-500">Log products coming into the warehouse.</div>
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
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Parcel basics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-neutral-600">Company name</label>
              <input
                data-testid="parcel-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. ABC Traders"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600">Number of packages (cartons)</label>
              <input
                data-testid="parcel-packages"
                type="number"
                min="1"
                value={numPackages}
                onChange={(e) => setNumPackages(e.target.value)}
                placeholder="e.g. 12"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className="text-xs font-medium text-neutral-600">Carton photo (optional)</label>
            <div className="mt-1 flex items-center gap-4">
              {photo ? (
                <div className="relative">
                  <img
                    src={photo}
                    alt="carton"
                    className="w-24 h-24 object-cover rounded-xl border border-neutral-200"
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
                <div className="w-24 h-24 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
              <input
                ref={fileRef}
                data-testid="parcel-photo"
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                <Upload className="w-4 h-4" />
                {photo ? "Replace photo" : "Upload photo"}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">PNG / JPG / WEBP, up to 4MB.</p>
          </div>

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Products in this parcel
                </label>
                <p className="text-[11px] text-neutral-400">Each product gets a unique ID and timestamp on save.</p>
              </div>
              <button
                type="button"
                data-testid="add-product-row"
                onClick={addProductRow}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
              >
                <Plus className="w-3.5 h-3.5" /> Add product
              </button>
            </div>
            <div className="space-y-2">
              {products.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    data-testid={`product-name-${idx}`}
                    value={p.name}
                    onChange={(e) => updateProduct(idx, "name", e.target.value)}
                    placeholder="Product name"
                    className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <input
                    data-testid={`product-qty-${idx}`}
                    type="number"
                    min="1"
                    value={p.quantity}
                    onChange={(e) => updateProduct(idx, "quantity", e.target.value)}
                    placeholder="Qty"
                    className="w-24 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => removeProductRow(idx)}
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
            <label className="text-xs font-medium text-neutral-600">Submitted by <span className="text-neutral-400 font-normal">(optional)</span></label>
            <input
              data-testid="parcel-submitted-by"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
              placeholder="e.g. Biswajit"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <p className="text-[11px] text-neutral-400 mt-1">Name of the person who handed over / submitted this stock.</p>
          </div>

          {/* Payment mode */}
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4">
            <div className="mb-3">
              <div className="text-sm font-medium text-neutral-800">Payment mode</div>
              <div className="text-xs text-neutral-500">Select how this stock was paid for. Choose <span className="font-medium">Unpaid</span> if no payment has been made yet.</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: "upi", label: "UPI", Icon: Smartphone },
                { key: "card", label: "Card", Icon: CreditCard },
                { key: "cash", label: "Cash", Icon: Wallet },
                { key: "none", label: "Unpaid", Icon: CircleAlert },
              ].map((m) => {
                const active = paymentMode === m.key;
                const isNone = m.key === "none";
                return (
                  <button
                    key={m.key}
                    type="button"
                    data-testid={`payment-mode-${m.key}`}
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
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-100 bg-white">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="submit-parcel"
            disabled={submitting}
            onClick={submit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>Submit invoice</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
