import { Crown, IndianRupee, Warehouse, ClipboardEdit, ShieldCheck } from "lucide-react";

export const ROLES = [

  //   {
  //   key: "purchase",
  //   slug: "purchase",
  //   label: "Purchase",
  //   description: "Full control. Oversee operations and inventory.",
  //   icon: Crown,
  //   accent: "bg-neutral-900 text-white",
  //   demoEmail: "Purchase@warehouse.com",
  //   demoPassword: "Purchase@123",
  // },
  
  {
    key: "owner",
    slug: "owner",
    label: "Owner",
    description: "Full control. Oversee operations and inventory.",
    icon: Crown,
    accent: "bg-neutral-900 text-white",
    demoEmail: "owner@warehouse.com",
    demoPassword: "Owner@123",
  },
  {
    key: "cashier",
    slug: "cashier",
    label: "Cashier",
    description: "Handle billing, payments and daily cash flow.",
    icon: IndianRupee,
    accent: "bg-purple-600 text-white",
    demoEmail: "cashier@warehouse.com",
    demoPassword: "Cashier@123",
  },
  {
    key: "warehouse",
    slug: "warehouse",
    label: "Warehouse Staff",
    description: "Receive and handle products in the warehouse.",
    icon: Warehouse,
    accent: "bg-blue-600 text-white",
    demoEmail: "warehouse@warehouse.com",
    demoPassword: "Warehouse@123",
  },
  {
    key: "data_entry",
    slug: "data-entry",
    label: "GRN Staff",
    description: "Record incoming product information into the system.",
    icon: ClipboardEdit,
    accent: "bg-emerald-600 text-white",
    demoEmail: "dataentry@warehouse.com",
    demoPassword: "DataEntry@123",
  },
  {
    key: "verification",
    slug: "verification",
    label: "Verification Staff",
    description: "Verify product details and approve entries.",
    icon: ShieldCheck,
    accent: "bg-amber-600 text-white",
    demoEmail: "verification@warehouse.com",
    demoPassword: "Verify@123",
  },
];

export const roleBySlug = (slug) => ROLES.find((r) => r.slug === slug);
export const roleByKey = (key) => ROLES.find((r) => r.key === key);
