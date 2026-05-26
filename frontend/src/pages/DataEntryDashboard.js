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
  ChevronRight,
  X,
  Boxes,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const PAGE_SIZE = 25;

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

function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done === total;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="h-1.5 w-24 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            complete ? "bg-emerald-500" : "bg-blue-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-neutral-600 font-mono">
        {done}/{total}
      </span>
    </div>
  );
}

function CourierRow({ courier, onOpen, index }) {
  const items = courier.products || [];
  const done = courier.data_entry_done_count || 0;
  const total = items.length;
  const pending = total - done;
  return (
    <div
      data-testid={`de-row-${courier.courier_number}`}
      className="grid grid-cols-[1fr_140px_180px_120px_120px] gap-3 items-center px-4 py-2.5 border-t border-neutral-100 hover:bg-neutral-50/60 transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-neutral-400">
            #{index + 1}
          </span>
          <span className="text-sm font-mono font-semibold text-neutral-900">
            {courier.courier_number}
          </span>
          {courier.courier_company && (
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 truncate">
              <Truck className="w-3 h-3" /> {courier.courier_company}
            </span>
          )}
        </div>
        {courier.sent_to_data_entry_at && (
          <div className="text-[11px] text-neutral-400 mt-0.5">
            sent {new Date(courier.sent_to_data_entry_at).toLocaleString()}
          </div>
        )}
      </div>
      <div className="text-[12px] text-neutral-700">
        <span className="font-semibold">{courier.num_packages}</span>{" "}
        <span className="text-neutral-400">pkgs</span>
      </div>
      <div>
        <ProgressBar done={done} total={total} />
      </div>
      <div>
        {pending > 0 ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3" /> {pending} pending
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> ready
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onOpen(courier)}
        data-testid={`de-open-${courier.courier_number}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 justify-self-end"
      >
        Enter data <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function CourierItemsPanel({ courier, onEditItem, onClose }) {
  const items = courier?.products || [];
  if (!courier) return null;
  const done = courier.data_entry_done_count || 0;
  const total = items.length;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      data-testid="de-courier-panel"
    >
      <div
        className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[94vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Data entry · items
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <div className="text-base font-semibold text-neutral-900 font-mono">
                {courier.courier_number}
              </div>
              {courier.courier_company && (
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                  <Truck className="w-3 h-3" /> {courier.courier_company}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
                <Boxes className="w-3 h-3" /> {total} items
              </span>
              <ProgressBar done={done} total={total} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
            data-testid="de-courier-panel-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items table */}
        <div className="flex-1 overflow-auto">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-neutral-400">
              No items in this courier
            </div>
          ) : (
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-14">Status</th>
                  <th className="text-left px-3 py-2 font-medium w-14">Photo</th>
                  <th className="text-left px-3 py-2 font-medium">Item</th>
                  <th className="text-left px-3 py-2 font-medium">Supplier</th>
                  <th className="text-left px-3 py-2 font-medium">Invoice / PO</th>
                  <th className="text-left px-3 py-2 font-medium">HSN / Unit</th>
                  <th className="text-right px-3 py-2 font-medium w-24">Cost</th>
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
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
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
                        {p.batch_number && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                            Batch {p.batch_number}
                          </span>
                        )}
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
                      ) : p.po_number ? (
                        <div className="text-sm font-mono text-neutral-500">
                          PO {p.po_number}
                        </div>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-neutral-700">
                      {p.hsn_code || p.unit ? (
                        <>
                          <div className="text-sm font-mono">
                            {p.hsn_code || "—"}
                          </div>
                          {p.unit && (
                            <div className="text-[11px] text-neutral-500">
                              {p.unit}
                            </div>
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
                      {p.gst_percent != null ? `${p.gst_percent}%` : <span className="text-neutral-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-3 border-t border-neutral-100 bg-neutral-50/60 text-[11px] text-neutral-500">
          Tap any row to enter purchase details. The courier disappears from this list once every item is marked done.
        </div>
      </div>
    </div>
  );
}

export default function DataEntryDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openedCourier, setOpenedCourier] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // {courier, item}
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [sortNewest, setSortNewest] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/data-entry/couriers`, {
        headers: authHeaders(),
      });
      setCouriers(res.data || []);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const applyUpdate = (updated) => {
    // If the courier became ready_for_verification, remove from list
    if (updated.ready_for_verification) {
      setCouriers((arr) => arr.filter((c) => c.id !== updated.id));
      if (openedCourier?.id === updated.id) {
        setOpenedCourier(null);
        setEditingItem(null);
      }
      return;
    }
    setCouriers((arr) => arr.map((c) => (c.id === updated.id ? updated : c)));
    if (openedCourier?.id === updated.id) setOpenedCourier(updated);
    if (editingItem?.courier?.id === updated.id) {
      const refreshed = (updated.products || []).find(
        (p) => p.id === editingItem.item.id
      );
      setEditingItem(refreshed ? { courier: updated, item: refreshed } : null);
    }
  };

  const filtered = useMemo(() => {
    let list = couriers;
    if (showOnlyPending) {
      list = list.filter(
        (c) => (c.data_entry_done_count || 0) < (c.products?.length || 0)
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          (c.courier_number || "").toLowerCase().includes(q) ||
          (c.courier_company || "").toLowerCase().includes(q) ||
          (c.products || []).some(
            (p) =>
              (p.name || "").toLowerCase().includes(q) ||
              (p.code || "").toLowerCase().includes(q) ||
              (p.supplier || "").toLowerCase().includes(q) ||
              (p.invoice_number || "").toLowerCase().includes(q)
          )
      );
    }
    list = [...list].sort((a, b) => {
      const da = new Date(a.sent_to_data_entry_at || a.created_at).getTime();
      const db = new Date(b.sent_to_data_entry_at || b.created_at).getTime();
      return sortNewest ? db - da : da - db;
    });
    return list;
  }, [couriers, search, showOnlyPending, sortNewest]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, showOnlyPending, sortNewest]);

  const stats = useMemo(() => {
    let totalItems = 0;
    let doneItems = 0;
    couriers.forEach((c) => {
      totalItems += c.products?.length || 0;
      doneItems += c.data_entry_done_count || 0;
    });
    return {
      totalCouriers: couriers.length,
      totalItems,
      doneItems,
      pendingItems: totalItems - doneItems,
    };
  }, [couriers]);

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto pb-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
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
                Hi {user?.full_name?.split(" ")[0] || "there"}, all couriers
                awaiting purchase / tax entry are listed below.
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

        {/* Toolbar */}
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by courier #, company, item, supplier, invoice…"
                data-testid="de-search"
                className="pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm w-full focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyPending}
                onChange={(e) => setShowOnlyPending(e.target.checked)}
                data-testid="de-only-pending"
                className="rounded border-neutral-300"
              />
              Only with pending items
            </label>
            <button
              type="button"
              onClick={() => setSortNewest((v) => !v)}
              data-testid="de-sort-toggle"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              {sortNewest ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
              {sortNewest ? "Newest first" : "Oldest first"}
            </button>
            <span className="text-[11px] text-neutral-500 ml-auto">
              Showing {pageItems.length} of {filtered.length}
            </span>
          </div>

          {/* Column header */}
          <div className="grid grid-cols-[1fr_140px_180px_120px_120px] gap-3 items-center px-4 py-2 bg-neutral-50/60 border-b border-neutral-100 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
            <div>Courier</div>
            <div>Packages</div>
            <div>DE progress</div>
            <div>State</div>
            <div className="justify-self-end">Action</div>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center text-neutral-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-lg bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="text-sm text-neutral-700 font-medium">
                {couriers.length === 0
                  ? "No couriers waiting for data entry"
                  : "No couriers match your filters"}
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                {couriers.length === 0
                  ? "Couriers will appear here after the Owner forwards them."
                  : "Try clearing the search or unticking 'Only with pending items'."}
              </div>
            </div>
          ) : (
            <>
              <div>
                {pageItems.map((c, i) => (
                  <CourierRow
                    key={c.id}
                    courier={c}
                    index={(safePage - 1) * PAGE_SIZE + i}
                    onOpen={setOpenedCourier}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-neutral-100 bg-neutral-50/60">
                  <div className="text-[11px] text-neutral-500">
                    Page {safePage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      data-testid="de-prev-page"
                      className="px-2.5 py-1 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-white disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      data-testid="de-next-page"
                      className="px-2.5 py-1 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-white disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Per-courier items panel */}
      {openedCourier && (
        <CourierItemsPanel
          courier={openedCourier}
          onClose={() => setOpenedCourier(null)}
          onEditItem={(item) =>
            setEditingItem({ courier: openedCourier, item })
          }
        />
      )}

      {/* Item-level data entry modal */}
      <DataEntryItemModal
        courier={editingItem?.courier || null}
        item={editingItem?.item || null}
        onClose={() => setEditingItem(null)}
        onUpdated={applyUpdate}
      />
    </DashboardShell>
  );
}
