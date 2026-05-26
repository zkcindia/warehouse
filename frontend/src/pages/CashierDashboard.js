import React, { useRef, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

const MAX_IMG_BYTES = 4 * 1024 * 1024;

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
  num_packages: "",
  photo: null,
  payment_mode: "none",
  handled_by: "",
});

export default function CashierDashboard() {
  const { user, API, authHeaders } = useAuth();
  const fileRef = useRef(null);
  const [entry, setEntry] = useState(blankEntry());
  const [editingUid, setEditingUid] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [savedSession, setSavedSession] = useState([]);

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

  const resetCard = () => {
    setEntry(blankEntry());
    setEditingUid(null);
    if (fileRef.current) fileRef.current.value = "";
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
        arr.map((d) => (d.uid === editingUid ? { ...entry, uid: editingUid } : d))
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
            products: [],
            payment_made: isPaid,
            payment_mode: isPaid ? d.payment_mode : null,
          };
        }),
      };
      // Use first non-empty handled_by as batch-level (since backend takes one)
      const firstHandled = drafts.find((d) => d.handled_by?.trim())?.handled_by?.trim();
      if (firstHandled) payload.handled_by = firstHandled;

      const res = await axios.post(`${API}/couriers/batch`, payload, {
        headers: authHeaders(),
      });
      const created = res.data?.created || [];
      setSavedSession((arr) => [...created.reverse(), ...arr]);
      setDrafts([]);
      resetCard();
      toast.success(`${created.length} courier${created.length === 1 ? "" : "s"} saved`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save couriers");
    } finally {
      setSubmitting(false);
    }
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
              first. You can edit or delete drafts until you save them.
            </div>
          </div>
        </div>

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
                  {savedSession.length === 1 ? "" : "s"} saved · newest first
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
          <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100 fade-in">
            <div className="flex items-center justify-between px-5 py-3 bg-neutral-50/60 rounded-t-2xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white ${
                    isEditing ? "bg-amber-600" : "bg-purple-600"
                  }`}
                >
                  {isEditing ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-neutral-900">
                    {isEditing ? "Editing draft" : "New courier"}
                  </div>
                  <div className="text-[11px] text-neutral-500">
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
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-neutral-500 hover:bg-neutral-100"
                  data-testid="cashier-reset-card"
                >
                  <RefreshCw className="w-3.5 h-3.5" />{" "}
                  {isEditing ? "Cancel edit" : "Reset card"}
                </button>
              )}
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Courier company{" "}
                    <span className="text-neutral-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    data-testid="courier-company-0"
                    value={entry.courier_company}
                    onChange={(e) =>
                      update({ courier_company: e.target.value })
                    }
                    placeholder="e.g. DTDC, BlueDart, Delhivery"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-600 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> Number of packages
                  </label>
                  <input
                    data-testid="courier-packages-0"
                    type="number"
                    min="1"
                    value={entry.num_packages}
                    onChange={(e) => update({ num_packages: e.target.value })}
                    placeholder="e.g. 3"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600">
                  Slip / receipt photo{" "}
                  <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <div className="mt-1 flex items-center gap-3">
                  {entry.photo ? (
                    <div className="relative">
                      <img
                        src={entry.photo}
                        alt="slip"
                        className="w-20 h-20 object-cover rounded-xl border border-neutral-200"
                      />
                      <button
                        type="button"
                        onClick={() => update({ photo: null })}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-neutral-200 text-neutral-600 shadow flex items-center justify-center hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhoto}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    data-testid="slip-photo-0"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    <Upload className="w-3.5 h-3.5" />{" "}
                    {entry.photo ? "Replace" : "Upload"}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-neutral-600 mb-2">
                  Payment mode
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PAYMENT_OPTIONS.map((m) => {
                    const active = entry.payment_mode === m.key;
                    const isNone = m.key === "none";
                    return (
                      <button
                        key={m.key}
                        type="button"
                        data-testid={`courier-payment-0-${m.key}`}
                        onClick={() => update({ payment_mode: m.key })}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                          active
                            ? isNone
                              ? "border-amber-300 bg-amber-50 text-amber-800"
                              : "border-neutral-900 bg-white text-neutral-900"
                            : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                        }`}
                      >
                        <m.Icon className="w-4 h-4" /> {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600">
                  Handled by{" "}
                  <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <input
                  data-testid="courier-handled-by"
                  value={entry.handled_by}
                  onChange={(e) => update({ handled_by: e.target.value })}
                  placeholder="e.g. Biswajit"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <button
                type="submit"
                data-testid="cashier-add-preview"
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isEditing
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-neutral-900 text-white hover:bg-neutral-800"
                }`}
              >
                {isEditing ? (
                  <>
                    <Save className="w-4 h-4" /> Update preview
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Add to preview
                  </>
                )}
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
                    {drafts.length} courier{drafts.length === 1 ? "" : "s"} ready ·
                    edit any until you save
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
                    <Save className="w-4 h-4" /> Save all
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
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
