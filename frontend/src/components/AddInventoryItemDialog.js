import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  X,
  Plus,
  Loader2,
  AlertTriangle,
  PackagePlus,
  CheckCircle2,
  Trash2,
  Hash,
  Check,
  X as XIcon,
  Search,
  ImageIcon,
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

const SOP_FIELDS = [
  { key: "sop_clean", label: "Clean" },
  { key: "sop_sticker", label: "Sticker" },
  { key: "sop_scan", label: "Scan" },
  { key: "sop_packaging", label: "Pack" },
  { key: "sop_quality", label: "Quality" },
  { key: "sop_visual", label: "Visual" },
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
  sop_clean: false,
  sop_sticker: false,
  sop_scan: false,
  sop_packaging: false,
  sop_quality: false,
  sop_visual: false,
});

export default function AddInventoryItemDialog({
  open,
  couriers,
  lockToCourierId,
  onClose,
  onAdded,
}) {
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
  const [allProducts, setAllProducts] = useState([]);
  const [searchResults, setSearchResults] = useState({}); // { uid: [products] }
  const [activeSearchUid, setActiveSearchUid] = useState(null);
  const [searchLoading, setSearchLoading] = useState({}); // { uid: boolean }
  const [manualSearching, setManualSearching] = useState({}); // { uid: boolean }

  // Load products from data-entry API with proper authentication
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const headers = authHeaders();
        const res = await axios.get(`${API}/data-entry/products`, {
          headers: headers,
        });

        if (res.data?.data && Array.isArray(res.data.data)) {
          setAllProducts(res.data.data);
        } else if (Array.isArray(res.data)) {
          setAllProducts(res.data);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
        if (err.response?.status === 401) {
          toast.error("Authentication failed. Please login again.");
        } else {
          toast.error("Failed to load products");
        }
      }
    };

    if (open) {
      loadProducts();
    }
  }, [API, authHeaders, open]);

  useEffect(() => {
    if (!open) return;
    setCourierId(lockToCourierId || eligible[0]?.id || "");
    setRows([blankRow()]);
    setSaving(false);
    setSearchResults({});
    setActiveSearchUid(null);
    setSearchLoading({});
    setManualSearching({});
  }, [open, lockToCourierId, eligible]);

  const selectedCourier = eligible.find((c) => c.id === courierId) || null;

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
    setRows((arr) =>
      arr.length === 1 ? arr : arr.filter((r) => r.uid !== uid)
    );

  const updateRow = (uid, patch) =>
    setRows((arr) => arr.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));

  const toggleSOP = (uid, sopField) => {
    setRows((arr) =>
      arr.map((r) =>
        r.uid === uid ? { ...r, [sopField]: !r[sopField] } : r
      )
    );
  };

  const getSOPProgress = (row) => {
    const completed = SOP_FIELDS.filter((f) => row[f.key] === true).length;
    return { completed, total: SOP_FIELDS.length };
  };

  const handlePhotoForRow = async (uid, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return toast.error("Choose an image file.");
    }
    if (file.size > MAX_IMG_BYTES) {
      return toast.error("Image must be under 4MB.");
    }

    try {
      const dataURL = await fileToDataURL(file);
      updateRow(uid, { photo: dataURL });
    } catch {
      toast.error("Failed to read image.");
    }
  };

  // Live search as user types - FILTERS FROM LOADED PRODUCTS
  const handleProductSearch = (uid, value) => {
    const searchTerm = value.trim().toLowerCase();
    
    // Update the row with the typed value
    updateRow(uid, { name: value });

    if (!searchTerm) {
      // Clear search results if empty
      setSearchResults((prev) => ({ ...prev, [uid]: [] }));
      setActiveSearchUid(null);
      return;
    }

    setActiveSearchUid(uid);
    setSearchLoading((prev) => ({ ...prev, [uid]: true }));

    // Filter products from allProducts
    const filtered = allProducts.filter(
      (product) =>
        product.name?.toLowerCase().includes(searchTerm) ||
        product.brand?.toLowerCase().includes(searchTerm) ||
        product.code?.toLowerCase().includes(searchTerm)
    );

    // Sort results: exact matches first, then starts with, then contains
    const sorted = filtered.sort((a, b) => {
      const aName = a.name?.toLowerCase() || "";
      const bName = b.name?.toLowerCase() || "";
      
      // Exact match gets highest priority
      if (aName === searchTerm && bName !== searchTerm) return -1;
      if (bName === searchTerm && aName !== searchTerm) return 1;
      
      // Starts with gets next priority
      if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1;
      if (bName.startsWith(searchTerm) && !aName.startsWith(searchTerm)) return 1;
      
      // Then sort alphabetically
      return aName.localeCompare(bName);
    });

    setSearchResults((prev) => ({ ...prev, [uid]: sorted }));
    setSearchLoading((prev) => ({ ...prev, [uid]: false }));
  };

  // MANUAL SEARCH - Search from API with proper authentication
  const handleManualSearch = async (uid) => {
    const row = rows.find((r) => r.uid === uid);
    const keyword = row?.name?.trim();

    if (!keyword) {
      toast.error("Please enter a product name first.");
      return;
    }

    // First check if product exists in already loaded products
    const existingProduct = allProducts.find(
      (p) => p.name?.toLowerCase() === keyword.toLowerCase()
    );

    if (existingProduct) {
      selectProduct(uid, existingProduct);
      return;
    }

    // If not found locally, search via API
    setManualSearching((prev) => ({ ...prev, [uid]: true }));

    try {
      const headers = authHeaders();
      const res = await axios.get(`${API}/data-entry/products`, {
        params: { search: keyword },
        headers: headers,
      });

      let products = [];
      if (res.data?.data && Array.isArray(res.data.data)) {
        products = res.data.data;
      } else if (Array.isArray(res.data)) {
        products = res.data;
      }

      if (products.length === 0) {
        toast.error("Product not found in database.");
        return;
      }

      // Use the first matching product
      const product = products[0];
      selectProduct(uid, product);
      toast.success(`Product found: ${product.name}`);
    } catch (error) {
      console.error("Search error:", error);
      if (error.response?.status === 401) {
        toast.error("Authentication failed. Please login again.");
      } else {
        toast.error(error?.response?.data?.detail || "Failed to search product.");
      }
    } finally {
      setManualSearching((prev) => ({ ...prev, [uid]: false }));
    }
  };

  // Select a product from search results
  const selectProduct = (uid, product) => {
    updateRow(uid, {
      name: product.name || "",
      category: product.category || "",
      brand: product.brand || "",
      code: product.code || "",
      description: product.description || "",
      price: product.price || product.cost_per_unit || "",
      photo: product.photo || null,
    });

    // Clear search results for this row
    setSearchResults((prev) => ({ ...prev, [uid]: [] }));
    setActiveSearchUid(null);
    toast.success(`Selected: ${product.name}`);
  };

  // Close search dropdown when clicking outside
  const handleBlur = (uid) => {
    // Delay to allow click on search result
    setTimeout(() => {
      if (activeSearchUid === uid) {
        setActiveSearchUid(null);
      }
    }, 200);
  };

  const validRows = rows.filter((r) => r.name.trim() && Number(r.quantity) > 0);

  const handleSubmit = async () => {
    if (!courierId) return toast.error("Please select a courier.");

    if (validRows.length === 0) {
      return toast.error("Add at least one item with name and quantity.");
    }

    for (const r of validRows) {
      const qty = Number(r.quantity);
      const dmg = r.damaged ? Number(r.damagedCount || 0) : 0;

      if (r.damaged && dmg < 1) {
        return toast.error(`${r.name}: enter damaged count or turn off damage.`);
      }

      if (dmg > qty) {
        return toast.error(
          `${r.name}: damaged (${dmg}) cannot exceed quantity (${qty}).`
        );
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
          sop_clean: !!r.sop_clean,
          sop_sticker: !!r.sop_sticker,
          sop_scan: !!r.sop_scan,
          sop_packaging: !!r.sop_packaging,
          sop_quality: !!r.sop_quality,
          sop_visual: !!r.sop_visual,
        };
      }),
    };

    setSaving(true);

    try {
      const headers = authHeaders();
      const res = await axios.post(
        `${API}/couriers/${courierId}/items/batch`,
        payload,
        { headers: headers }
      );

      const merged = validRows.filter(
        (r) => !!existingByName[r.name.trim().toLowerCase()]
      ).length;

      const added = validRows.length - merged;

      toast.success(
        `${selectedCourier?.courier_number || "Courier"}: ${added} added, ${merged} merged`
      );

      onAdded?.(res.data);
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to add items");
    } finally {
      setSaving(false);
    }
  };

  const totalProgress = (() => {
    let totalCompleted = 0;
    let totalItems = 0;

    rows.forEach((row) => {
      if (row.name.trim() && Number(row.quantity) > 0) {
        const progress = getSOPProgress(row);
        totalCompleted += progress.completed;
        totalItems += progress.total;
      }
    });

    return { totalCompleted, totalItems };
  })();

  const progressPercent =
    totalProgress.totalItems > 0
      ? (totalProgress.totalCompleted / totalProgress.totalItems) * 100
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={close}
      data-testid="add-inventory-dialog"
    >
      <div
        className="w-full max-w-[96vw] bg-white rounded-2xl shadow-2xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-100 bg-gradient-to-r from-slate-900 via-purple-900 to-indigo-900 text-white">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
              <PackagePlus className="w-3.5 h-3.5" />
              Add Inventory Items
            </div>

            <div className="mt-1 text-lg font-semibold">
              {selectedCourier?.courier_number || courierId || "No courier selected"}
            </div>

            {totalProgress.totalItems > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 w-44 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] text-purple-100">
                  SOP {totalProgress.totalCompleted}/{totalProgress.totalItems}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-neutral-50/60">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3 bg-white border border-neutral-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="text-[11px] uppercase tracking-wider text-neutral-400">
                Selected Courier
              </div>

              <div className="mt-1 text-sm font-semibold text-neutral-800">
                {selectedCourier?.courier_number || courierId || "No courier"}
              </div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold text-neutral-800">
                  Product Entry
                </div>
                <div className="text-xs text-neutral-500">
                  Start typing to search or click search button to find product
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1650px] mb-16">
                <thead className="bg-neutral-100 text-neutral-500 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-3 font-semibold w-10">#</th>
                    <th className="text-left px-3 py-3 font-semibold w-20">Photo</th>
                    <th className="text-left px-3 py-3 font-semibold min-w-[220px]">
                      Product
                    </th>
                    <th className="text-left px-3 py-3 font-semibold min-w-[120px]">
                      Category
                    </th>
                    <th className="text-left px-3 py-3 font-semibold min-w-[120px]">
                      Brand
                    </th>
                    <th className="text-left px-3 py-3 font-semibold min-w-[120px]">
                      Code
                    </th>
                    <th className="text-right px-3 py-3 font-semibold w-24">Qty</th>
                    <th className="text-left px-3 py-3 font-semibold w-40">
                      Damaged
                    </th>

                    {SOP_FIELDS.map((f) => (
                      <th
                        key={f.key}
                        className="text-center px-2 py-3 font-semibold w-24"
                      >
                        {f.label}
                      </th>
                    ))}

                    <th className="text-left px-3 py-3 font-semibold min-w-[160px]">
                      Notes
                    </th>
                    <th className="text-right px-3 py-3 font-semibold w-14">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100 bg-white">
                  {rows.map((r, idx) => {
                    const exists = existingByName[r.name.trim().toLowerCase()];
                    const results = searchResults[r.uid] || [];
                    const isLoading = searchLoading[r.uid] || false;
                    const isActive = activeSearchUid === r.uid;
                    const isManualSearching = manualSearching[r.uid] || false;

                    return (
                      <tr
                        key={r.uid}
                        className={`align-top transition ${
                          exists ? "bg-blue-50/50" : "hover:bg-neutral-50/70"
                        }`}
                      >
                        <td className="px-3 py-3 text-neutral-500 font-mono text-xs">
                          {idx + 1}
                        </td>

                        <td className="px-3 py-3">
                          <RowPhoto
                            photo={r.photo}
                            onPick={(file) => handlePhotoForRow(r.uid, file)}
                            onClear={() => updateRow(r.uid, { photo: null })}
                          />
                        </td>

                        <td className="px-3 py-3">
                          <div className="relative">
                            <div className="relative flex gap-1">
                              <input
                                value={r.name}
                                onChange={(e) => {
                                  handleProductSearch(r.uid, e.target.value);
                                }}
                                onFocus={() => {
                                  if (r.name.trim() && searchResults[r.uid]?.length > 0) {
                                    setActiveSearchUid(r.uid);
                                  }
                                }}
                                onBlur={() => handleBlur(r.uid)}
                                placeholder="Type to search product..."
                                className="flex-1 pr-8 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                autoComplete="off"
                              />
                              
                              {/* Manual Search Button */}
                              <button
                                type="button"
                                onClick={() => handleManualSearch(r.uid)}
                                disabled={isManualSearching || !r.name.trim()}
                                className="px-2 py-1 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                title="Search product in database"
                              >
                                {isManualSearching ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Search className="w-4 h-4" />
                                )}
                                {/* <span className="text-xs">Search</span> */}
                              </button>
                              
                              {isLoading && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                                </div>
                              )}
                            </div>

                            {/* Search Results Dropdown */}
                            {isActive && results.length > 0 && (
                              <div className="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {results.map((product, index) => (
                                  <div
                                    key={product.id || product.code || index}
                                    onClick={() => selectProduct(r.uid, product)}
                                    className="px-3 py-2 hover:bg-purple-50 cursor-pointer border-b border-neutral-100 last:border-b-0 transition-colors"
                                  >
                                    <div className="font-medium text-sm text-neutral-900 flex items-center gap-2">
                                      {product.name}
                                      {product.code && (
                                        <span className="text-xs text-neutral-400 font-normal">
                                          #{product.code}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-3 text-xs text-neutral-500 mt-0.5">
                                      {product.brand && (
                                        <span>Brand: {product.brand}</span>
                                      )}
                                      {product.category && (
                                        <span>Category: {product.category}</span>
                                      )}
                                      {product.price && (
                                        <span className="text-emerald-600 font-medium">
                                          ₹{product.price}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* No results message */}
                            {isActive && r.name.trim() && results.length === 0 && !isLoading && (
                              <div className="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg p-3 text-center">
                                <div className="text-sm text-neutral-500">
                                  No products found for "{r.name}"
                                </div>
                                <div className="text-xs text-neutral-400 mt-1">
                                  You can add this as a new product or click Search button
                                </div>
                              </div>
                            )}
                          </div>

                          {exists && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              Existing stock: {exists.quantity}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <Input
                            value={r.category}
                            onChange={(v) => updateRow(r.uid, { category: v })}
                            placeholder="Category"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <Input
                            value={r.brand}
                            onChange={(v) => updateRow(r.uid, { brand: v })}
                            placeholder="Brand"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <div className="relative">
                            <Hash className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-300" />
                            <input
                              value={r.code}
                              onChange={(e) =>
                                updateRow(r.uid, { code: e.target.value })
                              }
                              placeholder="SKU"
                              className="w-full pl-7 pr-2 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="1"
                            value={r.quantity}
                            onChange={(e) =>
                              updateRow(r.uid, { quantity: e.target.value })
                            }
                            placeholder="Qty"
                            className="w-full px-2 py-2 rounded-lg border border-neutral-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateRow(r.uid, {
                                  damaged: !r.damaged,
                                  damagedCount: !r.damaged ? r.damagedCount : "",
                                })
                              }
                              className={`px-3 py-2 rounded-lg text-xs border inline-flex items-center gap-1.5 ${
                                r.damaged
                                  ? "border-red-300 bg-red-50 text-red-700"
                                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                              }`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {r.damaged ? "Yes" : "No"}
                            </button>

                            {r.damaged && (
                              <input
                                type="number"
                                min="1"
                                value={r.damagedCount}
                                onChange={(e) =>
                                  updateRow(r.uid, {
                                    damagedCount: e.target.value,
                                  })
                                }
                                placeholder="0"
                                className="w-16 px-2 py-2 rounded-lg border border-red-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-red-500/40"
                              />
                            )}
                          </div>
                        </td>

                        {SOP_FIELDS.map((f) => (
                          <td key={f.key} className="px-2 py-3 text-center">
                            <SOPRadio
                              checked={!!r[f.key]}
                              onChange={() => toggleSOP(r.uid, f.key)}
                            />
                          </td>
                        ))}

                        <td className="px-3 py-3">
                          <Input
                            value={r.description}
                            onChange={(v) =>
                              updateRow(r.uid, { description: v })
                            }
                            placeholder="Notes..."
                          />
                        </td>

                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeRow(r.uid)}
                            disabled={rows.length === 1}
                            title="Remove row"
                            className="p-2 rounded-lg text-neutral-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
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

            <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another row
              </button>

              <div className="text-[11px] text-neutral-500 inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" /> Yes
                </span>
                <span>|</span>
                <span className="inline-flex items-center gap-1">
                  <XIcon className="w-3 h-3 text-red-500" /> No
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-neutral-100 bg-white">
          <div className="text-xs text-neutral-500">
            {validRows.length > 0
              ? `Ready to save ${validRows.length} item${
                  validRows.length === 1 ? "" : "s"
                }`
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
                saving || !courierId || validRows.length === 0 || eligible.length === 0
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <PackagePlus className="w-4 h-4" />
                  Save {validRows.length || ""} item
                  {validRows.length === 1 ? "" : "s"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
    />
  );
}

function SOPRadio({ checked, onChange }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
          checked === true
            ? "bg-emerald-500 text-white shadow-sm"
            : "bg-white border border-neutral-200 text-neutral-400 hover:border-emerald-300 hover:text-emerald-600"
        }`}
      >
        <Check className="w-3 h-3" strokeWidth={3} />
      </button>

      <button
        type="button"
        onClick={() => onChange(false)}
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
          checked === false
            ? "bg-red-500 text-white shadow-sm"
            : "bg-white border border-neutral-200 text-neutral-400 hover:border-red-300 hover:text-red-600"
        }`}
      >
        <XIcon className="w-3 h-3" strokeWidth={3} />
      </button>
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
            className="w-12 h-12 rounded-lg object-cover border border-neutral-200 shadow-sm"
          />

          <button
            type="button"
            onClick={onClear}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-neutral-200 text-neutral-600 shadow flex items-center justify-center hover:text-red-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-12 h-12 rounded-lg bg-neutral-50 border border-dashed border-neutral-300 text-neutral-400 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 flex items-center justify-center"
          title="Upload photo"
        >
          <ImageIcon className="w-5 h-5" />
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