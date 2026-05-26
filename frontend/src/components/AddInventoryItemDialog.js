import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  X,
  Plus,
  Upload,
  Loader2,
  AlertTriangle,
  PackagePlus,
  Truck,
  CheckCircle2,
  Lock,
  Trash2,
  Tag,
  Hash,
  IndianRupee,
} from "lucide-react";

const MAX_IMG_BYTES = 4 * 1024 * 1024;
const CHECKLIST_KEYS = [
  "master_carton",
  "label_check",
  "bills_check",
  "quantity_verify",
  "damage_check",
  "photo_taken",
];

function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

const blankRow = () => ({
  uid: Math.random().toString(36).slice(2, 9),
  photo: null,
  name: "",
  category: "",
  brand: "",
  code: "",
  description: "",
  price: "",
  quantity: "",
  damaged: false,
  damagedCount: "",
});

export default function AddInventoryItemDialog({ open, couriers, lockToCourierId, onClose, onAdded }) {
  const { API, authHeaders } = useAuth();

  const eligible = useMemo(
    () =>
      (couriers || []).filter((c) => {
        const chk = c.checklist || {};
        return CHECKLIST_KEYS.every((k) => !!chk[k]);
      }),
    [couriers]
  );

  const [courierId, setCourierId] = useState("");
  const [rows, setRows] = useState([blankRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCourierId(lockToCourierId || eligible[0]?.id || "");
    setRows([blankRow()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedCourier = eligible.find((c) => c.id === courierId) || null;

  // For per-row "exists in selected courier" notice
  const existingByName = useMemo(() => {
    const map = {};
    (selectedCourier?.products || []).forEach((p) => {
      const k = (p.name || "").trim().toLowerCase();
      if (k) map[k] = p;
    });
    return map;
  }, [selectedCourier]);

  if (!open) return null;

  const close = () => {
    if (saving) return;
    onClose?.();
  };

  const addRow = () => setRows((arr) => [...arr, blankRow()]);
  const removeRow = (uid) =>
    setRows((arr) => (arr.length === 1 ? arr : arr.filter((r) => r.uid !== uid)));
  const updateRow = (uid, patch) =>
    setRows((arr) => arr.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));

  const handlePhotoForRow = async (uid, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (file.size > MAX_IMG_BYTES) return toast.error("Image must be under 4MB.");
    try {
      const dataURL = await fileToDataURL(file);
      updateRow(uid, { photo: dataURL });
    } catch {
      toast.error("Failed to read image.");
    }
  };

  const validRows = rows.filter((r) => r.name.trim() && Number(r.quantity) > 0);

  const handleSubmit = async () => {
    if (!courierId) return toast.error("Please select a courier.");
    if (validRows.length === 0)
      return toast.error("Add at least one item with name and quantity.");

    // Per-row guard for damaged
    for (const r of validRows) {
      const qty = Number(r.quantity);
      const dmg = r.damaged ? Number(r.damagedCount || 0) : 0;
      if (r.damaged && dmg < 1) {
        return toast.error(`${r.name}: enter damaged count or turn off damage.`);
      }
      if (dmg > qty) {
        return toast.error(`${r.name}: damaged (${dmg}) cannot exceed quantity (${qty}).`);
      }
      if (r.price !== "" && Number(r.price) < 0) {
        return toast.error(`${r.name}: price cannot be negative.`);
      }
    }

    const payload = {
      items: validRows.map((r) => {
        const qty = Number(r.quantity);
        const dmg = r.damaged ? Number(r.damagedCount || 0) : 0;
        return {
          name: r.name.trim(),
          quantity: qty,
          photo: r.photo || null,
          damaged: r.damaged && dmg > 0,
          damaged_count: dmg,
          category: r.category.trim() || null,
          brand: r.brand.trim() || null,
          code: r.code.trim() || null,
          description: r.description.trim() || null,
          price: r.price === "" ? null : Number(r.price),
        };
      }),
    };

    setSaving(true);
    try {
      const res = await axios.post(
        `${API}/couriers/${courierId}/items/batch`,
        payload,
        { headers: authHeaders() }
      );
      const merged = validRows.filter(
        (r) => !!existingByName[r.name.trim().toLowerCase()]
      ).length;
      const added = validRows.length - merged;
      toast.success(
        `${selectedCourier?.courier_number}: ${added} added, ${merged} merged into existing`
      );
      onAdded?.(res.data);
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to add items");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={close}
      data-testid="add-inventory-dialog"
    >
      <div
        className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <PackagePlus className="w-3.5 h-3.5" /> Add inventory items
            </div>
            <div className="text-base font-semibold text-neutral-900 mt-0.5">
              New items
              <span className="ml-2 text-xs font-normal text-neutral-500">
                ({validRows.length}/{rows.length} ready)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
            data-testid="add-inv-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Courier selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Courier
              </label>
              {eligible.length === 0 ? (
                <div className="mt-1 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium">No eligible couriers yet</div>
                    <div className="text-[12px] text-amber-800/90 mt-0.5">
                      Complete the warehouse checklist on at least one courier
                      before adding items.
                    </div>
                  </div>
                </div>
              ) : (
                <select
                  value={courierId}
                  onChange={(e) => setCourierId(e.target.value)}
                  disabled={!!lockToCourierId}
                  data-testid="inv-courier-select"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-600"
                >
                  {eligible.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courier_number} ·{" "}
                      {c.courier_company || "No company"} · {c.products?.length || 0} items
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium w-14">#</th>
                    <th className="text-left px-3 py-2 font-medium w-20">Photo</th>
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium">Category</th>
                    <th className="text-left px-3 py-2 font-medium">Brand</th>
                    <th className="text-left px-3 py-2 font-medium">Code</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Price</th>
                    <th className="text-right px-3 py-2 font-medium w-20">Qty</th>
                    <th className="text-left px-3 py-2 font-medium w-44">Damaged</th>
                    <th className="text-left px-3 py-2 font-medium">Description</th>
                    <th className="text-right px-3 py-2 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((r, idx) => {
                    const exists = existingByName[r.name.trim().toLowerCase()];
                    return (
                      <tr
                        key={r.uid}
                        data-testid={`item-row-${idx}`}
                        className={`align-top ${exists ? "bg-blue-50/40" : ""}`}
                      >
                        <td className="px-3 py-2.5 text-neutral-500 font-mono text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5">
                          <RowPhoto
                            photo={r.photo}
                            onPick={(file) => handlePhotoForRow(r.uid, file)}
                            onClear={() => updateRow(r.uid, { photo: null })}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            value={r.name}
                            onChange={(e) => updateRow(r.uid, { name: e.target.value })}
                            placeholder="iPhone 15"
                            data-testid={`row-name-${idx}`}
                            className="w-full px-2 py-1.5 rounded-md border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                          {exists && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-blue-700 bg-blue-100/70 border border-blue-200 rounded-full px-1.5 py-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              merges with {exists.quantity} in stock
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            value={r.category}
                            onChange={(e) => updateRow(r.uid, { category: e.target.value })}
                            placeholder="Electronics"
                            className="w-full px-2 py-1.5 rounded-md border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            value={r.brand}
                            onChange={(e) => updateRow(r.uid, { brand: e.target.value })}
                            placeholder="Apple"
                            className="w-full px-2 py-1.5 rounded-md border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="relative">
                            <Hash className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-300" />
                            <input
                              value={r.code}
                              onChange={(e) => updateRow(r.uid, { code: e.target.value })}
                              placeholder="SKU-001"
                              className="w-full pl-6 pr-2 py-1.5 rounded-md border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="relative">
                            <IndianRupee className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-300" />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={r.price}
                              onChange={(e) => updateRow(r.uid, { price: e.target.value })}
                              placeholder="0.00"
                              className="w-full pl-6 pr-2 py-1.5 rounded-md border border-neutral-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="1"
                            value={r.quantity}
                            onChange={(e) => updateRow(r.uid, { quantity: e.target.value })}
                            placeholder="10"
                            data-testid={`row-qty-${idx}`}
                            className="w-full px-2 py-1.5 rounded-md border border-neutral-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateRow(r.uid, {
                                  damaged: !r.damaged,
                                  damagedCount: !r.damaged ? r.damagedCount : "",
                                })
                              }
                              className={`px-2 py-1 rounded-md text-[11px] border inline-flex items-center gap-1 ${
                                r.damaged
                                  ? "border-red-300 bg-red-50 text-red-800"
                                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                              }`}
                              data-testid={`row-damaged-toggle-${idx}`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {r.damaged ? "Yes" : "No"}
                            </button>
                            {r.damaged && (
                              <input
                                type="number"
                                min="1"
                                value={r.damagedCount}
                                onChange={(e) =>
                                  updateRow(r.uid, { damagedCount: e.target.value })
                                }
                                placeholder="0"
                                data-testid={`row-damaged-count-${idx}`}
                                className="w-16 px-2 py-1 rounded-md border border-red-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-red-500/40"
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            value={r.description}
                            onChange={(e) =>
                              updateRow(r.uid, { description: e.target.value })
                            }
                            placeholder="Notes…"
                            className="w-full px-2 py-1.5 rounded-md border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeRow(r.uid)}
                            disabled={rows.length === 1}
                            title="Remove row"
                            data-testid={`row-remove-${idx}`}
                            className="p-1.5 rounded-md text-neutral-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-between">
              <button
                type="button"
                onClick={addRow}
                data-testid="add-row-btn"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:bg-white border border-neutral-200"
              >
                <Plus className="w-3.5 h-3.5" /> Add another row
              </button>
              <div className="text-[11px] text-neutral-500 inline-flex items-center gap-1.5">
                <Tag className="w-3 h-3" />
                Same name auto-merges with existing stock in selected courier.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-neutral-100 bg-white">
          <div className="text-xs text-neutral-500">
            {validRows.length > 0
              ? `Ready to save ${validRows.length} item${validRows.length === 1 ? "" : "s"}`
              : "Fill name and quantity for at least one row"}
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
              type="button"
              onClick={handleSubmit}
              disabled={
                saving ||
                !courierId ||
                validRows.length === 0 ||
                eligible.length === 0
              }
              data-testid="inv-add-submit-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Save {validRows.length || ""} item{validRows.length === 1 ? "" : "s"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowPhoto({ photo, onPick, onClear }) {
  const ref = useRef(null);
  return (
    <div className="flex items-center gap-2">
      {photo ? (
        <div className="relative">
          <img
            src={photo}
            alt="thumb"
            className="w-10 h-10 rounded-md object-cover border border-neutral-200"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white border border-neutral-200 text-neutral-600 shadow flex items-center justify-center hover:text-red-600"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-10 h-10 rounded-md bg-neutral-50 border border-dashed border-neutral-300 text-neutral-400 hover:bg-neutral-100 flex items-center justify-center"
          title="Upload photo"
        >
          <Upload className="w-4 h-4" />
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        onChange={(e) => onPick(e.target.files?.[0])}
        className="hidden"
      />
    </div>
  );
}
