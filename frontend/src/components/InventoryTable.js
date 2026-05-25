import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import AddInventoryItemDialog from "@/components/AddInventoryItemDialog";
import {
  Package,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Image as ImageIcon,
  AlertTriangle,
  Search,
  Truck,
  Boxes,
} from "lucide-react";

function StatTile({ icon: Icon, label, value, accent = "neutral" }) {
  const accentMap = {
    neutral: "bg-neutral-50 text-neutral-700 border-neutral-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${accentMap[accent]}`}>
      <div className="w-9 h-9 rounded-lg bg-white/70 border border-white flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-lg font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}

export default function InventoryTable() {
  const { API, authHeaders } = useAuth();
  const [rows, setRows] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        axios.get(`${API}/inventory/items`, { headers: authHeaders() }),
        axios.get(`${API}/couriers`, { headers: authHeaders() }),
      ]);
      setRows(r1.data || []);
      setCouriers(r2.data || []);
    } catch (e) {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.courier_number || "").toLowerCase().includes(q) ||
        (r.courier_company || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const totalItems = rows.length;
    const totalUnits = rows.reduce((n, r) => n + (r.quantity || 0), 0);
    const totalDamaged = rows.reduce((n, r) => n + (r.damaged_count || 0), 0);
    const couriersCovered = new Set(rows.map((r) => r.courier_id)).size;
    return { totalItems, totalUnits, totalDamaged, couriersCovered };
  }, [rows]);

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove "${row.name}" from ${row.courier_number}?`)) return;
    setRemovingId(row.item_id);
    try {
      await axios.delete(
        `${API}/couriers/${row.courier_id}/items/${row.item_id}`,
        { headers: authHeaders() }
      );
      toast.success("Item removed");
      // Optimistic remove
      setRows((arr) => arr.filter((r) => r.item_id !== row.item_id));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-semibold text-neutral-900">Inventory</div>
            <div className="text-xs text-neutral-500">
              All items across all couriers · per-courier view
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or courier…"
              data-testid="inv-search"
              className="pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
            data-testid="inv-refresh-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800"
            data-testid="inv-add-btn"
          >
            <Plus className="w-3.5 h-3.5" /> Add item
          </button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <StatTile icon={Package} label="Items" value={stats.totalItems} />
        <StatTile icon={Boxes} label="Total units" value={stats.totalUnits} accent="blue" />
        <StatTile icon={AlertTriangle} label="Damaged units" value={stats.totalDamaged} accent="red" />
        <StatTile icon={Truck} label="Couriers covered" value={stats.couriersCovered} accent="emerald" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-10 flex items-center justify-center text-neutral-400 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading inventory…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-neutral-200 rounded-xl">
          <div className="w-12 h-12 rounded-lg bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3">
            <Package className="w-6 h-6" />
          </div>
          <div className="text-sm text-neutral-700 font-medium">
            {search ? "No items match your search" : "No inventory items yet"}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {search
              ? "Try a different search term"
              : "Complete a courier checklist and add items to populate the inventory."}
          </div>
        </div>
      ) : (
        <div className="border border-neutral-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium w-16">Photo</th>
                  <th className="text-left px-4 py-2.5 font-medium">Item name</th>
                  <th className="text-right px-4 py-2.5 font-medium w-24">Quantity</th>
                  <th className="text-left px-4 py-2.5 font-medium w-32">Damaged</th>
                  <th className="text-left px-4 py-2.5 font-medium w-40">Courier</th>
                  <th className="text-right px-4 py-2.5 font-medium w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((r) => (
                  <tr
                    key={r.item_id}
                    data-testid={`inv-row-${r.item_id}`}
                    className="hover:bg-neutral-50/60 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      {r.photo ? (
                        <img
                          src={r.photo}
                          alt={r.name}
                          className="w-10 h-10 rounded-lg object-cover border border-neutral-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-neutral-50 border border-neutral-100 text-neutral-300 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-neutral-900">{r.name}</div>
                      {r.created_at && (
                        <div className="text-[11px] text-neutral-400">
                          {new Date(r.created_at).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center justify-center min-w-[2.25rem] px-2 py-0.5 rounded-full bg-neutral-900 text-white text-xs font-semibold">
                        {r.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.damaged || r.damaged_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
                          <AlertTriangle className="w-3 h-3" /> {r.damaged_count} damaged
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-sm font-mono text-neutral-900">
                        {r.courier_number}
                      </div>
                      {r.courier_company && (
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {r.courier_company}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        disabled={removingId === r.item_id}
                        title="Remove item"
                        data-testid={`inv-delete-${r.item_id}`}
                        className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {removingId === r.item_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddInventoryItemDialog
        open={addOpen}
        couriers={couriers}
        onClose={() => setAddOpen(false)}
        onAdded={() => load()}
      />
    </div>
  );
}
