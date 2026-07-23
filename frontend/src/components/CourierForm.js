import React, { useRef, useState, useEffect } from "react";
import {
  Package,
  ImageIcon,
  Upload,
  Plus,
  Save,
  Loader2,
  CreditCard,
  Smartphone,
  Wallet,
  CircleAlert,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

const PAYMENT_OPTIONS = [
  { key: "upi", label: "UPI", Icon: Smartphone },
  { key: "card", label: "Card", Icon: CreditCard },
  { key: "cash", label: "Cash", Icon: Wallet },
  { key: "none", label: "Unpaid", Icon: CircleAlert },
];

const PAYMENT_LABEL = {
  upi: "UPI",
  card: "Card",
  cash: "Cash",
  none: "Unpaid",
};

function CourierForm({
  initialData = null,
  onSubmit,
  onCancel,
  submitLabel = "Save Changes",
  isSubmitting = false,
  readOnlyProducts = true,
}) {
  const { API, authHeaders } = useAuth();
  const fileRef = useRef(null);
  const packagePhotoRef = useRef(null);

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
    products: [],
  });

  const [originalPhoto, setOriginalPhoto] = useState(null);
  const [originalPackagePhoto, setOriginalPackagePhoto] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        courier_company: initialData.courier_company || "",
        num_packages: initialData.num_packages || "",
        photo: initialData.slip_photo || null,
        package_photo: initialData.package_photo || null,
        courier_charge: initialData.charges?.toString() || "",
        vehicle: initialData.vehicle || "",
        payment_mode: initialData.payment_made
          ? initialData.payment_mode || "none"
          : "none",
        handled_by: initialData.handled_by || "",
        transport_charge: initialData.transport_charge?.toString() || "",
        transport_vehicle: initialData.transport_vehicle || "",
        transport_payment_mode: initialData.transport_payment_mode || "none",
        attachments: initialData.attachments || [],
        products: initialData.products || [],
      });
      setOriginalPhoto(initialData.slip_photo || null);
      setOriginalPackagePhoto(initialData.package_photo || null);
    }
  }, [initialData]);

  const update = (patch) => setFormData((prev) => ({ ...prev, ...patch }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return toast.error("Choose an image file.");
    if (file.size > 4 * 1024 * 1024)
      return toast.error("Image must be under 4MB.");
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
    if (!file.type.startsWith("image/"))
      return toast.error("Choose image file");
    if (file.size > 4 * 1024 * 1024)
      return toast.error("Image must be under 4MB");
    try {
      const reader = new FileReader();
      reader.onloadend = () => update({ package_photo: reader.result });
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to read image");
    }
  };

  const handleFormSubmit = async () => {
    if (!formData.num_packages || parseInt(formData.num_packages) < 1) {
      toast.error("Number of packages is required");
      return;
    }

    const isPaid = formData.payment_mode !== "none";
    const isTransportPaid = formData.transport_payment_mode !== "none";

    const payload = {
      courier_company: formData.courier_company.trim() || null,
      num_packages: parseInt(formData.num_packages),
      handled_by: formData.handled_by.trim() || null,
      payment_made: isPaid,
      payment_mode: isPaid ? formData.payment_mode : null,
      charges: formData.courier_charge
        ? parseFloat(formData.courier_charge)
        : null,
      vehicle: formData.vehicle || null,
      transport_charge: formData.transport_charge
        ? parseFloat(formData.transport_charge)
        : null,
      transport_vehicle: formData.transport_vehicle || null,
      transport_payment_mode: isTransportPaid
        ? formData.transport_payment_mode
        : null,
    };

    if (formData.photo !== originalPhoto) {
      payload.slip_photo = formData.photo || "";
    }
    if (formData.package_photo !== originalPackagePhoto) {
      payload.package_photo = formData.package_photo || "";
    }

    onSubmit(payload);
  };

  return (
    <div className="space-y-5">
      {/* Row 1: Package Photo | No. of Packages | Upload */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Package Photo Preview */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-neutral-400" />
            Package Photo
          </label>
          <div
            onClick={() => packagePhotoRef.current?.click()}
            className="h-[48px] px-3 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center gap-2 cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all duration-200"
          >
            {formData.package_photo ? (
              <>
                <img
                  src={formData.package_photo}
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

        {/* No. of Packages */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-neutral-400" />
            No. of Packages *
          </label>
          <input
            type="number"
            value={formData.num_packages}
            onChange={(e) => update({ num_packages: e.target.value })}
            placeholder="0"
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all duration-200"
          />
        </div>

        {/* Upload Button */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600">
            Upload Image
          </label>
          <div
            onClick={() => packagePhotoRef.current?.click()}
            className="group h-[48px] rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 flex items-center justify-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all duration-200"
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
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600">
            Transporter
          </label>
          <input
            value={formData.transport_vehicle}
            onChange={(e) => update({ transport_vehicle: e.target.value })}
            placeholder="Transporter"
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all duration-200"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
            Slip Photo
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className="group h-[48px] px-3 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 flex items-center gap-2 cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-all duration-200"
          >
            {formData.photo ? (
              <img
                src={formData.photo}
                alt="slip"
                className="w-8 h-8 rounded-lg object-cover shadow-sm"
              />
            ) : (
              <Upload className="w-4 h-4 text-neutral-400 group-hover:text-purple-600" />
            )}
            <span className="text-xs text-neutral-400 group-hover:text-purple-600">
              {formData.photo ? "Photo Added" : "Upload"}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              className="hidden"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600">
            Transport Amount
          </label>
          <input
            type="number"
            value={formData.transport_charge}
            onChange={(e) => update({ transport_charge: e.target.value })}
            placeholder="₹ 0"
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all duration-200"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600">
            Payment Mode
          </label>
          <select
            value={formData.transport_payment_mode}
            onChange={(e) => update({ transport_payment_mode: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all duration-200 cursor-pointer"
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
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600">
            Delivery Charges
          </label>
          <input
            type="number"
            value={formData.courier_charge}
            onChange={(e) => update({ courier_charge: e.target.value })}
            placeholder="₹ 0"
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600">
            Delivery Type
          </label>
          <select
            value={formData.vehicle}
            onChange={(e) => update({ vehicle: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 cursor-pointer"
          >
            <option value="">Select</option>
            <option value="bike">Bike</option>
            <option value="car">Car</option>
            <option value="auto">Auto</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-600">
            Payment Mode
          </label>
          <select
            value={formData.payment_mode}
            onChange={(e) => update({ payment_mode: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 cursor-pointer"
          >
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="none">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Handled By */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">
          Handled By
        </label>
        <input
          value={formData.handled_by}
          onChange={(e) => update({ handled_by: e.target.value })}
          placeholder="Handled By"
          className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200"
        />
      </div>

      {/* Products Section - Readonly Display */}
      {readOnlyProducts && formData.products?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-1 rounded-full bg-rose-500" />
            <h3 className="text-sm font-semibold text-neutral-700">Products</h3>
            <span className="text-xs text-neutral-500">
              ({formData.products.length} items)
            </span>
          </div>
          <div className="border border-neutral-200 rounded-xl max-h-48 overflow-y-auto">
            {formData.products.length === 0 ? (
              <div className="py-4 text-center text-sm text-neutral-400">
                No products in this courier
              </div>
            ) : (
              formData.products.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 border-b border-neutral-100 last:border-b-0"
                >
                  {p.photo ? (
                    <img
                      src={p.photo}
                      alt={p.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="text-xs text-neutral-500">
                      Qty: {p.quantity} | Price: ₹
                      {p.price?.toLocaleString() || 0}/unit
                    </div>
                    {p.brand && (
                      <div className="text-xs text-neutral-400">{p.brand}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-neutral-300 text-sm text-neutral-700 hover:bg-white"
        >
          Cancel
        </button>
        <button
          onClick={handleFormSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

export default CourierForm;
