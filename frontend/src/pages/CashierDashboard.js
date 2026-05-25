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
  Truck,
  CircleAlert,
  CircleCheck,
  X,
  RefreshCw,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

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

const emptyEntry = () => ({
  uid: Math.random().toString(36).slice(2),
  courier_company: "",
  num_packages: "",
  photo: null,
  payment_mode: "none",
});

function CourierEntryCard({ entry, index, total, onChange, onRemove }) {
  const fileRef = useRef(null);
  const update = (patch) => onChange({ ...entry, ...patch });

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (file.size > MAX_IMG_BYTES) return toast.error("Image must be under 4MB.");
    try {
      update({ photo: await fileToDataURL(file) });
    } catch {
      toast.error("Failed to read image.");
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100 fade-in">
      <div className="flex items-center justify-between px-5 py-3 bg-neutral-50/60 rounded-t-2xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-purple-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-900 truncate">
              {entry.courier_company?.trim() || `Courier #${index + 1}`}
            </div>
            <div className="text-[11px] text-neutral-500">
              {entry.num_packages ? `${entry.num_packages} packages` : "—"}
            </div>
          </div>
        </div>
        <button
          type="button"
          data-testid={`remove-courier-${index}`}
          onClick={onRemove}
          disabled={total === 1}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
        >
          <Trash2 className="w-3.5 h-3.5" /> Remove
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" /> Courier company <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              data-testid={`courier-company-${index}`}
              value={entry.courier_company}
              onChange={(e) => update({ courier_company: e.target.value })}
              placeholder="e.g. DTDC, BlueDart, Delhivery"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">Number of packages</label>
            <input
              data-testid={`courier-packages-${index}`}
              type="number"
              min="1"
              value={entry.num_packages}
              onChange={(e) => update({ num_packages: e.target.value })}
              placeholder="e.g. 3"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </div>

        {/* Slip Photo */}
        <div>
          <label className="text-xs font-medium text-neutral-600">Slip / receipt photo (optional)</label>
          <div className="mt-1 flex items-center gap-3">
            {entry.photo ? (
              <div className="relative">
                <img
                  src={entry.photo}
                  alt="slip"
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
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              <Upload className="w-3.5 h-3.5" /> {entry.photo ? "Replace" : "Upload"}
            </button>
          </div>
        </div>

        {/* Payment mode */}
        <div>
          <div className="text-xs font-medium text-neutral-600 mb-2">Payment mode</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PAYMENT_OPTIONS.map((m) => {
              const active = entry.payment_mode === m.key;
              const isNone = m.key === "none";
              return (
                <button
                  key={m.key}
                  type="button"
                  data-testid={`courier-payment-${index}-${m.key}`}
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

export default function CashierDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState([emptyEntry()]);
  const [handledBy, setHandledBy] = useState("");
  const [lastBatch, setLastBatch] = useState(null);

  const totals = entries.reduce(
    (acc, e) => ({
      packages: acc.packages + (Number(e.num_packages) || 0),
    }),
    { packages: 0 }
  );

  const updateEntry = (idx, ne) =>
    setEntries((arr) => arr.map((e, i) => (i === idx ? ne : e)));
  const addEntry = () => setEntries((arr) => [...arr, emptyEntry()]);
  const removeEntry = (idx) =>
    setEntries((arr) => (arr.length === 1 ? arr : arr.filter((_, i) => i !== idx)));
  const resetAll = () => {
    setEntries([emptyEntry()]);
    setHandledBy("");
  };

  const validate = () => {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.num_packages || Number(e.num_packages) < 1)
        return `Courier #${i + 1}: enter number of packages.`;
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
        handled_by: handledBy.trim() || null,
        entries: entries.map((en) => {
          const isPaid = en.payment_mode !== "none";
          return {
            courier_company: en.courier_company.trim() || null,
            num_packages: Number(en.num_packages),
            slip_photo: en.photo || null,
            products: [],
            payment_made: isPaid,
            payment_mode: isPaid ? en.payment_mode : null,
          };
        }),
      };
      const res = await axios.post(`${API}/couriers/batch`, payload, { headers: authHeaders() });
      toast.success(`${res.data.count} courier entry${res.data.count > 1 ? "s" : ""} created`);
      setLastBatch(res.data.created);
      resetAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit couriers");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto pb-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400">Cashier</div>
            <div className="text-2xl font-semibold tracking-tight text-neutral-900" data-testid="welcome-heading">
              Courier entries
            </div>
            <div className="text-sm text-neutral-500">
              Hi {user?.full_name?.split(" ")[0] || "there"}, log outgoing courier shipments and charges.
            </div>
          </div>
        </div>

        {/* Confirmation */}
        {lastBatch && lastBatch.length > 0 && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CircleCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-emerald-900">
                  {lastBatch.length} courier{lastBatch.length > 1 ? "s" : ""} saved
                </div>
                <ul className="mt-1.5 space-y-0.5 text-xs text-emerald-900/80">
                  {lastBatch.map((c) => (
                    <li key={c.id} className="truncate">
                      <span className="font-mono">{c.courier_number}</span> ·{" "}
                      {c.num_packages} pkgs
                      {c.courier_company ? ` · ${c.courier_company}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setLastBatch(null)}
                className="p-1.5 rounded-md text-emerald-700 hover:bg-emerald-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {/* Totals chip */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-neutral-700">
              <Truck className="w-3.5 h-3.5" /> {entries.length} courier{entries.length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-neutral-700">
              <Package className="w-3.5 h-3.5" /> {totals.packages} packages
            </span>
          </div>

          {entries.map((e, idx) => (
            <CourierEntryCard
              key={e.uid}
              entry={e}
              index={idx}
              total={entries.length}
              onChange={(ne) => updateEntry(idx, ne)}
              onRemove={() => removeEntry(idx)}
            />
          ))}

          <button
            type="button"
            data-testid="add-courier"
            onClick={addEntry}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-neutral-300 bg-white text-sm text-neutral-700 hover:border-neutral-500 hover:bg-neutral-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add another courier
          </button>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <label className="text-xs font-medium text-neutral-600">
              Handled by <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              data-testid="courier-handled-by"
              value={handledBy}
              onChange={(e) => setHandledBy(e.target.value)}
              placeholder="e.g. Biswajit"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Cashier who handled this courier batch.
            </p>
          </div>

          <div className="sticky bottom-0 -mx-2 px-2 pb-2 pt-3 bg-gradient-to-t from-neutral-50 to-neutral-50/0">
            <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-3 shadow-sm">
              <div className="text-xs text-neutral-500">
                Submitting <span className="font-semibold text-neutral-800">{entries.length}</span> courier{entries.length === 1 ? "" : "s"} ·{" "}
                <span className="font-semibold text-neutral-800">{totals.packages}</span> packages
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
                  data-testid="submit-couriers"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>Submit all couriers</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
