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
  Paperclip,
  Download,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Save,
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
  const packagePhotoRef = useRef(null);
  const [editing, setEditing] = useState(initialEdit);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editable state
  const [company, setCompany] = useState("");
  const [packages, setPackages] = useState("");
  const [handledBy, setHandledBy] = useState("");
  const [slipPhoto, setSlipPhoto] = useState(null);
  const [packagePhoto, setPackagePhoto] = useState(null);
  const [paymentMode, setPaymentMode] = useState("none");
  const [transportVehicle, setTransportVehicle] = useState("");
  const [transportCharge, setTransportCharge] = useState("");
  const [deliveryCharges, setDeliveryCharges] = useState("");
  const [deliveryVehicle, setDeliveryVehicle] = useState("");
  const [deliveryPaymentMode, setDeliveryPaymentMode] = useState("none");
  const [products, setProducts] = useState([]);
  const [orig, setOrig] = useState(null);

  useEffect(() => {
    if (!courier) return;
    setCompany(courier.courier_company || "");
    setPackages(String(courier.num_packages || ""));
    setHandledBy(courier.handled_by || "");
    setSlipPhoto(courier.slip_photo || null);
    setPackagePhoto(courier.package_photo || null);
    setPaymentMode(courier.payment_made && courier.payment_mode ? courier.payment_mode : "none");
    setTransportVehicle(courier.transport_vehicle || "");
    setTransportCharge(courier.transport_charge ? String(courier.transport_charge) : "");
    setDeliveryCharges(courier.charges ? String(courier.charges) : "");
    setDeliveryVehicle(courier.vehicle || "");
    setDeliveryPaymentMode(courier.transport_payment_mode || "none");
    setProducts((courier.products || []).map((p) => ({ name: p.name, quantity: String(p.quantity) })));
    setOrig(courier);
  }, [courier]);

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
    setSlipPhoto(orig.slip_photo || null);
    setPackagePhoto(orig.package_photo || null);
    setPaymentMode(orig.payment_made && orig.payment_mode ? orig.payment_mode : "none");
    setTransportVehicle(orig.transport_vehicle || "");
    setTransportCharge(orig.transport_charge ? String(orig.transport_charge) : "");
    setDeliveryCharges(orig.charges ? String(orig.charges) : "");
    setDeliveryVehicle(orig.vehicle || "");
    setDeliveryPaymentMode(orig.transport_payment_mode || "none");
    setProducts((orig.products || []).map((p) => ({ name: p.name, quantity: String(p.quantity) })));
    setEditing(false);
  };

  const handleSlipPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (file.size > MAX_IMG_BYTES) return toast.error("Image must be under 4MB.");
    try {
      setSlipPhoto(await fileToDataURL(file));
    } catch {
      toast.error("Failed to read image.");
    }
  };

  const handlePackagePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (file.size > MAX_IMG_BYTES) return toast.error("Image must be under 4MB.");
    try {
      setPackagePhoto(await fileToDataURL(file));
    } catch {
      toast.error("Failed to read image.");
    }
  };

  const handleDeleteCourier = async () => {
    setConfirmDelete(false);
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
      const isTransportPaid = deliveryPaymentMode !== "none";
      
      let slipPhotoField, packagePhotoField;
      if (slipPhoto === orig?.slip_photo) slipPhotoField = undefined;
      else if (!slipPhoto) slipPhotoField = "";
      else slipPhotoField = slipPhoto;
      
      if (packagePhoto === orig?.package_photo) packagePhotoField = undefined;
      else if (!packagePhoto) packagePhotoField = "";
      else packagePhotoField = packagePhoto;
      
      const payload = {
        courier_company: company.trim() || null,
        num_packages: Number(packages),
        handled_by: handledBy.trim() || null,
        payment_made: isPaid,
        payment_mode: isPaid ? paymentMode : null,
        transport_vehicle: transportVehicle.trim() || null,
        transport_charge: transportCharge ? parseFloat(transportCharge) : null,
        charges: deliveryCharges ? parseFloat(deliveryCharges) : null,
        vehicle: deliveryVehicle || null,
        transport_payment_mode: isTransportPaid ? deliveryPaymentMode : null,
      };
      
      if (slipPhotoField !== undefined) payload.slip_photo = slipPhotoField;
      if (packagePhotoField !== undefined) payload.package_photo = packagePhotoField;
      
      const res = await axios.patch(`${API}/couriers/${courier.id}`, payload, {
        headers: authHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      toast.success(`${courier.courier_number} updated successfully`);
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
        className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-100 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-2xl">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-purple-200">Courier entry</div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <div className="text-base font-semibold text-white">
                {courier.courier_number}
              </div>
              <PaymentBadge />
            </div>
          </div>
          <button
            onClick={close}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {!editing ? (
            <>
              {/* VIEW MODE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slipPhoto && (
                  <div>
                    <div className="text-xs font-medium text-neutral-600 mb-1">Slip Photo</div>
                    <img
                      src={slipPhoto}
                      alt={courier.courier_number}
                      className="w-full max-h-48 object-cover rounded-xl border border-neutral-200"
                    />
                  </div>
                )}
                {packagePhoto && (
                  <div>
                    <div className="text-xs font-medium text-neutral-600 mb-1">Package Photo</div>
                    <img
                      src={packagePhoto}
                      alt={`${courier.courier_number} package`}
                      className="w-full max-h-48 object-cover rounded-xl border border-neutral-200"
                    />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoTile icon={Truck} label="Courier company" value={courier.courier_company || "—"} />
                <InfoTile icon={Package} label="Packages" value={courier.num_packages} />
                <InfoTile icon={Boxes} label="Total units" value={courier.total_quantity} />
                <InfoTile icon={UserRound} label="Handled by" value={courier.handled_by || "—"} />
                <InfoTile icon={Truck} label="Transporter" value={courier.transport_vehicle || "—"} />
                <InfoTile icon={CircleCheck} label="Transport Amount" value={courier.transport_charge ? `₹${courier.transport_charge}` : "—"} />
                <InfoTile icon={CircleCheck} label="Delivery Charges" value={courier.charges ? `₹${courier.charges}` : "—"} />
                <InfoTile icon={Truck} label="Delivery Type" value={courier.vehicle || "—"} />
                <InfoTile icon={CircleCheck} label="Payment Mode" value={courier.payment_mode ? (courier.payment_mode === "upi" ? "UPI" : courier.payment_mode === "card" ? "Card" : "Cash") : "—"} />
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {courier.products.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-50">
                          <td className="px-3 py-2 text-neutral-800">{p.name}</td>
                          <td className="px-3 py-2 text-right text-neutral-900 font-semibold">
                            {p.quantity}
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
              {/* Row 1: Package Photo | No. of Packages | Upload Image */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-neutral-400" />
                    Package Photo
                  </label>
                  <div
                    onClick={() => packagePhotoRef.current?.click()}
                    className="mt-1 h-[48px] px-3 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center gap-2 cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all duration-200"
                  >
                    {packagePhoto ? (
                      <>
                        <img
                          src={packagePhoto}
                          alt="package"
                          className="w-8 h-8 rounded-lg object-cover shadow-sm"
                        />
                        <span className="text-xs text-neutral-500">Photo Added</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4 text-neutral-400" />
                        <span className="text-xs text-neutral-400">Tap to Upload</span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-neutral-400" />
                    No. of Packages *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={packages}
                    onChange={(e) => setPackages(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-600">Upload Image</label>
                  <div
                    onClick={() => packagePhotoRef.current?.click()}
                    className="mt-1 group h-[48px] rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 flex items-center justify-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all duration-200"
                  >
                    <Plus className="w-5 h-5 text-neutral-400 group-hover:text-orange-600" />
                  </div>
                </div>

                <input
                  ref={packagePhotoRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePackagePhoto}
                  className="hidden"
                />
              </div>

              {/* Row 2: Transporter | Slip Photo | Transport Amount | Payment Mode */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-neutral-600">Transporter</label>
                  <input
                    value={transportVehicle}
                    onChange={(e) => setTransportVehicle(e.target.value)}
                    placeholder="Transporter"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                    Slip Photo
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="mt-1 group h-[48px] px-3 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 flex items-center gap-2 cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-all duration-200"
                  >
                    {slipPhoto ? (
                      <img
                        src={slipPhoto}
                        alt="slip"
                        className="w-8 h-8 rounded-lg object-cover shadow-sm"
                      />
                    ) : (
                      <Upload className="w-4 h-4 text-neutral-400 group-hover:text-purple-600" />
                    )}
                    <span className="text-xs text-neutral-400 group-hover:text-purple-600">
                      {slipPhoto ? "Photo Added" : "Upload"}
                    </span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSlipPhoto}
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-600">Transport Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transportCharge}
                    onChange={(e) => setTransportCharge(e.target.value)}
                    placeholder="₹ 0"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-600">Payment Mode</label>
                  <select
                    value={deliveryPaymentMode}
                    onChange={(e) => setDeliveryPaymentMode(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all duration-200 cursor-pointer"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="none">Unpaid</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Delivery Charges | Delivery Type | Payment Mode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-neutral-600">Delivery Charges</label>
                  <input
                    type="number"
                    step="0.01"
                    value={deliveryCharges}
                    onChange={(e) => setDeliveryCharges(e.target.value)}
                    placeholder="₹ 0"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-600">Delivery Type</label>
                  <select
                    value={deliveryVehicle}
                    onChange={(e) => setDeliveryVehicle(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 cursor-pointer"
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
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 cursor-pointer"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="none">Unpaid</option>
                  </select>
                </div>
              </div>

              {/* Handled By */}
              <div>
                <label className="text-xs font-medium text-neutral-600">Handled By</label>
                <input
                  value={handledBy}
                  onChange={(e) => setHandledBy(e.target.value)}
                  placeholder="Handled By"
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200"
                />
              </div>

              {/* Products Section */}
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">
                  Products ({products.length})
                </div>
                <div className="border border-neutral-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-500">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Name</th>
                        <th className="text-right px-3 py-2 font-medium w-24">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {products.map((p, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50">
                          <td className="px-3 py-2 text-neutral-800">{p.name || "—"}</td>
                          <td className="px-3 py-2 text-right text-neutral-900 font-semibold">
                            {p.quantity || "0"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-100 bg-white">
          {!editing ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deletingId}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-red-600 hover:bg-red-50 hover:border-red-200 disabled:opacity-60"
              >
                {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
              <div className="flex items-center gap-2">
                <button onClick={close} className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50">
                  Close
                </button>
                {!readOnly && (
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium hover:from-purple-700 hover:to-indigo-700"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4"
          onClick={() => !deletingId && setConfirmDelete(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-neutral-900">Delete courier?</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {courier.courier_number} will be permanently removed.
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-neutral-100 bg-neutral-50/40 rounded-b-2xl">
              <button onClick={() => setConfirmDelete(false)} disabled={deletingId} className="px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-700 hover:bg-white">
                Cancel
              </button>
              <button onClick={handleDeleteCourier} disabled={deletingId} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {deletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
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