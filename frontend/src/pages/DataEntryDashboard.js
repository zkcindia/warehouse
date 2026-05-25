import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import DataEntryItemModal from "@/components/DataEntryItemModal";
import { useAuth } from "@/context/AuthContext";
import {
  ClipboardList,
  Loader2,
  RefreshCw,
  Truck,
  Package,
  CheckCircle2,
  AlertCircle,
  Search,
  Image as ImageIcon,
  IndianRupee,
  Hash,
  Calendar,
  Tag,
  Building2,
} from "lucide-react";

function ProgressPill({ done, total }) {
  const complete = total > 0 && done === total;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
        complete
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : done > 0
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-neutral-50 text-neutral-600 border-neutral-200"
      }`}
    >
      <ClipboardList className="w-3 h-3" />
      {done}/{total}
    </span>
  );
}

export default function DataEntryDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // {courier, item}
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/data-entry/couriers`, {
        headers: authHeaders(),
      });
      const data = res.data || [];
      setCouriers(data);
      if (data.length > 0 && !data.find((c) => c.id === activeId)) {
        setActiveId(data[0].id);
      }
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(
    () => couriers.find((c) => c.id === activeId) || null,
    [couriers, activeId]
  );

  const filteredCouriers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return couriers;
    return couriers.filter(
      (c) =>
        (c.courier_number || "").toLowerCase().includes(q) ||
        (c.courier_company || "").toLowerCase().includes(q)
    );
  }, [couriers, search]);

  const stats = useMemo(() => {
    let totalItems = 0;
    let doneItems = 0;
    couriers.forEach((c) => {
      totalItems += (c.products || []).length;
      doneItems += c.data_entry_done_count || 0;
    });
    return {
      totalCouriers: couriers.length,
      totalItems,
      doneItems,
      pendingItems: totalItems - doneItems,
    };
  }, [couriers]);

  const applyUpdate = (updated) => {
    setCouriers((arr) => arr.map((c) => (c.id === updated.id ? updated : c)));
    if (editingItem && editingItem.courier?.id === updated.id) {
      const refreshedItem = (updated.products || []).find(
        (p) => p.id === editingItem.item.id
      );
      if (refreshedItem) {
        setEditingItem({ courier: updated, item: refreshedItem });
      }
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto pb-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-400">
                Data Entry Staff
              </div>
              <div
                className="text-2xl font-semibold tracking-tight text-neutral-900"
                data-testid="welcome-heading"
              >
                Data Entry workspace
              </div>
              <div className="text-sm text-neutral-500">
                Hi {user?.full_name?.split(" ")[0] || "there"}, add purchase
                details (invoice, GST, transport) for items sent by Warehouse.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
            data-testid="de-refresh-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            icon={Truck}
            label="Couriers pending"
            value={stats.totalCouriers}
            accent="neutral"
          />
          <StatTile
            icon={Package}
            label="Total items"
            value={stats.totalItems}
            accent="blue"
          />
          <StatTile
            icon={AlertCircle}
            label="Items pending"
            value={stats.pendingItems}
            accent="amber"
          />
          <StatTile
            icon={CheckCircle2}
            label="Items done"
            value={stats.doneItems}
            accent="emerald"
          />
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-neutral-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : couriers.length === 0 ? (
          <div className="py-16 text-center bg-white border border-dashed border-neutral-200 rounded-2xl">
            <div className="w-12 h-12 rounded-lg bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div className="text-sm text-neutral-700 font-medium">
              No couriers waiting for data entry
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Warehouse Staff will send couriers here after adding items.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
            {/* Left: courier list */}
            <aside className="bg-white border border-neutral-200 rounded-2xl p-3 h-fit">
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  data-testid="de-search"
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 text-xs w-full focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div className="space-y-1.5 max-h-[64vh] overflow-y-auto pr-1">
                {filteredCouriers.map((c) => {
                  const done = c.data_entry_done_count || 0;
                  const total = c.products?.length || 0;
                  const isActive = c.id === activeId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      data-testid={`de-courier-${c.courier_number}`}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        isActive
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white hover:border-neutral-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-mono text-sm font-semibold">
                          {c.courier_number}
                        </div>
                        <ProgressPill done={done} total={total} />
                      </div>
                      <div
                        className={`text-[11px] truncate mt-0.5 ${
                          isActive ? "text-neutral-300" : "text-neutral-500"
                        }`}
                      >
                        {c.courier_company || "No company"}
                      </div>
                    </button>
                  );
                })}
                {filteredCouriers.length === 0 && (
                  <div className="text-xs text-neutral-400 px-2 py-3">
                    No couriers match your search
                  </div>
                )}
              </div>
            </aside>

            {/* Right: items table for active courier */}
            <section className="bg-white border border-neutral-200 rounded-2xl p-5 min-w-0">
              {!active ? (
                <div className="py-10 text-center text-sm text-neutral-400">
                  Select a courier on the left
                </div>
              ) : (
                <CourierItemsPanel
                  courier={active}
                  onEditItem={(item) =>
                    setEditingItem({ courier: active, item })
                  }
                />
              )}
            </section>
          </div>
        )}
      </div>

      <DataEntryItemModal
        courier={editingItem?.courier || null}
        item={editingItem?.item || null}
        onClose={() => setEditingItem(null)}
        onUpdated={(updated) => applyUpdate(updated)}
      />
    </DashboardShell>
  );
}

function StatTile({ icon: Icon, label, value, accent = "neutral" }) {
  const accents = {
    neutral: "bg-neutral-50 text-neutral-700 border-neutral-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${accents[accent]}`}
    >
      <div className="w-9 h-9 rounded-lg bg-white/70 border border-white flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider opacity-70">
          {label}
        </div>
        <div className="text-lg font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function CourierItemsPanel({ courier, onEditItem }) {
  const items = courier.products || [];
  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-neutral-900 font-mono">
              {courier.courier_number}
            </div>
            <div className="text-xs text-neutral-500 truncate">
              {courier.courier_company || "No company"} · {items.length} item
              {items.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <ProgressPill
          done={courier.data_entry_done_count || 0}
          total={items.length}
        />
      </div>

      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
          No items in this courier
        </div>
      ) : (
        <div className="border border-neutral-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-14">Status</th>
                  <th className="text-left px-3 py-2 font-medium w-14">Photo</th>
                  <th className="text-left px-3 py-2 font-medium">Item</th>
                  <th className="text-left px-3 py-2 font-medium">Supplier</th>
                  <th className="text-left px-3 py-2 font-medium">Invoice</th>
                  <th className="text-left px-3 py-2 font-medium">HSN / Unit</th>
                  <th className="text-right px-3 py-2 font-medium w-28">Cost</th>
                  <th className="text-right px-3 py-2 font-medium w-20">GST%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onEditItem(p)}
                    data-testid={`de-item-${p.id}`}
                    className={`cursor-pointer transition-colors ${
                      p.data_entry_done
                        ? "bg-emerald-50/30 hover:bg-emerald-50/60"
                        : "hover:bg-neutral-50"
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      {p.data_entry_done ? (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200"
                          title="Data entry complete"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertCircle className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.photo ? (
                        <img
                          src={p.photo}
                          alt={p.name}
                          className="w-9 h-9 rounded-md object-cover border border-neutral-100"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-neutral-50 border border-neutral-100 text-neutral-300 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-neutral-900 truncate max-w-[16rem]">
                        {p.name}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-0.5 text-[11px] text-neutral-500">
                        {p.brand && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {p.brand}
                          </span>
                        )}
                        {p.code && (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Hash className="w-3 h-3" /> {p.code}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Package className="w-3 h-3" /> Qty {p.quantity}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-neutral-700">
                      {p.supplier ? (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-neutral-400" />
                          {p.supplier}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-neutral-700">
                      {p.invoice_number ? (
                        <>
                          <div className="text-sm font-mono">{p.invoice_number}</div>
                          {p.invoice_date && (
                            <div className="text-[11px] text-neutral-500 inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {p.invoice_date}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-neutral-700">
                      {p.hsn_code || p.unit ? (
                        <>
                          <div className="text-sm font-mono">{p.hsn_code || "—"}</div>
                          {p.unit && (
                            <div className="text-[11px] text-neutral-500">{p.unit}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-neutral-700">
                      {p.cost_per_unit != null ? (
                        <span className="inline-flex items-center gap-0.5 font-medium">
                          <IndianRupee className="w-3 h-3" />
                          {p.cost_per_unit.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-neutral-700">
                      {p.gst_percent != null ? `${p.gst_percent}%` : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
