// Shared definition of the per-courier warehouse checklist.
// Keep these keys in sync with backend (COURIER_CHECKLIST_KEYS in server.py).
export const COURIER_CHECKLIST = [
  {
    key: "master_carton",
    label: "Remove master carton",
    description: "Open the outer carton and remove packaging.",
  },
  {
    key: "label_check",
    label: "Label check",
    description: "Verify shipping & product labels are intact and correct.",
  },
  {
    key: "bills_check",
    label: "Bills check",
    description: "Match invoice / bill against package contents.",
  },
  {
    key: "quantity_verify",
    label: "Quantity verification",
    description: "Count items and match with declared quantity.",
  },
  {
    key: "damage_check",
    label: "Damage check",
    description: "Inspect for any visible damage to goods.",
  },
  {
    key: "photo_taken",
    label: "Photo of goods",
    description: "Take a photo of unpacked goods for records.",
  },
];

export const defaultChecklistState = () =>
  COURIER_CHECKLIST.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {});

export const checklistProgress = (state) => {
  const total = COURIER_CHECKLIST.length;
  if (!state) return { done: 0, total, complete: false };
  const done = COURIER_CHECKLIST.reduce(
    (n, item) => n + (state[item.key] ? 1 : 0),
    0
  );
  return { done, total, complete: done === total };
};
