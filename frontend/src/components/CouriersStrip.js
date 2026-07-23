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
  Package,
  Image as ImageIcon,
  Check,
  Lock,
  RotateCcw,
  X,
  XCircle,
  AlertTriangle,
  Paperclip,
  List,
  Image,
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
    reject: "bg-red-600 border border-red-600 text-white hover:bg-red-700",
    accepted:
      "bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default",
    complete: "bg-emerald-50 border border-emerald-200 text-emerald-700",
    sop: "bg-neutral-900 border border-neutral-900 text-white hover:bg-neutral-800",
    viewList: "bg-amber-600 border border-amber-600 text-white hover:bg-amber-700",
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

// Document Viewer Modal for List (With Rate / Without Rate)
function ListViewerModal({ courier, onClose }) {
  if (!courier) return null;

  const hasListText = !!courier.upload_list_text;
  const hasListImages = courier.upload_list_images && courier.upload_list_images.length > 0;
  const listType = courier.upload_list_type;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-amber-600 to-orange-600 text-white">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5" />
            <div>
              <div className="text-sm font-semibold">
                {listType === 'with_rate' ? 'List With Rate' : listType === 'without_rate' ? 'List Without Rate' : 'Uploaded List'}
              </div>
              <div className="text-xs text-amber-200">{courier.courier_number}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* List Text */}
          {hasListText && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">List Text</span>
              </div>
              <div className="bg-white rounded-lg p-4 text-sm text-neutral-700 whitespace-pre-wrap max-h-96 overflow-y-auto border border-blue-100">
                {courier.upload_list_text}
              </div>
            </div>
          )}

          {/* List Images */}
          {hasListImages && (
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Image className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-semibold text-purple-700">
                  Uploaded Images ({courier.upload_list_images.length})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {courier.upload_list_images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative border border-purple-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => window.open(img.photo, '_blank')}
                  >
                    <img
                      src={img.photo}
                      alt={img.name || `Image ${idx + 1}`}
                      className="w-full h-40 object-cover"
                    />
                    <div className="p-2 text-[10px] text-neutral-600 truncate bg-white/80">
                      {img.name || `Image ${idx + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Documents */}
          {!hasListText && !hasListImages && (
            <div className="text-center text-neutral-500 py-8">
              <Paperclip className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
              <p>No list documents have been uploaded by Owner yet.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 bg-neutral-50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CouriersStrip({ onCouriersChange }) {
  const { API, authHeaders } = useAuth();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [viewingList, setViewingList] = useState(null);

  // Modal states
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [checklistFor, setChecklistFor] = useState(null);
  const [itemsFor, setItemsFor] = useState(null);
  const [sopFor, setSopFor] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/warehouse/pending-couriers`, {
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

  const openReject = (c) => {
    setRejectFor(c);
    setRejectReason("");
  };

  const closeReject = () => {
    if (rejecting) return;
    setRejectFor(null);
    setRejectReason("");
  };

  const submitReject = async () => {
    if (!rejectFor) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Please provide a reason for rejection.");
      return;
    }
    setRejecting(true);
    try {
      const res = await axios.patch(
        `${API}/couriers/${rejectFor.id}/reject`,
        { reason },
        { headers: authHeaders() }
      );
      toast.success(`${rejectFor.courier_number} sent back to Cashier`);
      applyUpdate(res.data);
      setRejectFor(null);
      setRejectReason("");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to reject courier");
    } finally {
      setRejecting(false);
    }
  };

  // Check if courier has a list (with_rate or without_rate)
  const hasList = (c) => {
    return !!(c.upload_list_text || (c.upload_list_images && c.upload_list_images.length > 0));
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
            const showViewList = hasList(c);
            
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
                      {c.rejected && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                          <RotateCcw className="w-3 h-3" /> Rejected · sent back
                        </span>
                      )}
                      {c.sent_to_data_entry ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          <Lock className="w-3 h-3" /> In Data Entry
                        </span>
                      ) : c.sent_to_owner ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <Lock className="w-3 h-3" /> Sent to Owner
                        </span>
                      ) : null}
                      {showViewList && !accepted && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <Paperclip className="w-3 h-3" /> Has list
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
                    <>
                      {/* View List Button - Shows BEFORE Accept if list exists */}
                      {showViewList && (
                        <ActionBtn
                          icon={List}
                          label="View List"
                          onClick={() => setViewingList(c)}
                          variant="viewList"
                          testId={`row-viewlist-${c.courier_number}`}
                        />
                      )}
                      
                      <ActionBtn
                        icon={Check}
                        label="Accept"
                        onClick={() => handleAccept(c)}
                        loading={busyId === c.id}
                        variant="accept"
                        testId={`row-accept-${c.courier_number}`}
                      />
                      <ActionBtn
                        icon={XCircle}
                        label="Reject"
                        onClick={() => openReject(c)}
                        variant="reject"
                        testId={`row-reject-${c.courier_number}`}
                      />
                    </>
                  ) : (
                    <>
                      <ActionBtn
                        icon={Pencil}
                        label="Edit"
                        onClick={() => setEditing(c)}
                        disabled={c.sent_to_data_entry || c.sent_to_owner}
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
                        disabled={c.sent_to_data_entry || c.sent_to_owner}
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
                          disabled={c.sent_to_data_entry || c.sent_to_owner}
                          testId={`row-items-${c.courier_number}`}
                        />
                      )}
                      {checklistDone && hasItems && (
                        <ActionBtn
                          icon={FileText}
                          label={
                            c.sent_to_data_entry
                              ? "Locked"
                              : c.sent_to_owner
                              ? "Review (sent)"
                              : "Complete SOP"
                          }
                          onClick={() => setSopFor(c)}
                          variant={
                            c.sent_to_data_entry || c.sent_to_owner
                              ? "complete"
                              : "sop"
                          }
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

      {/* List Viewer Modal */}
      {viewingList && (
        <ListViewerModal
          courier={viewingList}
          onClose={() => setViewingList(null)}
        />
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

      {/* Initial-stage reject reason dialog */}
      {rejectFor && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4"
          onClick={closeReject}
          data-testid="reject-reason-dialog"
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b border-neutral-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-neutral-900">
                    Reject courier
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    <span className="font-mono">{rejectFor.courier_number}</span>{" "}
                    will be sent back to the Cashier for resolution.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={closeReject}
                disabled={rejecting}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md hover:bg-neutral-50"
                data-testid="reject-reason-close-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-xs font-medium text-neutral-700">
                Reason for rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="e.g. Slip photo unclear, package count mismatch, wrong courier company…"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none"
                disabled={rejecting}
                data-testid="reject-reason-textarea"
                autoFocus
              />
              <div className="text-[11px] text-neutral-500 flex items-start gap-1.5">
                <RotateCcw className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  The cashier will see this reason in their{" "}
                  <span className="font-medium text-neutral-700">
                    Rejected couriers
                  </span>{" "}
                  list and can fix &amp; resubmit it.
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-neutral-100 bg-neutral-50/40 rounded-b-2xl">
              <button
                type="button"
                onClick={closeReject}
                disabled={rejecting}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-700 hover:bg-white border border-transparent hover:border-neutral-200"
                data-testid="reject-reason-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReject}
                disabled={rejecting || !rejectReason.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="reject-reason-submit-btn"
              >
                {rejecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Send back to Cashier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}