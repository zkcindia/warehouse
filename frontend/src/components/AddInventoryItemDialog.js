import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  X,
  Plus,
  Upload,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  PackagePlus,
  Truck,
  CheckCircle2,
  Lock,
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

export default function AddInventoryItemDialog({ open, couriers, onClose, onAdded }) {
  const { API, authHeaders } = useAuth();
  const fileRef = useRef(null);

  const eligible = (couriers || []).filter((c) => {
    const chk = c.checklist || {};
    const keys = [
      "master_carton",
      "label_check",
      "bills_check",
      "quantity_verify",
      "damage_check",
      "photo_taken",
    ];
    return keys.every((k) => !!chk[k]);
  });

  const [courierId, setCourierId] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [photo, setPhoto] = useState(null);
  const [damaged, setDamaged] = useState(false);
  const [damagedCount, setDamagedCount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCourierId(eligible[0]?.id || "");
    setName("");
    setQuantity("");
    setPhoto(null);
    setDamaged(false);
    setDamagedCount("");
    if (fileRef.current) fileRef.current.value = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedCourier = eligible.find((c) => c.id === courierId) || null;

  const existingMatch = (() => {
    if (!selectedCourier) return null;
    const n = name.trim().toLowerCase();
    if (!n) return null;
    return (
      (selectedCourier.products || []).find(
        (p) => (p.name || "").trim().toLowerCase() === n
      ) || null
    );
  })();

  if (!open) return null;

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

  const handleSubmit = async () => {
    if (!courierId) return toast.error("Please select a courier.");
    const cleanName = name.trim();
    const qty = Number(quantity);
    if (!cleanName) return toast.error("Item name is required.");
    if (!qty || qty < 1) return toast.error("Quantity must be at least 1.");
    const dmgCount = damaged ? Number(damagedCount || 0) : 0;
    if (damaged && dmgCount < 1) return toast.error("Enter how many units are damaged.");
    if (dmgCount > qty) return toast.error("Damaged count cannot exceed quantity.");

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
        `${API}/couriers/${courierId}/items`,
        payload,
        { headers: authHeaders() }
      );
      toast.success(
        existingMatch
          ? `${cleanName} merged into existing stock`
          : `${cleanName} added to ${selectedCourier?.courier_number}`
      );
      onAdded?.(res.data);
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to add item");
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
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[92vh] overflow-hidden flex flex-col fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <PackagePlus className="w-3.5 h-3.5" /> Add inventory item
            </div>
            <div className="text-base font-semibold text-neutral-900 mt-0.5">
              New item
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
          <div>
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
                data-testid="inv-courier-select"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
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

          {existingMatch && (
            <div
              className="p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 text-sm flex items-start gap-3"
              data-testid="inv-existing-match-notice"
            >
              <CheckCircle2 className="w-5 h-5 mt-0.5 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium">
                  "{existingMatch.name}" already in {selectedCourier?.courier_number}
                </div>
                <div className="text-[12px] text-blue-700/90 mt-0.5">
                  Present stock:{" "}
                  <span className="font-semibold">{existingMatch.quantity}</span>
                  {existingMatch.damaged_count > 0 && (
                    <>
                      {" "}·{" "}
                      <span className="text-red-700">
                        {existingMatch.damaged_count} damaged
                      </span>
                    </>
                  )}
                  . Quantity below will be merged into existing stock.
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
                  data-testid="inv-photo-upload"
                >
                  <Upload className="w-3.5 h-3.5" /> {photo ? "Replace" : "Upload"}
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-medium text-neutral-600">
                Item name
              </label>
              <input
                list="inv-existing-item-names"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. iPhone 15 case"
                data-testid="inv-item-name-input"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <datalist id="inv-existing-item-names">
                {(selectedCourier?.products || []).map((p) => (
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
                data-testid="inv-item-qty-input"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            {/* Damage */}
            <div className="md:col-span-2">
              <div className="text-xs font-medium text-neutral-600 mb-1">
                Any damage?
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setDamaged(false);
                    setDamagedCount("");
                  }}
                  data-testid="inv-damaged-no"
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
                  data-testid="inv-damaged-yes"
                  className={`px-3 py-1.5 rounded-lg text-sm border inline-flex items-center gap-1.5 ${
                    damaged
                      ? "border-red-300 bg-red-50 text-red-800"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Damaged
                </button>
                {damaged && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={damagedCount}
                      onChange={(e) => setDamagedCount(e.target.value)}
                      placeholder="Damaged count"
                      data-testid="inv-damaged-count-input"
                      className="w-36 px-3 py-1.5 rounded-lg border border-red-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    />
                    <span className="text-[11px] text-neutral-500">units</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-neutral-100 bg-white">
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
              !name.trim() ||
              !quantity ||
              eligible.length === 0
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
            data-testid="inv-add-submit-btn"
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
