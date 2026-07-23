import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Check,
  X,
  Plus,
  PackageCheck,
} from "lucide-react";

function BlankPurchasePage({ title }) {
  return (
    <div className="min-h-screen wms-grid-bg px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <Link
          to="/dashboard/purchase"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchase Dashboard
        </Link>

        <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
          <div className="text-xs uppercase tracking-wider text-neutral-400">
            Purchase Module
          </div>
          <h1 className="text-3xl font-semibold text-neutral-900 mt-2">
            {title}
          </h1>
          <p className="text-neutral-500 mt-2">
            This page is ready. Form/table will be added here later.
          </p>
        </div>
      </div>
    </div>
  );
}

export function NoteForApproval() {
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("all");

  const [items, setItems] = useState([
    {
      id: 1,
      brand: "Samsung",
      itemCode: "SAM-001",
      itemName: "Samsung Galaxy S23",
      availableQty: 12,
      orderQty: 5,
      photo: "https://placehold.co/48x48?text=SAM",
      status: "",
    },
    {
      id: 2,
      brand: "Apple",
      itemCode: "APP-002",
      itemName: "iPhone 15 Pro",
      availableQty: 8,
      orderQty: 3,
      photo: "https://placehold.co/48x48?text=APP",
      status: "",
    },
    {
      id: 3,
      brand: "Dell",
      itemCode: "DEL-003",
      itemName: "Dell XPS 13 Laptop",
      availableQty: 5,
      orderQty: 2,
      photo: "https://placehold.co/48x48?text=DEL",
      status: "",
    },
    {
      id: 4,
      brand: "HP",
      itemCode: "HP-004",
      itemName: "HP LaserJet Pro MFP",
      availableQty: 15,
      orderQty: 4,
      photo: "https://placehold.co/48x48?text=HP",
      status: "",
    },
  ]);

  const brands = useMemo(() => {
    return ["all", ...new Set(items.map((item) => item.brand))];
  }, [items]);

  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase();

    const searchMatch =
      item.brand.toLowerCase().includes(q) ||
      item.itemCode.toLowerCase().includes(q) ||
      item.itemName.toLowerCase().includes(q);

    const brandMatch = brand === "all" || item.brand === brand;

    return searchMatch && brandMatch;
  });

  const handleQtyChange = (id, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, orderQty: Number(value) }
          : item
      )
    );
  };

  const handleStatus = (id, status) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );
  };

  return (
    <div className="min-h-screen wms-grid-bg px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            to="/dashboard/purchase"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Purchase Dashboard
          </Link>

          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800">
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-neutral-900">
            Note for Purchase (Start Order)
          </h1>
          <p className="text-neutral-500 mt-2">
            Review and approve items before starting the purchase order.
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-neutral-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="relative w-full lg:max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search item code or item name..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="min-w-[220px]">
                  <label className="text-xs text-neutral-500 block mb-1">
                    Brand
                  </label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    {brands.map((b) => (
                      <option key={b} value={b}>
                        {b === "all" ? "All Brands" : b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="min-w-[150px] border border-neutral-200 rounded-xl px-4 py-3 bg-neutral-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center">
                      <PackageCheck className="w-5 h-5 text-neutral-700" />
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">Total Items</div>
                      <div className="text-lg font-semibold text-neutral-900">
                        {filteredItems.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr className="text-left text-xs uppercase tracking-wider text-neutral-500">
                  <th className="px-5 py-4">#</th>
                  <th className="px-5 py-4">Brand</th>
                  <th className="px-5 py-4">Item Code</th>
                  <th className="px-5 py-4">Item Name</th>
                  <th className="px-5 py-4 text-center">Available Qty</th>
                  <th className="px-5 py-4">Order Quantity</th>
                  <th className="px-5 py-4 text-center">Photo</th>
                  <th className="px-5 py-4 text-center">Approve</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {filteredItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-4 text-neutral-700">{index + 1}</td>
<td className="px-5 py-4">
  <div className="flex items-center gap-2">
    <span className="font-medium text-neutral-900">
      {item.brand}
    </span>

    <button
      type="button"
      className="w-7 h-7 rounded-md border border-neutral-200 hover:bg-neutral-100 flex items-center justify-center"
      title="Search Brand"
      onClick={() => {
        // later search popup yahan open karenge
      }}
    >
      <Search className="w-4 h-4 text-neutral-600" />
    </button>
  </div>
</td>
                    <td className="px-5 py-4 text-neutral-700">
                      {item.itemCode}
                    </td>
                    <td className="px-5 py-4 text-neutral-900">
                      {item.itemName}
                    </td>
                    <td className="px-5 py-4 text-center text-neutral-700">
                      {item.availableQty}
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min="1"
                        value={item.orderQty}
                        onChange={(e) =>
                          handleQtyChange(item.id, e.target.value)
                        }
                        className="w-32 px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center">
                        <img
                          src={item.photo}
                          alt={item.itemName}
                          className="w-11 h-11 rounded-lg object-cover border border-neutral-200"
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleStatus(item.id, "approved")}
                          className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
                            item.status === "approved"
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-emerald-50 text-emerald-600 border-emerald-200"
                          }`}
                        >
                          <Check className="w-5 h-5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatus(item.id, "rejected")}
                          className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
                            item.status === "rejected"
                              ? "bg-red-600 text-white border-red-600"
                              : "bg-red-50 text-red-600 border-red-200"
                          }`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredItems.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-5 py-10 text-center text-neutral-500"
                    >
                      No items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-neutral-200 flex items-center justify-between text-sm text-neutral-500">
            <span>
              Showing {filteredItems.length} of {items.length} items
            </span>

            <button className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800">
              Start Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PurchaseRequest() {
  return <BlankPurchasePage title="Purchase Request" />;
}

export function PurchaseOrder() {
  return <BlankPurchasePage title="Purchase Order" />;
}

export function GoodsReceiptNote() {
  return <BlankPurchasePage title="Goods Receipt Note" />;
}