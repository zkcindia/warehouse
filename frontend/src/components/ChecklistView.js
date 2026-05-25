import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Building2,
  Boxes,
  CheckSquare,
  Square,
  RotateCcw,
  Sparkles,
  Plus,
} from "lucide-react";

/**
 * ChecklistView - shows all products from the submitted batch as a verification checklist.
 * Local state only (no persistence). Used after warehouse submits stock to physically
 * verify each product was received.
 */
export default function ChecklistView({ batch, onBack, onAddMore }) {
  // Build a flat list of items: { parcelId, parcelNumber, company, productId, name, quantity }
  const items = useMemo(
    () =>
      (batch || []).flatMap((p) =>
        (p.products || []).map((pr) => ({
          key: `${p.id}::${pr.id}`,
          parcelNumber: p.parcel_number,
          company: p.company_name,
          paymentMade: p.payment_made,
          paymentMode: p.payment_mode,
          productName: pr.name,
          quantity: pr.quantity,
          productId: pr.id,
        }))
      ),
    [batch]
  );

  const [checked, setChecked] = useState({}); // { key: true }

  const toggle = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }));
  const markAll = () => setChecked(Object.fromEntries(items.map((i) => [i.key, true])));
  const clearAll = () => setChecked({});

  const total = items.length;
  const done = items.filter((i) => checked[i.key]).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const allDone = total > 0 && done === total;

  // Group by parcel for the visual grouping
  const groups = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      const k = i.parcelNumber;
      if (!map.has(k))
        map.set(k, {
          parcelNumber: i.parcelNumber,
          company: i.company,
          paymentMade: i.paymentMade,
          paymentMode: i.paymentMode,
          rows: [],
        });
      map.get(k).rows.push(i);
    });
    return Array.from(map.values());
  }, [items]);

  return (
    <div className="space-y-4 fade-in">
      {/* Header with progress */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              data-testid="checklist-back"
              className="w-9 h-9 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50"
              title="Back to details"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-400">Verification</div>
              <div className="text-lg font-semibold text-neutral-900">Stock checklist</div>
              <div className="text-xs text-neutral-500">
                Tick each product as you physically verify it.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="checklist-mark-all"
              onClick={markAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Mark all
            </button>
            <button
              type="button"
              data-testid="checklist-clear"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-neutral-500">
              <span className="font-semibold text-neutral-900">{done}</span> of{" "}
              <span className="font-semibold text-neutral-900">{total}</span> verified
            </span>
            <span className={`font-semibold ${allDone ? "text-emerald-700" : "text-neutral-700"}`}>
              {pct}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                allDone ? "bg-emerald-500" : "bg-neutral-900"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {allDone && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5" /> All products verified
            </div>
          )}
        </div>
      </div>

      {/* Per-parcel groups */}
      {groups.map((g) => {
        const groupDone = g.rows.every((r) => checked[r.key]);
        return (
          <div
            key={g.parcelNumber}
            data-testid={`checklist-group-${g.parcelNumber}`}
            className={`bg-white border rounded-2xl overflow-hidden ${
              groupDone ? "border-emerald-200" : "border-neutral-200"
            }`}
          >
            <div
              className={`px-5 py-3 border-b flex items-center justify-between gap-3 ${
                groupDone
                  ? "bg-emerald-50/60 border-emerald-100"
                  : "bg-neutral-50/60 border-neutral-100"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-semibold text-neutral-900 truncate">
                  {g.company || (
                    <span className="text-neutral-400 italic font-normal">No company</span>
                  )}
                </span>
                <span className="text-[11px] font-mono text-neutral-400">{g.parcelNumber}</span>
              </div>
              <div className="text-[11px] text-neutral-500">
                {g.rows.filter((r) => checked[r.key]).length}/{g.rows.length} verified
              </div>
            </div>
            <ul className="divide-y divide-neutral-100">
              {g.rows.map((r) => {
                const isChecked = !!checked[r.key];
                return (
                  <li
                    key={r.key}
                    data-testid={`checklist-row-${r.productId}`}
                    onClick={() => toggle(r.key)}
                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors select-none ${
                      isChecked
                        ? "bg-emerald-50/40 hover:bg-emerald-50/70"
                        : "hover:bg-neutral-50"
                    }`}
                  >
                    {/* Checkbox icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(r.key);
                      }}
                      className="shrink-0"
                      aria-label={isChecked ? "Mark as unverified" : "Mark as verified"}
                    >
                      {isChecked ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-neutral-300" />
                      )}
                    </button>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium truncate ${
                          isChecked
                            ? "text-neutral-500 line-through"
                            : "text-neutral-900"
                        }`}
                      >
                        {r.productName}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        ID: {r.productId.slice(0, 12)}…
                      </div>
                    </div>
                    {/* Qty pill */}
                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center justify-center min-w-[44px] h-7 px-2.5 rounded-full text-xs font-semibold ${
                          isChecked
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        ×{r.quantity}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white border border-neutral-200 rounded-2xl px-5 py-3">
        <div className="text-xs text-neutral-500">
          {allDone ? (
            <span className="text-emerald-700 font-medium inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verification complete.
            </span>
          ) : (
            <>
              <span className="font-semibold text-neutral-800">{total - done}</span> product
              {total - done === 1 ? "" : "s"} remaining
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back to details
          </button>
          <button
            type="button"
            data-testid="checklist-done"
            onClick={onAddMore}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
          >
            <Plus className="w-4 h-4" /> Add new stock
          </button>
        </div>
      </div>
    </div>
  );
}
