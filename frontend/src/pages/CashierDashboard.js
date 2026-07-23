import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import {
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
  X,
  RefreshCw,
  Plus,
  History,
  Pencil,
  Trash2,
  Save,
  ListChecks,

  AlertTriangle,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Paperclip,

  UserX,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import RejectedCourierEditModal from "@/components/RejectedCourierEditModal";

const MAX_IMG_BYTES = 4 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per attached doc/pdf
const ALLOWED_FILE_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "text/plain",
  "text/csv",
];
const ALLOWED_FILE_EXTS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
];

function isAllowedFile(file) {
  if (!file) return false;
  if (ALLOWED_FILE_MIMES.includes(file.type)) return true;
  const name = (file.name || "").toLowerCase();
  return ALLOWED_FILE_EXTS.some((ext) => name.endsWith(ext));
}

function fileIconFor(mime, name) {
  const n = (name || "").toLowerCase();
  if ((mime && mime.includes("pdf")) || n.endsWith(".pdf")) return FileText;
  if (
    (mime && (mime.includes("spreadsheet") || mime.includes("excel"))) ||
    n.endsWith(".xls") ||
    n.endsWith(".xlsx") ||
    n.endsWith(".csv")
  )
    return FileSpreadsheet;
  return FileIcon;
}

function formatBytes(n) {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

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
const PAYMENT_ICON = {
  upi: Smartphone,
  card: CreditCard,
  cash: Wallet,
  none: CircleAlert,
};

const blankEntry = () => ({
  uid: Math.random().toString(36).slice(2),
  courier_company: "",
  quantity: "", // Keep this for your UI
  num_packages: "", // Add this back for backend
  photo: null,
  package_photo: null,
  courier_charge: "",
  vehicle: "",
  payment_mode: "none",
  handled_by: "",
  attachments: [],
  transport_charge: "",
  transport_vehicle: "",
  transport_payment_mode: "none",
    multiple_images: [],
});

export default function CashierDashboard() {
  const { user, API, authHeaders } = useAuth();
  const fileRef = useRef(null);
  const packagePhotoRef = useRef(null);
  const docRef = useRef(null);
  const [entry, setEntry] = useState(blankEntry());
  const [editingUid, setEditingUid] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [savedSession, setSavedSession] = useState([]);
  const [warehouseRejected, setWarehouseRejected] = useState([]);
  const [ownerRejected, setOwnerRejected] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [editingRejected, setEditingRejected] = useState(null);

  // Load warehouse rejected couriers
  const loadWarehouseRejected = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/couriers/rejected`, {
        headers: authHeaders(),
      });
      setWarehouseRejected(res.data || []);
    } catch (e) {
      // silent
    }
  }, [API, authHeaders]);

  // Load owner rejected couriers
  const loadOwnerRejected = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/cashier/owner-rejected-couriers`, {
        headers: authHeaders(),
      });
      setOwnerRejected(res.data || []);
    } catch (e) {
      // silent
    }
  }, [API, authHeaders]);

  useEffect(() => {
    loadWarehouseRejected();
    loadOwnerRejected();
  }, [loadWarehouseRejected, loadOwnerRejected]);

  const resolveWarehouseRejection = async (c) => {
    setResolvingId(c.id);
    try {
      await axios.patch(
        `${API}/couriers/${c.id}/resolve`,
        {},
        { headers: authHeaders() }
      );
      toast.success(`${c.courier_number} marked as resolved, resubmitted to Owner`);
      setWarehouseRejected((arr) => arr.filter((r) => r.id !== c.id));
      // Refresh owner rejected list as well
      loadOwnerRejected();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to resolve");
    } finally {
      setResolvingId(null);
    }
  };

  const resolveOwnerRejection = async (c) => {
    setResolvingId(c.id);
    try {
      await axios.patch(
        `${API}/couriers/${c.id}/resolve`,
        {},
        { headers: authHeaders() }
      );
      toast.success(`${c.courier_number} marked as resolved, resubmitted to Owner`);
      setOwnerRejected((arr) => arr.filter((r) => r.id !== c.id));
      // Refresh warehouse rejected list as well
      loadWarehouseRejected();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to resolve");
    } finally {
      setResolvingId(null);
    }
  };

  const isEditing = !!editingUid;
  const update = (patch) => setEntry((e) => ({ ...e, ...patch }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return toast.error("Choose an image file.");
    if (file.size > MAX_IMG_BYTES)
      return toast.error("Image must be under 4MB.");
    try {
      update({ photo: await fileToDataURL(file) });
    } catch {
      toast.error("Failed to read image.");
    }
  };

  const handlePackagePhoto = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return toast.error("Choose image file");
    }

    if (file.size > MAX_IMG_BYTES) {
      return toast.error("Image must be under 4MB");
    }

    try {
      update({
        package_photo: await fileToDataURL(file),
      });
    } catch {
      toast.error("Failed to read image");
    }
  };

  const handleDocs = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const valid = [];
    for (const file of files) {
      if (!isAllowedFile(file)) {
        toast.error(
          `${file.name}: unsupported file type (use PDF, DOC, XLS, PPT, TXT, CSV).`
        );
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name}: file is too large (max 10MB).`);
        continue;
      }
      try {
        const dataUrl = await fileToDataURL(file);
        valid.push({
          uid: Math.random().toString(36).slice(2),
          name: file.name,
          mime_type: file.type || "",
          size: file.size,
          data: dataUrl,
        });
      } catch {
        toast.error(`${file.name}: failed to read file.`);
      }
    }
    if (valid.length) {
      setEntry((eState) => ({
        ...eState,
        attachments: [...(eState.attachments || []), ...valid],
      }));
      toast.success(
        `${valid.length} file${valid.length === 1 ? "" : "s"} attached`
      );
    }
    if (docRef.current) docRef.current.value = "";
  };

  const removeAttachment = (uid) => {
    setEntry((eState) => ({
      ...eState,
      attachments: (eState.attachments || []).filter((a) => a.uid !== uid),
    }));
  };

const resetCard = () => {
  setEntry(blankEntry());
  setEditingUid(null);
  if (fileRef.current) fileRef.current.value = "";
  if (docRef.current) docRef.current.value = "";
  if (packagePhotoRef.current) packagePhotoRef.current.value = "";
  // Reset the multiple image input too
  const multiInput = document.getElementById('multiImageUpload');
  if (multiInput) multiInput.value = "";
};

  const validate = (e) => {
    if (!e.num_packages || Number(e.num_packages) < 1)
      return "Enter number of packages.";
    return null;
  };

  const addOrUpdateDraft = (e) => {
    e?.preventDefault?.();
    const err = validate(entry);
    if (err) return toast.error(err);

    if (isEditing) {
      setDrafts((arr) =>
        arr.map((d) =>
          d.uid === editingUid ? { ...entry, uid: editingUid } : d
        )
      );
      toast.success("Draft updated");
    } else {
      setDrafts((arr) => [...arr, { ...entry, uid: entry.uid }]);
      toast.success("Added to preview");
    }
    resetCard();
  };

  const editDraft = (d) => {
    setEntry({ ...d });
    setEditingUid(d.uid);
    if (fileRef.current) fileRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeDraft = (uid) => {
    setDrafts((arr) => arr.filter((d) => d.uid !== uid));
    if (editingUid === uid) resetCard();
  };

  const submitAll = async () => {
    if (drafts.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        handled_by: null, // per-draft handled_by inside entries
        entries: drafts.map((d) => {
          const isPaid = d.payment_mode !== "none";
          return {
            courier_company: d.courier_company.trim() || null,
            num_packages: Number(d.num_packages),
            slip_photo: d.photo || null,
            package_photo: d.package_photo || null,
            products: [],
            payment_made: isPaid,
            payment_mode: isPaid ? d.payment_mode : null,
            attachments: (d.attachments || []).map((a) => ({
              name: a.name,
              mime_type: a.mime_type || null,
              size: a.size ?? null,
              data: a.data,
            })),
          };
        }),
      };
      // Use first non-empty handled_by as batch-level (since backend takes one)
      const firstHandled = drafts
        .find((d) => d.handled_by?.trim())
        ?.handled_by?.trim();
      if (firstHandled) payload.handled_by = firstHandled;

      const res = await axios.post(`${API}/couriers/batch`, payload, {
        headers: authHeaders(),
      });
      const created = res.data?.created || [];
      setSavedSession((arr) => [...created.reverse(), ...arr]);
      setDrafts([]);
      resetCard();
      toast.success(
        `${created.length} courier${created.length === 1 ? "" : "s"} sent to Owner for approval`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save couriers");
    } finally {
      setSubmitting(false);
    }
  };

  // Add this function for handling multiple images
const handleMultipleImages = async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  
  const validImages = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      toast.error(`${file.name}: not an image file.`);
      continue;
    }
    if (file.size > MAX_IMG_BYTES) {
      toast.error(`${file.name}: image must be under 4MB.`);
      continue;
    }
    try {
      const dataUrl = await fileToDataURL(file);
      validImages.push({
        name: file.name,
        data: dataUrl,
        size: file.size,
      });
    } catch {
      toast.error(`${file.name}: failed to read image.`);
    }
  }
  
  if (validImages.length) {
    setEntry((e) => ({
      ...e,
      multiple_images: [...(e.multiple_images || []), ...validImages],
    }));
    toast.success(`${validImages.length} image${validImages.length === 1 ? '' : 's'} uploaded`);
  }
  
  // Reset the input
  e.target.value = '';
};

// Add this function to remove a multiple image
const removeMultipleImage = (index) => {
  setEntry((e) => ({
    ...e,
    multiple_images: (e.multiple_images || []).filter((_, i) => i !== index),
  }));
};

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto pb-10 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400">
              Cashier
            </div>
            <div
              className="text-2xl font-semibold tracking-tight text-neutral-900"
              data-testid="welcome-heading"
            >
              Courier entries
            </div>
            <div className="text-sm text-neutral-500">
              Hi {user?.full_name?.split(" ")[0] || "there"}, add to preview
              first. After saving, couriers go to Owner for approval.
            </div>
          </div>
        </div>

        {/* Owner Rejected couriers - needs attention (higher priority) */}
        {ownerRejected.length > 0 && (
          <div className="bg-white border border-orange-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    Rejected by Owner · Needs Your Attention
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {ownerRejected.length} courier
                    {ownerRejected.length === 1 ? "" : "s"} rejected by Owner · fix issues and resubmit
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={loadOwnerRejected}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-neutral-500 hover:bg-neutral-100"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="space-y-2">
              {ownerRejected.map((c) => (
                <div
                  key={c.id}
                  data-testid={`owner-rejected-${c.courier_number}`}
                  className="flex items-start gap-3 p-3 border border-orange-200 bg-orange-50/40 rounded-xl"
                >
                  {c.slip_photo ? (
                    <img
                      src={c.slip_photo}
                      alt="slip"
                      className="w-12 h-12 rounded-lg object-cover border border-orange-100 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white border border-orange-100 text-orange-300 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-semibold text-neutral-900">
                        {c.courier_number}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 text-orange-700">
                        <UserX className="w-3 h-3" /> Rejected by Owner
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
                        <Package className="w-3 h-3" /> {c.num_packages} pkgs
                      </span>
                      {c.courier_company && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                          <Truck className="w-3 h-3" /> {c.courier_company}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[12px] text-orange-800">
                      <span className="font-medium">Reason: </span>
                      {c.owner_rejected_reason || (
                        <span className="text-orange-500/80 italic">
                          No reason provided
                        </span>
                      )}
                    </div>
                    {c.owner_rejected_by && (
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Rejected by Owner: {c.owner_rejected_by}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingRejected(c)}
                      data-testid={`edit-resend-owner-${c.courier_number}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit &amp; resend
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveOwnerRejection(c)}
                      disabled={resolvingId === c.id}
                      data-testid={`resolve-owner-${c.courier_number}`}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                      title="Resubmit without changes"
                    >
                      {resolvingId === c.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      Resubmit without changes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warehouse Rejected couriers */}
        {warehouseRejected.length > 0 && (
          <div className="bg-white border border-red-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    Rejected by Warehouse · needs your attention
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {warehouseRejected.length} courier
                    {warehouseRejected.length === 1 ? "" : "s"} sent back · check the
                    reason and mark resolved once fixed.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={loadWarehouseRejected}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-neutral-500 hover:bg-neutral-100"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="space-y-2">
              {warehouseRejected.map((c) => (
                <div
                  key={c.id}
                  data-testid={`warehouse-rejected-${c.courier_number}`}
                  className="flex items-start gap-3 p-3 border border-red-200 bg-red-50/40 rounded-xl"
                >
                  {c.slip_photo ? (
                    <img
                      src={c.slip_photo}
                      alt="slip"
                      className="w-12 h-12 rounded-lg object-cover border border-red-100 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white border border-red-100 text-red-300 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-semibold text-neutral-900">
                        {c.courier_number}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
                        <Package className="w-3 h-3" /> {c.num_packages} pkgs
                      </span>
                      {c.courier_company && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                          <Truck className="w-3 h-3" /> {c.courier_company}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[12px] text-red-800">
                      <span className="font-medium">Reason: </span>
                      {c.rejected_reason || (
                        <span className="text-red-500/80 italic">
                          No reason provided
                        </span>
                      )}
                    </div>
                    {c.rejected_by && (
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        Rejected by Warehouse: {c.rejected_by}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingRejected(c)}
                      data-testid={`edit-resend-warehouse-${c.courier_number}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit &amp; resend
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveWarehouseRejection(c)}
                      disabled={resolvingId === c.id}
                      data-testid={`resolve-warehouse-${c.courier_number}`}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                      title="Resubmit without changes"
                    >
                      {resolvingId === c.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      Resubmit without changes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved this session */}
        {savedSession.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-900">
                  Saved this session
                </div>
                <div className="text-[11px] text-neutral-500">
                  {savedSession.length} courier
                  {savedSession.length === 1 ? "" : "s"} saved · sent to Owner for approval
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {savedSession.map((c) => (
                <div
                  key={c.id}
                  data-testid={`saved-${c.courier_number}`}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50"
                >
                  <div className="w-8 h-8 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CircleCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-mono font-semibold text-neutral-900 truncate">
                      {c.courier_number}
                    </div>
                    <div className="text-[11px] text-neutral-600 truncate">
                      {c.num_packages} pkgs
                      {c.courier_company ? ` · ${c.courier_company}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form card */}
        <form onSubmit={addOrUpdateDraft} className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100 fade-in overflow-hidden relative">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-transparent to-blue-50/40 pointer-events-none" />
            
            <div className="relative flex items-center justify-between px-5 py-4 bg-white rounded-t-2xl border-b border-neutral-100">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isEditing 
                      ? "bg-amber-100 text-amber-600 ring-1 ring-amber-200" 
                      : "bg-purple-100 text-purple-600 ring-1 ring-purple-200"
                  }`}
                >
                  {isEditing ? (
                    <Pencil className="w-5 h-5" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-neutral-900">
                    {isEditing ? "Editing draft" : "New courier entry"}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {isEditing
                      ? "Update and click Update preview to apply changes."
                      : "Fill details, add to preview, edit before saving."}
                  </div>
                </div>
              </div>
              {(entry.courier_company ||
                entry.num_packages ||
                entry.photo ||
                isEditing) && (
                <button
                  type="button"
                  onClick={resetCard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                  data-testid="cashier-reset-card"
                >
                  <X className="w-3.5 h-3.5" />
                  {isEditing ? "Cancel" : "Reset"}
                </button>
              )}
            </div>

            <div className="relative px-5 py-5 space-y-5">
              {/* Section 1 - Courier Info */}
              <input
                ref={packagePhotoRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePackagePhoto}
                className="hidden"
              />

              <input
                id="multiImageUpload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleMultipleImages}
                className="hidden"
              />

              {/* Row 1: Package Photo | No. of Packages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-neutral-400" />
                    Package Photo
                  </label>

                  <div
                    onClick={() => packagePhotoRef.current?.click()}
                    className="h-[48px] px-3 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center gap-2 cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all duration-200"
                  >
                    {entry.package_photo ? (
                      <>
                        <img
                          src={entry.package_photo}
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

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-neutral-400" />
                    No. of Packages
                  </label>

                  <input
                    type="number"
                    value={entry.num_packages}
                    onChange={(e) => update({ num_packages: e.target.value })}
                    placeholder="0"
                    className="h-[48px] w-full px-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Row 2: Transporter | Slip Photo | Transport Amount | Payment Mode */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-600">
                    Transporter
                  </label>
                  <input
                    value={entry.transport_vehicle}
                    onChange={(e) => update({ transport_vehicle: e.target.value })}
                    placeholder="Transporter"
                    className="h-[48px] w-full px-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                    Slip Photo
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="h-[48px] px-3 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 flex items-center gap-2 cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-all duration-200"
                  >
                    {entry.photo ? (
                      <img
                        src={entry.photo}
                        alt="slip"
                        className="w-8 h-8 rounded-lg object-cover shadow-sm"
                      />
                    ) : (
                      <Upload className="w-4 h-4 text-neutral-400" />
                    )}
                    <span className="text-xs text-neutral-400">
                      {entry.photo ? "Photo Added" : "Upload"}
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
                    value={entry.transport_charge}
                    onChange={(e) => update({ transport_charge: e.target.value })}
                    placeholder="₹ 0"
                    className="h-[48px] w-full px-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-600">
                    Payment Mode
                  </label>
                  <select
                    value={entry.transport_payment_mode}
                    onChange={(e) => update({ transport_payment_mode: e.target.value })}
                    className="h-[48px] w-full px-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all duration-200 cursor-pointer"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="none">Unpaid</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Delivery Charges | Delivery Type | Payment Mode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-600">
                    Delivery Charges
                  </label>
                  <input
                    type="number"
                    value={entry.courier_charge}
                    onChange={(e) => update({ courier_charge: e.target.value })}
                    placeholder="₹ 0"
                    className="h-[48px] w-full px-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-600">
                    Delivery Type
                  </label>
                  <select
                    value={entry.vehicle}
                    onChange={(e) => update({ vehicle: e.target.value })}
                    className="h-[48px] w-full px-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 cursor-pointer"
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
                    value={entry.payment_mode}
                    onChange={(e) => update({ payment_mode: e.target.value })}
                    className="h-[48px] w-full px-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 cursor-pointer"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="none">Unpaid</option>
                  </select>
                </div>
              </div>

              {/* Upload Images - Handled By ke upar */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600">
                  Upload Images
                </label>

                <div
                  onClick={() => document.getElementById("multiImageUpload")?.click()}
                  className="h-[48px] rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 flex items-center justify-center gap-2 cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-all duration-200"
                >
                  <Upload className="w-4 h-4 text-neutral-400" />
                  <span className="text-xs text-neutral-400">
                    Upload Images
                  </span>
                </div>

                {entry.multiple_images && entry.multiple_images.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {entry.multiple_images.map((img, idx) => (
                      <div key={idx} className="relative group/image">
                        <img
                          src={img.data}
                          alt={`upload-${idx}`}
                          className="w-10 h-10 rounded-lg object-cover border border-neutral-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeMultipleImage(idx)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover/image:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <span className="text-[10px] text-neutral-400 self-center">
                      {entry.multiple_images.length} image{entry.multiple_images.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Handled By */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600">
                  Handled By
                </label>
                <input
                  data-testid="courier-handled-by"
                  value={entry.handled_by}
                  onChange={(e) => update({ handled_by: e.target.value })}
                  placeholder="Handled By"
                  className="h-[48px] w-full px-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                data-testid="cashier-add-preview"
                className={`relative w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden group ${
                  isEditing
                    ? "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200"
                    : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200"
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Save className="w-4 h-4" /> Update preview
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Add to preview
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
            </div>
          </div>
        </form>

        {/* Drafts preview list */}
        {drafts.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <ListChecks className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900">
                    Preview · pending save
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {drafts.length} courier{drafts.length === 1 ? "" : "s"}{" "}
                    ready · edit any until you save
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {drafts.map((d, idx) => (
                <DraftPreviewCard
                  key={d.uid}
                  draft={d}
                  index={idx}
                  active={editingUid === d.uid}
                  onEdit={() => editDraft(d)}
                  onDelete={() => removeDraft(d.uid)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sticky submit-all */}
        {drafts.length > 0 && (
          <div className="sticky bottom-0 -mx-2 px-2 pb-2 pt-3 bg-gradient-to-t from-neutral-50 to-neutral-50/0">
            <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-3 shadow-sm">
              <div className="text-xs text-neutral-500">
                Ready to save{" "}
                <span className="font-semibold text-neutral-800">
                  {drafts.length}
                </span>{" "}
                courier{drafts.length === 1 ? "" : "s"}
              </div>
              <button
                type="button"
                onClick={submitAll}
                data-testid="submit-couriers"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Send to Owner for Approval
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      <RejectedCourierEditModal
        courier={editingRejected}
        onClose={() => setEditingRejected(null)}
        onResent={(updated) => {
          setWarehouseRejected((arr) => arr.filter((r) => r.id !== updated.id));
          setOwnerRejected((arr) => arr.filter((r) => r.id !== updated.id));
        }}
      />
    </DashboardShell>
  );
}

function DraftPreviewCard({ draft, index, active, onEdit, onDelete }) {
  const PayIcon = PAYMENT_ICON[draft.payment_mode] || CircleAlert;
  const isUnpaid = draft.payment_mode === "none";
  return (
    <div
      data-testid={`draft-${index}`}
      className={`border rounded-xl p-3 transition-colors ${
        active
          ? "border-amber-300 bg-amber-50/50"
          : "border-neutral-200 bg-white hover:border-neutral-300"
      }`}
    >
      <div className="flex items-start gap-3">
        {draft.photo ? (
          <img
            src={draft.photo}
            alt="slip"
            className="w-14 h-14 rounded-lg object-cover border border-neutral-100 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-neutral-50 border border-neutral-100 text-neutral-300 flex items-center justify-center shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-md bg-neutral-900 text-white text-[11px] font-bold">
              {index + 1}
            </span>
            <div className="text-sm font-semibold text-neutral-900 truncate">
              {draft.courier_company?.trim() || `Courier draft`}
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
              <Package className="w-3 h-3" /> {draft.num_packages || 0} pkgs
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                isUnpaid
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              <PayIcon className="w-3 h-3" />
              {PAYMENT_LABEL[draft.payment_mode]}
            </span>
            {(draft.attachments?.length || 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <Paperclip className="w-3 h-3" /> {draft.attachments.length}{" "}
                file
                {draft.attachments.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {draft.handled_by?.trim() && (
            <div className="text-[11px] text-neutral-500 mt-0.5">
              Handled by{" "}
              <span className="text-neutral-800">{draft.handled_by}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            data-testid={`draft-edit-${index}`}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${
              active
                ? "bg-amber-600 border-amber-600 text-white"
                : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <Pencil className="w-3.5 h-3.5" /> {active ? "Editing" : "Edit"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            data-testid={`draft-delete-${index}`}
            className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50"
            title="Delete draft"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}