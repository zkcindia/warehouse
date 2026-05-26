import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import CourierDetailsModal from "@/components/CourierDetailsModal";
import CourierChecklistModal from "@/components/CourierChecklistModal";
import AddInventoryItemDialog from "@/components/AddInventoryItemDialog";
import CourierSOPModal from "@/components/CourierSOPModal";
import { checklistProgress } from "@/lib/checklist";
import { toast } from "sonner";
import {
  Truck,
  Loader2,
  RefreshCw,
  Eye,
  Pencil,
  ClipboardCheck,
  PackagePlus,
  FileText,
  CheckCircle2,
  Package,
  Image as ImageIcon,
  Check,
  Lock,
} from "lucide-react";

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = "outline",
  loading = false,
  testId,
}) {
  const variants = {
    outline:
      "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50",
    primary: "bg-blue-600 border border-blue-600 text-white hover:bg-blue-700",
    accept: "bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700",
    accepted:
      "bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default",
    complete: "bg-emerald-50 border border-emerald-200 text-emerald-700",
    sop: "bg-neutral-900 border border-neutral-900 text-white hover:bg-neutral-800",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        variants[variant]
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      title={label}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function CouriersStrip({ onCouriersChange }) {
  const { API, authHeaders } = useAuth();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  // Modal states
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [checklistFor, setChecklistFor] = useState(null);
  const [itemsFor, setItemsFor] = useState(null);
  const [sopFor, setSopFor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/couriers`, {
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
    setCouriers((arr) => arr.map((c) => (c.id === updated.id ? updated : c)));
    onCouriersChange?.();
  };

  const handleAccept = async (c) => {
    setBusyId(c.id);
    try {
      const res = await axios.patch(
        `${API}/couriers/${c.id}/accept`,
        { accepted: true },
        { headers: authHeaders() }
      );
      toast.success(`${c.courier_number} accepted`);
      applyUpdate(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to accept");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-semibold text-neutral-900">
              Couriers from cashier
            </div>
            <div className="text-xs text-neutral-500">
              Accept a courier first → checklist → items → SOP review
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
          data-testid="couriers-refresh-btn"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-8 flex items-center justify-center text-neutral-400 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading couriers…
        </div>
      ) : couriers.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-neutral-200 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-2">
            <Truck className="w-5 h-5" />
          </div>
          <div className="text-sm text-neutral-600 font-medium">
            No couriers yet
          </div>
          <div className="text-xs text-neutral-400 mt-0.5">
            When Cashier logs a courier, it will show here.
          </div>
        </div>
      ) : (
        <div className="border border-neutral-100 rounded-xl divide-y divide-neutral-100 overflow-hidden">
          {couriers.map((c) => {
            const cp = checklistProgress(c.checklist);
            const accepted = !!c.accepted;
            const checklistDone = cp.complete;
            const hasItems = (c.products?.length || 0) > 0;
            const photo = c.slip_photo || c.package_photo;
            return (
              <div
                key={c.id}
                data-testid={`courier-row-${c.courier_number}`}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  accepted ? "bg-white" : "bg-neutral-50/40"
                } hover:bg-neutral-50`}
              >
                {/* Left: photo + id + quantity */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {photo ? (
                    <img
                      src={photo}
                      alt={c.courier_number}
                      className="w-12 h-12 rounded-lg object-cover border border-neutral-100 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-neutral-50 border border-neutral-100 text-neutral-300 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-semibold text-neutral-900">
                        {c.courier_number}
                      </span>
                      {accepted && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" /> Accepted
                        </span>
                      )}
                      {c.sent_to_data_entry && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          <Lock className="w-3 h-3" /> Sent to DE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[12px] text-neutral-500">
                      <span className="inline-flex items-center gap-1">
                        <Package className="w-3 h-3" /> {c.num_packages} pkgs
                      </span>
                      {c.courier_company && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Truck className="w-3 h-3" /> {c.courier_company}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: progressive action buttons */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <ActionBtn
                    icon={Eye}
                    label="View"
                    onClick={() => setViewing(c)}
                    disabled={!accepted}
                    testId={`row-view-${c.courier_number}`}
                  />

                  {!accepted ? (
                    <ActionBtn
                      icon={Check}
                      label="Accept"
                      onClick={() => handleAccept(c)}
                      loading={busyId === c.id}
                      variant="accept"
                      testId={`row-accept-${c.courier_number}`}
                    />
                  ) : (
                    <>
                      <ActionBtn
                        icon={Pencil}
                        label="Edit"
                        onClick={() => setEditing(c)}
                        disabled={c.sent_to_data_entry}
                        testId={`row-edit-${c.courier_number}`}
                      />
                      <ActionBtn
                        icon={ClipboardCheck}
                        label={
                          checklistDone
                            ? "Checklist ✓"
                            : `Checklist ${cp.done}/${cp.total}`
                        }
                        onClick={() => setChecklistFor(c)}
                        variant={checklistDone ? "complete" : "primary"}
                        disabled={c.sent_to_data_entry}
                        testId={`row-checklist-${c.courier_number}`}
                      />
                      {checklistDone && (
                        <ActionBtn
                          icon={PackagePlus}
                          label={
                            hasItems
                              ? `Items (${c.products.length})`
                              : "Item list"
                          }
                          onClick={() => setItemsFor(c)}
                          variant={hasItems ? "complete" : "primary"}
                          disabled={c.sent_to_data_entry}
                          testId={`row-items-${c.courier_number}`}
                        />
                      )}
                      {checklistDone && hasItems && (
                        <ActionBtn
                          icon={FileText}
                          label="SOP"
                          onClick={() => setSopFor(c)}
                          variant="sop"
                          testId={`row-sop-${c.courier_number}`}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CourierDetailsModal
        courier={viewing}
        onClose={() => setViewing(null)}
        onUpdated={applyUpdate}
        onDeleted={(id) => {
          setCouriers((arr) => arr.filter((c) => c.id !== id));
          onCouriersChange?.();
        }}
        readOnly
      />
      <CourierDetailsModal
        courier={editing}
        onClose={() => setEditing(null)}
        onUpdated={applyUpdate}
        onDeleted={(id) => {
          setCouriers((arr) => arr.filter((c) => c.id !== id));
          onCouriersChange?.();
        }}
        initialEdit
      />
      <CourierChecklistModal
        courier={checklistFor}
        onClose={() => setChecklistFor(null)}
        onUpdated={applyUpdate}
        onNext={(updated) => {
          applyUpdate(updated);
          setChecklistFor(null);
          setItemsFor(updated);
        }}
      />
      <AddInventoryItemDialog
        open={!!itemsFor}
        couriers={itemsFor ? [itemsFor] : []}
        lockToCourierId={itemsFor?.id || null}
        onClose={() => setItemsFor(null)}
        onAdded={applyUpdate}
      />
      <CourierSOPModal
        courier={sopFor}
        onClose={() => setSopFor(null)}
        onUpdated={applyUpdate}
      />
    </div>
  );
}
