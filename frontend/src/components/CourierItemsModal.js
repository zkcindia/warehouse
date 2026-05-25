import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  X,
  Plus,
  Upload,
  Image as ImageIcon,
  Loader2,
  Package,
  AlertTriangle,
  Trash2,
  PackagePlus,
  CheckCircle2,
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

export default function CourierItemsModal({ courier, onClose, onUpdated }) {
  const { API, authHeaders } = useAuth();
  const fileRef = useRef(null);
  const [current, setCurrent] = useState(courier);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [photo, setPhoto] = useState(null);
  const [damaged, setDamaged] = useState(false);
  const [damagedCount, setDamagedCount] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    setCurrent(courier);
    setName("");
    setQuantity("");
    setPhoto(null);
    setDamaged(false);
    setDamagedCount("");
  }, [courier]);

  const items = current?.products || [];

  // Look for existing item that matches the current name input
  const existingMatch = useMemo(() => {
    const n = name.trim().toLowerCase();
    if (!n) return null;
    return items.find((p) => (p.name || "").trim().toLowerCase() === n) || null;
  }, [name, items]);

  if (!courier) return null;

  const close = () => {
    if (saving) return;
    onClose?.();
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

  const resetForm = () => {
    setName("");
    setQuantity("");
    setPhoto(null);
    setDamaged(false);
    setDamagedCount("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAdd = async () => {
    const cleanName = name.trim();
    const qty = Number(quantity);
    if (!cleanName) return toast.error("Item name is required.");
    if (!qty || qty < 1) return toast.error("Quantity must be at least 1.");
    const dmgCount = damaged ? Number(damagedCount || 0) : 0;
    if (damaged && dmgCount < 1) {
      return toast.error("Enter how many units are damaged.");
    }
    if (dmgCount > qty) {
      return toast.error("Damaged count cannot exceed quantity.");
    }

    setSaving(true);
    try {
      const payload = {
        name: cleanName,
        quantity: qty,
        photo: photo || null,
        damaged: !!damaged && dmgCount > 0,
        damaged_count: dmgCount,
      };
      const res = await axios.post(
        `${API}/couriers/${current.id}/items`,
        payload,
        { headers: authHeaders() }
      );
      const merged = existingMatch;
      toast.success(
        merged
          ? `${cleanName} updated — stock added to existing`
          : `${cleanName} added`
      );
      setCurrent(res.data);
      onUpdated?.(res.data);
      resetForm();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (itemId, itemName) => {
    if (!window.confirm(`Remove "${itemName}" from this courier?`)) return;
    setRemovingId(itemId);
    try {
      const res = await axios.delete(
        `${API}/couriers/${current.id}/items/${itemId}`,
        { headers: authHeaders() }
      );
      toast.success("Item removed");
      setCurrent(res.data);
      onUpdated?.(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to remove item");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={close}
      data-testid="courier-items-modal"
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[92vh] overflow-hidden flex flex-col fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <PackagePlus className="w-3.5 h-3.5" /> Add items
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <div className="text-base font-semibold text-neutral-900 font-mono">
                {current?.courier_number}
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Checklist complete
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
            data-testid="items-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Existing items */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wider text-neutral-400 font-medium">
                Items in this courier ({items.length})
              </div>
              <div className="text-[11px] text-neutral-500">
                Total units:{" "}
                <span className="font-semibold text-neutral-800">
                  {items.reduce((n, p) => n + (p.quantity || 0), 0)}
                </span>
              </div>
            </div>
            {items.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-neutral-200 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-2">
                  <Package className="w-5 h-5" />
                </div>
                <div className="text-sm text-neutral-600 font-medium">
                  No items added yet
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Use the form below to add items found in this courier.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {items.map((p) => (
                  <div
                    key={p.id}
                    data-testid={`item-row-${p.id}`}
                    className="flex items-center gap-3 p-3 border border-neutral-200 rounded-xl bg-white"
                  >
                    {p.photo ? (
                      <img
                        src={p.photo}
                        alt={p.name}
                        className="w-14 h-14 rounded-lg object-cover border border-neutral-100 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-neutral-50 border border-neutral-100 text-neutral-300 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-neutral-900 truncate">
                        {p.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-600">
                          <Package className="w-3 h-3" /> Qty {p.quantity}
                        </span>
                        {(p.damaged || p.damaged_count > 0) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3 h-3" /> {p.damaged_count} damaged
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(p.id, p.name)}
                      disabled={removingId === p.id}
                      title="Remove item"
                      data-testid={`item-remove-${p.id}`}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {removingId === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Add form */}
          <section>
            <div className="text-xs uppercase tracking-wider text-neutral-400 font-medium mb-2">
              Add new item
            </div>

            {/* Existing-match notice */}
            {existingMatch && (
              <div
                className="mb-3 p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 text-sm flex items-start gap-3"
                data-testid="existing-match-notice"
              >
                <CheckCircle2 className="w-5 h-5 mt-0.5 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium">
                    "{existingMatch.name}" already exists in this courier
                  </div>
                  <div className="text-[12px] text-blue-700/90 mt-0.5">
                    Present stock: <span className="font-semibold">{existingMatch.quantity}</span>
                    {existingMatch.damaged_count > 0 && (
                      <>
                        {" "}· <span className="text-red-700">{existingMatch.damaged_count} damaged</span>
                      </>
                    )}
                    . When you add, the quantity below will be merged into existing stock.
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Photo */}
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-neutral-600">
                  Photo <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <div className="mt-1 flex items-center gap-3">
                  {photo ? (
                    <div className="relative">
                      <img
                        src={photo}
                        alt="item"
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
                    data-testid="item-photo-upload"
                  >
                    <Upload className="w-3.5 h-3.5" /> {photo ? "Replace" : "Upload"}
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-neutral-600">Item name</label>
                <input
                  list="existing-item-names"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. iPhone 15 case"
                  data-testid="item-name-input"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <datalist id="existing-item-names">
                  {items.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-medium text-neutral-600">
                  Quantity {existingMatch ? "(to add to existing)" : ""}
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 10"
                  data-testid="item-qty-input"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              {/* Damaged toggle */}
              <div className="md:col-span-2">
                <div className="text-xs font-medium text-neutral-600 mb-1">
                  Any damage?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDamaged(false);
                      setDamagedCount("");
                    }}
                    data-testid="damaged-no"
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      !damaged
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    No damage
                  </button>
                  <button
                    type="button"
                    onClick={() => setDamaged(true)}
                    data-testid="damaged-yes"
                    className={`px-3 py-1.5 rounded-lg text-sm border inline-flex items-center gap-1.5 ${
                      damaged
                        ? "border-red-300 bg-red-50 text-red-800"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Damaged
                  </button>
                  {damaged && (
                    <div className="flex items-center gap-2 ml-1">
                      <input
                        type="number"
                        min="1"
                        value={damagedCount}
                        onChange={(e) => setDamagedCount(e.target.value)}
                        placeholder="Damaged count"
                        data-testid="damaged-count-input"
                        className="w-36 px-3 py-1.5 rounded-lg border border-red-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
                      />
                      <span className="text-[11px] text-neutral-500">units damaged</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-neutral-100 bg-white">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
            data-testid="items-done-btn"
          >
            Done
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !name.trim() || !quantity}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
            data-testid="item-add-btn"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {existingMatch ? "Add to existing" : "Add item"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
