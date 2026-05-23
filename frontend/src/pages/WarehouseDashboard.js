import React, { useRef, useState } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import {
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
  CircleCheck,
  X,
  RefreshCw,
  Building2,
  Pencil,
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

const PAYMENT_OPTIONS = [
  { key: "upi", label: "UPI", Icon: Smartphone },
  { key: "card", label: "Card", Icon: CreditCard },
  { key: "cash", label: "Cash", Icon: Wallet },
  { key: "none", label: "Unpaid", Icon: CircleAlert },
];

const emptyEntry = () => ({
  uid: Math.random().toString(36).slice(2),
  company_name: "",
  num_packages: "",
  photo: null,
  products: [{ name: "", quantity: "" }],
  payment_mode: "none", // 'upi' | 'card' | 'cash' | 'none'
});

function CompanyEntryCard({ entry, index, total, onChange, onRemove }) {
  const fileRef = useRef(null);
  const update = (patch) => onChange({ ...entry, ...patch });

  const updateProduct = (idx, field, val) => {
    const products = entry.products.map((p, i) => (i === idx ? { ...p, [field]: val } : p));
    update({ products });
  };
  const addProductRow = () =>
    update({ products: [...entry.products, { name: "", quantity: "" }] });
  const removeProductRow = (idx) => {
    if (entry.products.length === 1) return;
    update({ products: entry.products.filter((_, i) => i !== idx) });
  };

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
      update({ photo: dataUrl });
    } catch {
      toast.error("Failed to read image.");
    }
  };

  const totalUnits = entry.products.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
  const filledProducts = entry.products.filter((p) => p.name.trim() && Number(p.quantity) > 0).length;

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-neutral-50/60 rounded-t-2xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-900 truncate">
              {entry.company_name?.trim() || `Company #${index + 1}`}
            </div>
            <div className="text-[11px] text-neutral-500">
              {filledProducts} product{filledProducts === 1 ? "" : "s"} · {totalUnits} units
              {entry.num_packages ? ` · ${entry.num_packages} packages` : ""}
            </div>
          </div>
        </div>
        <button
          type="button"
          data-testid={`remove-entry-${index}`}
          onClick={onRemove}
          disabled={total === 1}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
          title={total === 1 ? "At least one company required" : "Remove this company"}
        >
          <Trash2 className="w-3.5 h-3.5" /> Remove
        </button>
      </div>

      {/* Basics */}
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-neutral-600">
              Company name <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              data-testid={`company-name-${index}`}
              value={entry.company_name}
              onChange={(e) => update({ company_name: e.target.value })}
              placeholder="e.g. ABC Traders"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">Number of packages (cartons)</label>
            <input
              data-testid={`company-packages-${index}`}
              type="number"
              min="1"
              value={entry.num_packages}
              onChange={(e) => update({ num_packages: e.target.value })}
              placeholder="e.g. 4"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </div>

        {/* Photo */}
        <div>
          <label className="text-xs font-medium text-neutral-600">Carton photo (optional)</label>
          <div className="mt-1 flex items-center gap-3">
            {entry.photo ? (
              <div className="relative">
                <img
                  src={entry.photo}
                  alt="carton"
                  className="w-20 h-20 object-cover rounded-xl border border-neutral-200"
                />
                <button
                  type="button"
                  onClick={() => update({ photo: null })}
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
              data-testid={`company-photo-${index}`}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              <Upload className="w-3.5 h-3.5" /> {entry.photo ? "Replace" : "Upload"}
            </button>
          </div>
        </div>

        {/* Products */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Products from this company
              </label>
              <p className="text-[11px] text-neutral-400">
                Each product gets a unique ID and timestamp on save.
              </p>
            </div>
            <button
              type="button"
              data-testid={`add-product-${index}`}
              onClick={addProductRow}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add product
            </button>
          </div>
          <div className="space-y-2">
            {entry.products.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  data-testid={`product-name-${index}-${idx}`}
                  value={p.name}
                  onChange={(e) => updateProduct(idx, "name", e.target.value)}
                  placeholder="Product name (e.g. Jhumars)"
                  className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <input
                  data-testid={`product-qty-${index}-${idx}`}
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
                  disabled={entry.products.length === 1}
                  className="p-2 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500 disabled:hover:border-neutral-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment mode */}
        <div>
          <div className="text-xs font-medium text-neutral-600 mb-2">Payment mode for this company</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PAYMENT_OPTIONS.map((m) => {
              const active = entry.payment_mode === m.key;
              const isNone = m.key === "none";
              return (
                <button
                  key={m.key}
                  type="button"
                  data-testid={`payment-${index}-${m.key}`}
                  onClick={() => update({ payment_mode: m.key })}
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
      </div>
    </div>
  );
}

export default function WarehouseDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState([emptyEntry()]);
  const [submittedBy, setSubmittedBy] = useState("");
  const [lastBatch, setLastBatch] = useState(null);

  const totals = entries.reduce(
    (acc, e) => {
      const units = e.products.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
      const products = e.products.filter((p) => p.name.trim() && Number(p.quantity) > 0).length;
      return {
        packages: acc.packages + (Number(e.num_packages) || 0),
        units: acc.units + units,
        products: acc.products + products,
      };
    },
    { packages: 0, units: 0, products: 0 }
  );

  const updateEntry = (idx, newEntry) =>
    setEntries((arr) => arr.map((e, i) => (i === idx ? newEntry : e)));

  const addEntry = () => setEntries((arr) => [...arr, emptyEntry()]);
  const removeEntry = (idx) =>
    setEntries((arr) => (arr.length === 1 ? arr : arr.filter((_, i) => i !== idx)));

  const resetAll = () => {
    setEntries([emptyEntry()]);
    setSubmittedBy("");
  };

  const validate = () => {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.num_packages || Number(e.num_packages) < 1)
        return `Company #${i + 1}: enter number of packages.`;
      const valid = e.products.filter((p) => p.name.trim() && Number(p.quantity) > 0);
      if (valid.length === 0) return `Company #${i + 1}: add at least one product with name and quantity.`;
    }
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);

    setSubmitting(true);
    try {
      const payload = {
        submitted_by: submittedBy.trim() || null,
        entries: entries.map((en) => {
          const isPaid = en.payment_mode !== "none";
          const cleanProducts = en.products
            .map((p) => ({ name: p.name.trim(), quantity: Number(p.quantity) }))
            .filter((p) => p.name && p.quantity > 0);
          return {
            company_name: en.company_name.trim() || null,
            num_packages: Number(en.num_packages),
            carton_photo: en.photo || null,
            products: cleanProducts,
            payment_made: isPaid,
            payment_mode: isPaid ? en.payment_mode : null,
          };
        }),
      };
      const res = await axios.post(`${API}/parcels/batch`, payload, { headers: authHeaders() });
      toast.success(`${res.data.count} stock invoice${res.data.count > 1 ? "s" : ""} created`);
      setLastBatch(res.data.created);
      resetAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit stock invoices");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto pb-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400">Warehouse Staff</div>
            <div
              className="text-2xl font-semibold tracking-tight text-neutral-900"
              data-testid="welcome-heading"
            >
              Add stock invoices
            </div>
            <div className="text-sm text-neutral-500">
              Hi {user?.full_name?.split(" ")[0] || "there"}, you can add multiple companies in one
              submission.
            </div>
          </div>
        </div>

        {/* Last batch detailed view */}
        {lastBatch && lastBatch.length > 0 && (
          <SubmittedDetailsPanel
            batch={lastBatch}
            setBatch={setLastBatch}
            api={API}
            authHeaders={authHeaders}
            onAddMore={() => setLastBatch(null)}
          />
        )}

        {!lastBatch && (
        <form onSubmit={submit} className="space-y-4">
          {/* Live totals chip */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-neutral-700">
              <Building2 className="w-3.5 h-3.5" /> {entries.length} compan{entries.length === 1 ? "y" : "ies"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-neutral-700">
              <Package className="w-3.5 h-3.5" /> {totals.packages} packages
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-neutral-700">
              <Boxes className="w-3.5 h-3.5" /> {totals.products} products · {totals.units} units
            </span>
          </div>

          {/* Entries */}
          {entries.map((e, idx) => (
            <CompanyEntryCard
              key={e.uid}
              entry={e}
              index={idx}
              total={entries.length}
              onChange={(ne) => updateEntry(idx, ne)}
              onRemove={() => removeEntry(idx)}
            />
          ))}

          {/* Add company */}
          <button
            type="button"
            data-testid="add-company"
            onClick={addEntry}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-neutral-300 bg-white text-sm text-neutral-700 hover:border-neutral-500 hover:bg-neutral-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add another company
          </button>

          {/* Submitted by */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <label className="text-xs font-medium text-neutral-600">
              Submitted by <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              data-testid="parcel-submitted-by"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
              placeholder="e.g. Biswajit"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Person who handed over / submitted all of these stocks. Applies to every company in
              this submission.
            </p>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 -mx-2 px-2 pb-2 pt-3 bg-gradient-to-t from-neutral-50 to-neutral-50/0">
            <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-3 shadow-sm">
              <div className="text-xs text-neutral-500">
                Submitting <span className="font-semibold text-neutral-800">{entries.length}</span>{" "}
                company{entries.length === 1 ? "" : " entries"} ·{" "}
                <span className="font-semibold text-neutral-800">{totals.units}</span> units total
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetAll}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                >
                  <RefreshCw className="w-4 h-4" /> Clear
                </button>
                <button
                  type="submit"
                  data-testid="submit-all-invoices"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>Submit all invoices</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
        )}
      </div>
    </DashboardShell>
  );
}

// ============================================================
// SubmittedDetailsPanel — shown after submit, with edit/delete
// ============================================================
function SubmittedDetailsPanel({ batch, setBatch, api, authHeaders, onAddMore }) {
  const [editing, setEditing] = useState(null); // { parcelId, productId, name, quantity }

  const totals = batch.reduce(
    (acc, p) => ({
      packages: acc.packages + (p.num_packages || 0),
      units: acc.units + (p.total_quantity || 0),
      products: acc.products + (p.products?.length || 0),
    }),
    { packages: 0, units: 0, products: 0 }
  );

  const refreshParcel = (updated) => {
    setBatch((arr) => arr.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const name = (editing.name || "").trim();
    const qty = Number(editing.quantity);
    if (!name) return toast.error("Product name is required.");
    if (!qty || qty < 1) return toast.error("Quantity must be at least 1.");
    try {
      const res = await axios.patch(
        `${api}/parcels/${editing.parcelId}/products/${editing.productId}`,
        { name, quantity: qty },
        { headers: authHeaders() }
      );
      refreshParcel(res.data);
      setEditing(null);
      toast.success("Product updated");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update product");
    }
  };

  const handleDeleteProduct = async (parcel, product) => {
    if (!window.confirm(`Delete product "${product.name}"?`)) return;
    try {
      const res = await axios.delete(
        `${api}/parcels/${parcel.id}/products/${product.id}`,
        { headers: authHeaders() }
      );
      refreshParcel(res.data);
      toast.success("Product removed");
    } catch (err) {
      const status = err?.response?.status;
      if (status === 410) {
        // parcel deleted because no products left
        setBatch((arr) => arr.filter((p) => p.id !== parcel.id));
        toast.success(`${parcel.parcel_number} removed (no products left)`);
      } else {
        toast.error(err?.response?.data?.detail || "Failed to delete product");
      }
    }
  };

  const handleDeleteParcel = async (parcel) => {
    if (!window.confirm(`Delete entire invoice ${parcel.parcel_number}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${api}/parcels/${parcel.id}`, { headers: authHeaders() });
      setBatch((arr) => arr.filter((p) => p.id !== parcel.id));
      toast.success(`${parcel.parcel_number} deleted`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete invoice");
    }
  };

  if (batch.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center">
        <div className="text-sm text-neutral-500 mb-3">All submitted invoices were removed.</div>
        <button
          onClick={onAddMore}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
        >
          <Plus className="w-4 h-4" /> Add new stock
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      {/* Summary banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <CircleCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-emerald-900">
            {batch.length} invoice{batch.length > 1 ? "s" : ""} saved
          </div>
          <div className="text-xs text-emerald-900/70 mt-0.5">
            {totals.products} products · {totals.units} units · {totals.packages} packages — review,
            edit or delete before moving on.
          </div>
        </div>
        <button
          onClick={onAddMore}
          data-testid="add-more-stock"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
        >
          <Plus className="w-4 h-4" /> Add new stock
        </button>
      </div>

      {/* Each parcel detail card */}
      {batch.map((parcel) => (
        <div
          key={parcel.id}
          data-testid={`submitted-${parcel.parcel_number}`}
          className="bg-white border border-neutral-200 rounded-2xl overflow-hidden"
        >
          {/* Parcel header */}
          <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {parcel.carton_photo ? (
                <img
                  src={parcel.carton_photo}
                  alt={parcel.parcel_number}
                  className="w-10 h-10 rounded-lg object-cover border border-neutral-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-neutral-900 truncate">
                    {parcel.company_name || (
                      <span className="text-neutral-400 italic font-normal">No company</span>
                    )}
                  </span>
                  <PaymentBadge paid={parcel.payment_made} mode={parcel.payment_mode} />
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{parcel.parcel_number}</span>
                  <span>·</span>
                  <span>{parcel.num_packages} packages</span>
                  <span>·</span>
                  <span>
                    {parcel.products.length} products · {parcel.total_quantity} units
                  </span>
                  {parcel.submitted_by && (
                    <>
                      <span>·</span>
                      <span>
                        By <span className="font-medium text-neutral-700">{parcel.submitted_by}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              data-testid={`delete-invoice-${parcel.parcel_number}`}
              onClick={() => handleDeleteParcel(parcel)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
              title="Delete this invoice"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete invoice
            </button>
          </div>

          {/* Products list */}
          <table className="w-full text-sm">
            <thead className="bg-white text-neutral-400">
              <tr className="text-[11px] uppercase tracking-wider">
                <th className="text-left px-5 py-2 font-medium w-12">#</th>
                <th className="text-left px-3 py-2 font-medium">Product</th>
                <th className="text-right px-3 py-2 font-medium w-24">Qty</th>
                <th className="text-right px-5 py-2 font-medium w-44">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {parcel.products.map((prod, i) => {
                const isEditing =
                  editing &&
                  editing.parcelId === parcel.id &&
                  editing.productId === prod.id;
                return (
                  <tr key={prod.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-2.5 text-neutral-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      {isEditing ? (
                        <input
                          data-testid={`edit-name-${prod.id}`}
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          className="w-full px-2 py-1 rounded-md border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          autoFocus
                        />
                      ) : (
                        <div>
                          <div className="text-neutral-900 font-medium">{prod.name}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {prod.id.slice(0, 8)}…
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {isEditing ? (
                        <input
                          data-testid={`edit-qty-${prod.id}`}
                          type="number"
                          min="1"
                          value={editing.quantity}
                          onChange={(e) =>
                            setEditing({ ...editing, quantity: e.target.value })
                          }
                          className="w-20 px-2 py-1 rounded-md border border-neutral-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                      ) : (
                        <span className="text-neutral-800 font-medium">{prod.quantity}</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {isEditing ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            data-testid={`save-edit-${prod.id}`}
                            onClick={handleSaveEdit}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-900 text-white text-xs hover:bg-neutral-800"
                          >
                            <CircleCheck className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-neutral-200 text-xs text-neutral-600 hover:bg-neutral-50"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            data-testid={`edit-product-${prod.id}`}
                            onClick={() =>
                              setEditing({
                                parcelId: parcel.id,
                                productId: prod.id,
                                name: prod.name,
                                quantity: String(prod.quantity),
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            data-testid={`delete-product-${prod.id}`}
                            onClick={() => handleDeleteProduct(parcel, prod)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onAddMore}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 hover:bg-neutral-50"
        >
          <Plus className="w-4 h-4" /> Add new stock
        </button>
      </div>
    </div>
  );
}

function PaymentBadge({ paid, mode }) {
  if (!paid) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <CircleAlert className="w-3 h-3" /> Unpaid
      </span>
    );
  }
  const Icon =
    mode === "upi" ? Smartphone : mode === "card" ? CreditCard : Wallet;
  const label = mode === "upi" ? "UPI" : mode === "card" ? "Card" : "Cash";
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CircleCheck className="w-3 h-3" /> Paid · <Icon className="w-3 h-3" /> {label}
    </span>
  );
}
