import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ClipboardList,
  Loader2,
  Truck,
  X,
  Save,
  Image as ImageIcon,
  UserCheck,
  UserX,
} from "lucide-react";

export default function DataEntryTableModal({ courier, onClose, onUpdated }) {
  const { API, authHeaders } = useAuth();

  const [isRegistered, setIsRegistered] = useState(true);

  const emptyProduct = {
    supply_code: "",
    supplier: "",
    invoice_number: "",
    invoice_date: "",
    transportation_method: "",
    transporter_name: "",
    transportation_cost: "",
    transportation_cost_gst: "",
    transportation_cost_gst_flight: "",
    gst_percent: "",
    total_invoice_amount: "",
    cost_per_unit: "",
    gst_amount: "",
    hsn_code: "",
    unit: "",
    po_number: "",
    batch_number: "",
    mrp: "",
    discount_percent: "",
    discount_amount: "",
    igst_percent: "",
    expiry_date: "",
    remarks: "",

    name: "",
    quantity: "",
    photo: "",
    photo_preview: "",
    category: "",
    brand: "",
    code: "",
    description: "",
    damaged: false,
    damaged_count: 0,

    register_type: "register",

    sl_no: "",
meter: "",
free: "",
purchase_date: "",
selling: "",
special_date: "",
tax: "",
amount: "",
new_amount: "",
landing_cost: "",
  };

  const [currentProduct, setCurrentProduct] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await axios.get(`${API}/data-entry/products`, {
          headers: authHeaders(),
        });

        if (res.data?.data && Array.isArray(res.data.data)) {
          setAllProducts(res.data.data);
        } else if (Array.isArray(res.data)) {
          setAllProducts(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadProducts();
  }, [API, authHeaders]);

  useEffect(() => {
    if (!courier) return;

    const warehouseProduct =
      courier.products?.find((p) => !p.data_entry_done) ||
      courier.products?.[0];

    if (!warehouseProduct) {
      setCurrentProduct(emptyProduct);
      return;
    }

    setCurrentProduct((prev) => ({
      ...emptyProduct,

      name: warehouseProduct.name || "",
      quantity: warehouseProduct.quantity || "",
      photo: warehouseProduct.photo || "",
      photo_preview: warehouseProduct.photo || "",
      category: warehouseProduct.category || "",
      brand: warehouseProduct.brand || "",
      code: warehouseProduct.code || "",
      description: warehouseProduct.description || "",
      damaged: !!warehouseProduct.damaged,
      damaged_count: warehouseProduct.damaged_count || 0,

      supply_code: warehouseProduct.supply_code || prev.supply_code || "",
      register_type: isRegistered ? "register" : "unregister",
    }));
}, [courier, isRegistered]); 

  if (!courier) return null;


  
  const item = currentProduct;

  const handleFieldChange = (field, value) => {
    setCurrentProduct((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const quantity = parseFloat(item.quantity) || 1;
  const costPerUnit = parseFloat(item.cost_per_unit) || 0;
  const gstPercent = parseFloat(item.gst_percent) || 0;
  const transportCostGstFlight =
    parseFloat(item.transportation_cost_gst_flight) || 0;
  const discountPercent = parseFloat(item.discount_percent) || 0;
  const discountAmount = parseFloat(item.discount_amount) || 0;

  const amount = costPerUnit * quantity;
  const gstAmount =
    parseFloat(item.gst_amount) || (costPerUnit * gstPercent) / 100;
  const gstTotal = gstAmount * quantity;
  const finalDiscount =
    discountAmount > 0 ? discountAmount : (amount * discountPercent) / 100;
  const finalTotal = amount + gstTotal + transportCostGstFlight - finalDiscount;

  const filterProducts = (value) => {
    const q = value.trim().toLowerCase();

    if (!q) {
      setSearchResults([]);
      return;
    }

    const filtered = allProducts.filter(
      (product) =>
        product.name?.toLowerCase().includes(q) ||
        product.brand?.toLowerCase().includes(q) ||
        product.code?.toLowerCase().includes(q),
    );

    setSearchResults(filtered);
  };

  const selectProductInline = (product) => {
    setCurrentProduct((prev) => ({
      ...prev,
      name: product.name || prev.name,
      photo: product.photo || prev.photo || "",
      photo_preview: product.photo || prev.photo_preview || "",
      brand: product.brand || prev.brand || "",
      category: product.category || prev.category || "",
      code: product.code || prev.code || "",
      description: product.description || prev.description || "",
    }));

    setSearchResults([]);
    toast.success(`Selected: ${product.name}`);
  };

  const handleFinalSubmit = async () => {
    if (!item.name.trim()) {
      toast.error("Enter product name");
      return;
    }

    if (!item.quantity) {
      toast.error("Enter quantity");
      return;
    }

    setSaving(true);

    try {
      const product = {
        ...item,
        photo: item.photo_preview || item.photo || "",
        gst_amount: gstAmount.toFixed(2),
        total_invoice_amount: finalTotal.toFixed(2),
        discount_amount: finalDiscount.toFixed(2),
        register_type: isRegistered ? "register" : "unregister",
      };

      const productsPayload = [
        {
          name: product.name,
          quantity: Number(product.quantity),
          supply_code: product.supply_code || null,
          photo: product.photo || null,

          damaged: !!product.damaged,
          damaged_count: product.damaged_count
            ? Number(product.damaged_count)
            : 0,

          category: product.category || null,
          brand: product.brand || null,
          code: product.code || null,
          description: product.description || null,

          price: product.cost_per_unit
            ? parseFloat(product.cost_per_unit)
            : null,

          supplier: product.supplier || null,
          invoice_number: product.invoice_number || null,
          invoice_date: product.invoice_date || null,
          transportation_method: product.transportation_method || null,
          transporter_name: product.transporter_name || null,

          transportation_cost: product.transportation_cost
            ? parseFloat(product.transportation_cost)
            : null,
          transportation_cost_gst: product.transportation_cost_gst
            ? parseFloat(product.transportation_cost_gst)
            : null,
          transportation_cost_gst_flight: product.transportation_cost_gst_flight
            ? parseFloat(product.transportation_cost_gst_flight)
            : null,

          gst_percent: product.gst_percent
            ? parseFloat(product.gst_percent)
            : null,
          total_invoice_amount: product.total_invoice_amount
            ? parseFloat(product.total_invoice_amount)
            : null,
          cost_per_unit: product.cost_per_unit
            ? parseFloat(product.cost_per_unit)
            : null,
          gst_amount: product.gst_amount
            ? parseFloat(product.gst_amount)
            : null,

          hsn_code: product.hsn_code || null,
          unit: product.unit || null,
          po_number: product.po_number || null,
          batch_number: product.batch_number || null,
          mrp: product.mrp ? parseFloat(product.mrp) : null,
          discount_percent: product.discount_percent
            ? parseFloat(product.discount_percent)
            : null,
          discount_amount: product.discount_amount
            ? parseFloat(product.discount_amount)
            : null,
          igst_percent: product.igst_percent
            ? parseFloat(product.igst_percent)
            : null,
          expiry_date: product.expiry_date || null,
          remarks: product.remarks || null,
          register_type: product.register_type || "register",
        },
      ];

      await axios.post(
        `${API}/couriers/${courier.id}/data-entry/products`,
        { products: productsPayload },
        { headers: authHeaders() },
      );

      toast.success("Product submitted successfully");

      const completeRes = await axios.patch(
        `${API}/couriers/${courier.id}/complete-data-entry`,
        {},
        { headers: authHeaders() },
      );

      toast.success("Data entry completed! Courier moved to verification");

      setCurrentProduct(emptyProduct);

      if (completeRes.data) {
        onUpdated?.(completeRes.data);
      }

      setTimeout(() => onClose(), 500);
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err?.response?.data?.detail || "Failed to submit product");
    } finally {
      setSaving(false);
    }
  };

  const ReadOnlyInput = ({ value, placeholder, className = "" }) => (
    <input
      type="text"
      value={value || ""}
      readOnly
      placeholder={placeholder}
      className={`px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-neutral-50 text-neutral-700 ${className}`}
    />
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-2xl shadow-2xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col max-w-7xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-100 bg-gradient-to-r from-blue-900 to-blue-800 text-white">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> GRM
            </div>

            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <div className="text-xl font-bold font-mono">
                {courier.courier_number}
              </div>

              {courier.courier_company && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-200">
                  <Truck className="w-3.5 h-3.5" />
                  {courier.courier_company}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-neutral-700">Type:</span>

            <div className="flex items-center gap-2 bg-white rounded-lg border border-neutral-200 p-1">
              <button
                onClick={() => setIsRegistered(true)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  isRegistered
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Register
              </button>

              <button
                onClick={() => setIsRegistered(false)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  !isRegistered
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <UserX className="w-4 h-4" />
                Unregister
              </button>
            </div>

            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${
                isRegistered
                  ? "bg-blue-100 text-blue-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {isRegistered ? "Register Mode" : "Unregister Mode"}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 bg-neutral-50">
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-neutral-400">Product Entry</div>
                <div className="text-sm font-semibold text-neutral-900">
                  {isRegistered
                    ? "📝 Register Product"
                    : "📤 Unregister Product"}
                </div>
              </div>

              <button
                onClick={handleFinalSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}

                {saving ? "Submitting..." : "Final Submit"}
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="border border-neutral-200 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                    Supplier Details
                  </h3>

                  <div className="space-y-3">
                    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                      <label className="text-sm text-neutral-600">
                        Invoice Date :
                      </label>
                      <input
                        type="date"
                        value={item.invoice_date || ""}
                        onChange={(e) =>
                          handleFieldChange("invoice_date", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                      <label className="text-sm text-neutral-600">
                        Supplier :
                      </label>
                      <input
                        type="text"
                        value={item.supplier || ""}
                        onChange={(e) =>
                          handleFieldChange("supplier", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                      <label className="text-sm text-neutral-600">
                        Supply Code :
                      </label>
                      <input
                        type="text"
                        value={item.supply_code || ""}
                        onChange={(e) =>
                          handleFieldChange("supply_code", e.target.value)
                        }
                        placeholder="Enter Supply Code"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                      <label className="text-sm text-neutral-600">
                        Invoice No :
                      </label>
                      <input
                        type="text"
                        value={item.invoice_number || ""}
                        onChange={(e) =>
                          handleFieldChange("invoice_number", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                      <label className="text-sm text-neutral-600">
                        PO Number :
                      </label>
                      <input
                        type="text"
                        value={item.po_number || ""}
                        onChange={(e) =>
                          handleFieldChange("po_number", e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-neutral-200 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                    Transportation Details
                  </h3>

                  <div className="space-y-3">
                    <div className="grid grid-cols-[150px_1fr] items-center gap-3">
                      <label className="text-sm text-neutral-600">
                        Method :
                      </label>
                      <select
                        value={item.transportation_method || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "transportation_method",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      >
                        <option value="">—</option>
                        <option value="Road">Road</option>
                        <option value="Air">Air</option>
                        <option value="Train">Train</option>
                        <option value="Courier">Courier</option>
                        <option value="Self Pickup">Self Pickup</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-[150px_1fr] items-center gap-3">
                      <label className="text-sm text-neutral-600">
                        Transport Cost :
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.transportation_cost || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "transportation_cost",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="grid grid-cols-[150px_1fr] items-center gap-3">
                      <label className="text-sm text-neutral-600">
                        Transport Cost GST :
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.transportation_cost_gst || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "transportation_cost_gst",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="grid grid-cols-[150px_1fr] items-center gap-3">
                      <label className="text-sm text-neutral-600">
                        Transport GST Flight :
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.transportation_cost_gst_flight || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "transportation_cost_gst_flight",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="border-t border-neutral-200 pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-neutral-900 mb-3">
                        Discount Details
                      </h4>

                      <div className="space-y-3">
                        <div className="grid grid-cols-[150px_1fr] items-center gap-3">
                          <label className="text-sm text-neutral-600">
                            Discount % :
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.discount_percent || ""}
                            onChange={(e) =>
                              handleFieldChange(
                                "discount_percent",
                                e.target.value,
                              )
                            }
                            placeholder="0"
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-[150px_1fr] items-center gap-3">
                          <label className="text-sm text-neutral-600">
                            Discount Amount :
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.discount_amount || ""}
                            onChange={(e) =>
                              handleFieldChange(
                                "discount_amount",
                                e.target.value,
                              )
                            }
                            placeholder="0.00"
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
                <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Product Entry
                    </h3>

                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isRegistered
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isRegistered ? "Register" : "Unregister"}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
<table className="w-full min-w-[1700px] text-xs">
  <thead className="bg-neutral-50 border-b border-neutral-200">
    <tr className="text-left text-neutral-500 uppercase">
      <th className="px-3 py-3">Image</th>
      <th className="px-3 py-3">Sl No</th>
      <th className="px-3 py-3">Code</th>
      <th className="px-3 py-3">Name</th>
      <th className="px-3 py-3">Meter</th>
      <th className="px-3 py-3">Qty</th>
      <th className="px-3 py-3">Free</th>
      <th className="px-3 py-3">Purchase Date</th>
      <th className="px-3 py-3">MRP</th>
      <th className="px-3 py-3">Selling</th>
      <th className="px-3 py-3">Special Date</th>
      <th className="px-3 py-3">Tax</th>
      <th className="px-3 py-3">Amount</th>
      <th className="px-3 py-3">New Amount</th>
      <th className="px-3 py-3">Landing Cost</th>
      <th className="px-3 py-3">Damage</th>
      <th className="px-3 py-3">Remarks</th>
    </tr>
  </thead>

  <tbody>
    <tr className="border-b border-neutral-100 align-top">
      <td className="px-3 py-3">
        <label className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center cursor-pointer overflow-hidden border border-neutral-200 hover:bg-neutral-200">
          {item.photo_preview || item.photo ? (
            <img
              src={item.photo_preview || item.photo}
              alt="Product"
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-4 h-4 text-neutral-400" />
          )}

          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              handleFieldChange("photo_file", file);
              handleFieldChange("photo_preview", URL.createObjectURL(file));
            }}
          />
        </label>
      </td>

      <td className="px-3 py-3">
        <input
          type="text"
          value={item.sl_no || ""}
          onChange={(e) => handleFieldChange("sl_no", e.target.value)}
          placeholder="Sl No"
          className="w-20 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="text"
          value={item.code || ""}
          onChange={(e) => handleFieldChange("code", e.target.value)}
          placeholder="Code"
          className="w-28 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3 relative">
        <input
          type="text"
          value={item.name || ""}
          onChange={(e) => {
            handleFieldChange("name", e.target.value);
            filterProducts(e.target.value);
          }}
          className="w-full min-w-[180px] px-3 py-2 rounded-lg border border-neutral-200 text-sm"
          placeholder="Product name"
        />

        {searchResults.length > 0 && (
          <div className="absolute z-50 top-full left-3 right-3 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((product) => (
              <div
                key={product.id}
                onClick={() => selectProductInline(product)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-neutral-100 last:border-b-0"
              >
                <div className="font-medium text-sm text-neutral-900">
                  {product.name}
                </div>
                {product.code && (
                  <div className="text-xs text-neutral-500">
                    Code: {product.code}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </td>

      <td className="px-3 py-3">
        <input
          type="number"
          step="0.01"
          value={item.meter || ""}
          onChange={(e) => handleFieldChange("meter", e.target.value)}
          placeholder="Meter"
          className="w-24 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="number"
          value={item.quantity || ""}
          onChange={(e) => handleFieldChange("quantity", e.target.value)}
          placeholder="Qty"
          className="w-20 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="number"
          value={item.free || ""}
          onChange={(e) => handleFieldChange("free", e.target.value)}
          placeholder="Free"
          className="w-20 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="date"
          value={item.purchase_date || ""}
          onChange={(e) => handleFieldChange("purchase_date", e.target.value)}
          className="w-36 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="number"
          step="0.01"
          value={item.mrp || ""}
          onChange={(e) => handleFieldChange("mrp", e.target.value)}
          placeholder="MRP"
          className="w-24 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="number"
          step="0.01"
          value={item.selling || ""}
          onChange={(e) => handleFieldChange("selling", e.target.value)}
          placeholder="Selling"
          className="w-24 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="date"
          value={item.special_date || ""}
          onChange={(e) => handleFieldChange("special_date", e.target.value)}
          className="w-36 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="number"
          step="0.01"
          value={item.tax || ""}
          onChange={(e) => handleFieldChange("tax", e.target.value)}
          placeholder="Tax"
          className="w-20 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="number"
          step="0.01"
          value={item.amount || ""}
          onChange={(e) => handleFieldChange("amount", e.target.value)}
          placeholder="Amount"
          className="w-28 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="number"
          step="0.01"
          value={item.new_amount || ""}
          onChange={(e) => handleFieldChange("new_amount", e.target.value)}
          placeholder="New Amount"
          className="w-32 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3">
        <input
          type="number"
          step="0.01"
          value={item.landing_cost || ""}
          onChange={(e) => handleFieldChange("landing_cost", e.target.value)}
          placeholder="Landing"
          className="w-32 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>

      <td className="px-3 py-3">
        <div
          className={`w-fit min-w-[92px] text-center px-3 py-2 rounded-lg text-xs font-semibold ${
            item.damaged
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {item.damaged ? `Damaged: ${item.damaged_count || 0}` : "No Damage"}
        </div>
      </td>

      <td className="px-3 py-3">
        <input
          type="text"
          value={item.remarks || ""}
          onChange={(e) => handleFieldChange("remarks", e.target.value)}
          placeholder="Remarks"
          className="w-40 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
        />
      </td>
    </tr>
  </tbody>
</table>
                  </div>
                </div>

                <div className="bg-neutral-900 text-white rounded-2xl p-5 h-fit sticky top-4">
                  <h3 className="text-sm font-semibold mb-5">
                    Calculation Summary
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-white/80">
                      <span>Quantity</span>
                      <span>{quantity}</span>
                    </div>

                    <div className="flex justify-between text-white/80">
                      <span>Amount</span>
                      <span>{money(amount)}</span>
                    </div>

                    <div className="flex justify-between text-white/80">
                      <span>GST Amount</span>
                      <span>{money(gstTotal)}</span>
                    </div>

                    <div className="flex justify-between text-white/80 border-t border-white/10 pt-2">
                      <span>Transport GST Flight</span>
                      <span className="text-emerald-400">
                        {money(transportCostGstFlight)}
                      </span>
                    </div>

                    <div className="flex justify-between text-white/80">
                      <span>Discount</span>
                      <span className="text-rose-400">
                        - {money(finalDiscount)}
                      </span>
                    </div>

                    <div className="border-t border-white/20 pt-4 mt-4 flex justify-between text-lg font-bold">
                      <span>Final Total</span>
                      <span className="text-emerald-400">
                        {money(finalTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {item.description && (
                <div className="border border-neutral-200 rounded-2xl p-4 bg-neutral-50">
                  <div className="text-xs text-neutral-400 mb-1">
                    Warehouse Description
                  </div>
                  <div className="text-sm text-neutral-700">
                    {item.description}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
