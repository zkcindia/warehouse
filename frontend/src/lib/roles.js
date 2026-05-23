import { Crown, Warehouse, ClipboardEdit, ShieldCheck } from "lucide-react";

export const ROLES = [
  {
    key: "owner",
    slug: "owner",
    label: "Owner",
    description: "Full control. Manage staff and oversee operations.",
    icon: Crown,
    accent: "bg-neutral-900 text-white",
  },
  {
    key: "warehouse",
    slug: "warehouse",
    label: "Warehouse Staff",
    description: "Receive and handle products in the warehouse.",
    icon: Warehouse,
    accent: "bg-blue-600 text-white",
  },
  {
    key: "data_entry",
    slug: "data-entry",
    label: "Data Entry Staff",
    description: "Record incoming product information into the system.",
    icon: ClipboardEdit,
    accent: "bg-emerald-600 text-white",
  },
  {
    key: "verification",
    slug: "verification",
    label: "Verification Staff",
    description: "Verify product details and approve entries.",
    icon: ShieldCheck,
    accent: "bg-amber-600 text-white",
  },
];

export const roleBySlug = (slug) => ROLES.find((r) => r.slug === slug);
export const roleByKey = (key) => ROLES.find((r) => r.key === key);
