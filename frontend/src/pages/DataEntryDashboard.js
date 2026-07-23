import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ClipboardList,
  Loader2,
  RefreshCw,
  Truck,
  Package,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronRight,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  FileText,
  Paperclip,
  List,
  Eye,
  Image,
  Receipt,
  Tag,
  Download,
  IndianRupee,
  Hash,
  Building2,
  Calendar,
  User,
  CreditCard,
  Boxes,
  Layers,
  Grid,
  Clock,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import DataEntryTableModal from "@/components/dataentrypages/DataEntryTableModal";
import ProductDetailsModal from "@/components/dataentrypages/ProductDetailsModal";

const PAGE_SIZE = 25;
const PRODUCT_PAGE_SIZE = 20;

// StatTile Component
function StatTile({ icon: Icon, label, value, accent = "neutral" }) {
  const accents = {
    neutral: "bg-neutral-50 text-neutral-700 border-neutral-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${accents[accent]}`}>
      <div className="w-9 h-9 rounded-lg bg-white/70 border border-white flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-lg font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}

// ============= LIST VIEWER MODAL =============
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5" />
            <div>
              <div className="text-sm font-semibold">
                {listType === 'with_rate' ? 'List With Rate' : listType === 'without_rate' ? 'List Without Rate' : 'Uploaded List'}
              </div>
              <div className="text-xs text-blue-200">{courier.courier_number}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

// ============= INVOICE/CHALLAN VIEWER MODAL =============
function InvoiceViewerModal({ courier, onClose }) {
  if (!courier) return null;

  const downloadInvoice = async () => {
    if (!courier.invoice_photo) return;
    try {
      const response = await fetch(courier.invoice_photo);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = courier.invoice_name || `invoice_${courier.courier_number}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            <div>
              <div className="text-sm font-semibold">Uploaded Invoice / Challan</div>
              <div className="text-xs text-green-200">{courier.courier_number}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {courier.invoice_photo ? (
            <div>
              <div className="flex justify-end mb-3">
                <button
                  onClick={downloadInvoice}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Invoice
                </button>
              </div>
              <div className="flex justify-center">
                <img
                  src={courier.invoice_photo}
                  alt="Invoice"
                  className="max-w-full max-h-[70vh] rounded-lg border border-green-200 object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="text-center text-neutral-500 py-8">
              <Paperclip className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
              <p>No invoice uploaded yet.</p>
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

export default function DataEntryDashboard() {
  const { user, API, authHeaders } = useAuth();
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openedCourier, setOpenedCourier] = useState(null);
  const [viewingList, setViewingList] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [sortNewest, setSortNewest] = useState(true);
  const [page, setPage] = useState(1);

  // All Products View States
  const [allProducts, setAllProducts] = useState([]);
  const [allProductsLoading, setAllProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productFilterStatus, setProductFilterStatus] = useState("all");
  const [productSortBy, setProductSortBy] = useState("created_at");
  const [productSortOrder, setProductSortOrder] = useState("desc");
  const [productPage, setProductPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/data-entry/couriers`, { headers: authHeaders() });
      const filtered = (res.data || []).filter(c => 
        c.ready_for_verification !== true && c.status !== 'ready_for_verification'
      );
      setCouriers(filtered);
    } catch (e) {
      console.error("Failed to load couriers:", e);
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]);

  const loadAllProducts = useCallback(async () => {
    setAllProductsLoading(true);
    try {
      const res = await axios.get(`${API}/data-entry/products/all`, { headers: authHeaders() });
      if (res.data?.status && res.data?.data) {
        setAllProducts(res.data.data);
        toast.success(`Loaded ${res.data.data.length} products`);
      } else {
        toast.error("Failed to load products");
      }
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error(error?.response?.data?.detail || "Failed to load products");
    } finally {
      setAllProductsLoading(false);
    }
  }, [API, authHeaders]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (showAllProducts) loadAllProducts(); }, [showAllProducts, loadAllProducts]);

  const applyUpdate = (updated) => {
    if (updated.ready_for_verification === true || updated.status === 'ready_for_verification') {
      setCouriers((arr) => arr.filter((c) => c.id !== updated.id));
      if (openedCourier?.id === updated.id) setOpenedCourier(null);
      toast.success(`Courier ${updated.courier_number} moved to verification`);
      return;
    }
    setCouriers((arr) => arr.map((c) => (c.id === updated.id ? updated : c)));
    if (openedCourier?.id === updated.id) setOpenedCourier(updated);
  };

  const filtered = useMemo(() => {
    let list = couriers;
    if (showOnlyPending) {
      list = list.filter((c) => (c.data_entry_done_count || 0) < (c.products?.length || 0));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        (c.courier_number || "").toLowerCase().includes(q) ||
        (c.courier_company || "").toLowerCase().includes(q) ||
        (c.products || []).some((p) => (p.name || "").toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => {
      const da = new Date(a.sent_to_data_entry_at || a.created_at).getTime();
      const db = new Date(b.sent_to_data_entry_at || b.created_at).getTime();
      return sortNewest ? db - da : da - db;
    });
    return list;
  }, [couriers, search, showOnlyPending, sortNewest]);

  const filteredProducts = useMemo(() => {
    let list = [...allProducts];
    const q = productSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.code || "").toLowerCase().includes(q) ||
        (p.supplier || "").toLowerCase().includes(q) ||
        (p.courier_number || "").toLowerCase().includes(q) ||
        (p.invoice_number || "").toLowerCase().includes(q)
      );
    }
    if (productFilterStatus === "pending") list = list.filter((p) => !p.data_entry_done);
    else if (productFilterStatus === "entry_done") list = list.filter((p) => p.data_entry_done && !p.verification_done);
    else if (productFilterStatus === "verified") list = list.filter((p) => p.verification_done);

    list.sort((a, b) => {
      let valA = a[productSortBy] || "";
      let valB = b[productSortBy] || "";
      if (productSortBy === "created_at" || productSortBy === "invoice_date" || productSortBy === "expiry_date") {
        valA = new Date(valA).getTime() || 0;
        valB = new Date(valB).getTime() || 0;
      }
      if (productSortBy === "quantity" || productSortBy === "price" || productSortBy === "total_invoice_amount") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }
      if (typeof valA === "string") { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
      if (valA < valB) return productSortOrder === "asc" ? -1 : 1;
      if (valA > valB) return productSortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [allProducts, productSearch, productFilterStatus, productSortBy, productSortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const productTotalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCT_PAGE_SIZE));
  const productSafePage = Math.min(productPage, productTotalPages);
  const productPageItems = filteredProducts.slice((productSafePage - 1) * PRODUCT_PAGE_SIZE, productSafePage * PRODUCT_PAGE_SIZE);

  const stats = useMemo(() => {
    let totalItems = 0, doneItems = 0;
    couriers.forEach((c) => {
      totalItems += c.products?.length || 0;
      doneItems += c.data_entry_done_count || 0;
    });
    return { totalCouriers: couriers.length, totalItems, doneItems, pendingItems: totalItems - doneItems };
  }, [couriers]);

  const productStats = useMemo(() => {
    const total = allProducts.length;
    const entryDone = allProducts.filter((p) => p.data_entry_done).length;
    const verified = allProducts.filter((p) => p.verification_done).length;
    return { total, entryDone, verified, pending: total - entryDone };
  }, [allProducts]);

  // Format helpers for table
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "N/A";
    return `₹${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Courier Row Component with View List and View Invoice buttons
  const CourierRow = ({ courier, onOpen, onViewList, onViewInvoice, index }) => {
    const items = courier.products || [];
    const done = courier.data_entry_done_count || 0;
    const total = items.length;
    const pending = total - done;
    const allDone = pending === 0 && total > 0;
    
    const hasList = !!(courier.upload_list_text || (courier.upload_list_images && courier.upload_list_images.length > 0));
    const hasInvoice = !!courier.invoice_photo;
    
    const getDocumentTypeDisplay = () => {
      const docType = courier.document_type || 'GST';
      switch(docType) {
        case 'GST': return { label: 'GST', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        case 'SEMI_GST': return { label: 'SEMI GST', color: 'bg-purple-100 text-purple-700 border-purple-200' };
        case 'CHALLAN': return { label: 'CHALLAN', color: 'bg-orange-100 text-orange-700 border-orange-200' };
        default: return { label: 'GST', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      }
    };
    const docType = getDocumentTypeDisplay();

    return (
      <div className="grid grid-cols-[minmax(0,1fr)_100px_380px] gap-3 items-center px-4 py-3 border-t border-neutral-100 hover:bg-neutral-50 transition-colors">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-neutral-400">#{index + 1}</span>
            <span className="text-sm font-mono font-semibold text-neutral-900">{courier.courier_number}</span>
            {courier.courier_company && (
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 truncate">
                <Truck className="w-3 h-3" /> {courier.courier_company}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${docType.color}`}>
              <Tag className="w-3 h-3" /> {docType.label}
            </span>
            {hasList && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <List className="w-3 h-3" /> List
              </span>
            )}
            {hasInvoice && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                <Receipt className="w-3 h-3" /> Invoice
              </span>
            )}
          </div>
          {courier.sent_to_data_entry_at && (
            <div className="text-[11px] text-neutral-400 mt-0.5">
              sent {new Date(courier.sent_to_data_entry_at).toLocaleString()}
            </div>
          )}
        </div>
        <div className="w-[100px] flex items-center justify-center">
          <span className="text-[12px] text-neutral-700 whitespace-nowrap">
            <span className="font-semibold">
              {courier.num_packages}
            </span>
            <span className="text-neutral-400">
              {" "}pkgs
            </span>
          </span>
        </div>
        <div className="w-[380px] flex items-center justify-end gap-2 flex-nowrap overflow-x-auto">
          {hasList && (
            <button
              onClick={() => onViewList(courier)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
              title="View uploaded list"
            >
              <Eye className="w-3.5 h-3.5" />
              View List
            </button>
          )}
          
          {hasInvoice && (
            <button
              onClick={() => onViewInvoice(courier)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors whitespace-nowrap"
              title="View uploaded invoice/challan"
            >
              <Receipt className="w-3.5 h-3.5" />
              View Invoice
            </button>
          )}
          
          <button
            onClick={() => onOpen(courier)}
            disabled={allDone}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap min-w-[100px] ${
              allDone ? "bg-emerald-100 text-emerald-700 cursor-not-allowed" : "bg-neutral-900 text-white hover:bg-neutral-800"
            }`}
          >
            {allDone ? "Completed" : "Enter Data"}
            {!allDone && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    );
  };

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
              <div className="text-2xl font-semibold tracking-tight text-neutral-900">GRM</div>
              <div className="text-sm text-neutral-500">Hi {user?.full_name?.split(" ")[0] || "there"}, click "Enter Data" to open form and fill details.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAllProducts(!showAllProducts)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700">
              <Package className="w-3.5 h-3.5" />
              {showAllProducts ? "Show Couriers" : "View All Products"}
            </button>
            <button onClick={showAllProducts ? loadAllProducts : load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50">
              <RefreshCw className={`w-3.5 h-3.5 ${(loading || allProductsLoading) ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {!showAllProducts ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile icon={Truck} label="Couriers pending" value={stats.totalCouriers} accent="neutral" />
              <StatTile icon={Package} label="Total items" value={stats.totalItems} accent="blue" />
              <StatTile icon={AlertCircle} label="Items pending" value={stats.pendingItems} accent="amber" />
              <StatTile icon={CheckCircle2} label="Items done" value={stats.doneItems} accent="emerald" />
            </div>

            {/* Courier List */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by courier #, company, item, supplier, invoice…" className="pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm w-full focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                </div>
                <button onClick={() => setSortNewest((v) => !v)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50">
                  {sortNewest ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  {sortNewest ? "Newest first" : "Oldest first"}
                </button>
                <span className="text-[11px] text-neutral-500 ml-auto">Showing {pageItems.length} of {filtered.length}</span>
              </div>

              {/* Column header */}
              <div className="grid grid-cols-[1fr_100px_auto] gap-3 items-center px-4 py-2 bg-neutral-50 border-b border-neutral-100 text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                <div>Courier</div>
                <div className="text-center">Packages</div>
                <div className="text-right">Actions</div>
              </div>

              {loading ? (
                <div className="py-16 flex items-center justify-center text-neutral-400 text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 rounded-lg bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3"><ClipboardList className="w-6 h-6" /></div>
                  <div className="text-sm text-neutral-700 font-medium">{couriers.length === 0 ? "No couriers waiting for data entry" : "No couriers match your filters"}</div>
                  <div className="text-xs text-neutral-400 mt-1">{couriers.length === 0 ? "Couriers will appear here after the Owner forwards them." : "Try clearing the search."}</div>
                </div>
              ) : (
                <>
                  {pageItems.map((c, i) => (
                    <CourierRow 
                      key={c.id} 
                      courier={c} 
                      index={(safePage - 1) * PAGE_SIZE + i} 
                      onOpen={setOpenedCourier}
                      onViewList={setViewingList}
                      onViewInvoice={setViewingInvoice}
                    />
                  ))}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-neutral-100 bg-neutral-50/60">
                      <div className="text-[11px] text-neutral-500">Page {safePage} of {totalPages}</div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="px-2.5 py-1 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-white disabled:opacity-50">Prev</button>
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-2.5 py-1 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-white disabled:opacity-50">Next</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Product Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile icon={Package} label="Total Products" value={productStats.total} accent="neutral" />
              <StatTile icon={Clock} label="Pending Entry" value={productStats.pending} accent="amber" />
              <StatTile icon={CheckCircle2} label="Entry Done" value={productStats.entryDone} accent="blue" />
              <StatTile icon={CheckCircle2} label="Verified" value={productStats.verified} accent="emerald" />
            </div>

            {/* All Products View - Excel-like Table */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 border-b border-neutral-100">
                <div className="relative flex-1 min-w-[200px] w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." className="pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-600" />
                </div>
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  <select value={productFilterStatus} onChange={(e) => setProductFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-neutral-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-600">
                    <option value="all">All Status</option>
                    <option value="pending">Pending Entry</option>
                    <option value="entry_done">Entry Done</option>
                    <option value="verified">Verified</option>
                  </select>
                  <span className="text-[11px] text-neutral-500 ml-auto whitespace-nowrap">Showing {productPageItems.length} of {filteredProducts.length} products</span>
                </div>
              </div>

              {allProductsLoading ? (
                <div className="py-16 flex items-center justify-center text-neutral-400 text-sm gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 rounded-lg bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3"><Package className="w-6 h-6" /></div>
                  <div className="text-sm text-neutral-700 font-medium">{allProducts.length === 0 ? "No products found" : "No products match your filters"}</div>
                </div>
              ) : (
                <>
                  {/* Excel-like Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-neutral-100 border-b border-neutral-200">
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">#</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Product Name</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Brand</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Category</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Code</th>
                          <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Qty</th>
                          <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Price/Unit</th>
                          <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Total Amount</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Supplier</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Invoice No</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Invoice Date</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Courier</th>
                          <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Status</th>
                          <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productPageItems.map((product, index) => (
                          <tr key={product.id || index} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                            <td className="px-3 py-2.5 text-[10px] text-neutral-400 font-mono">
                              {(productSafePage - 1) * PRODUCT_PAGE_SIZE + index + 1}
                            </td>
                            <td className="px-3 py-2.5 text-sm font-medium text-neutral-900 max-w-[150px] truncate">
                              <div className="flex items-center gap-2">
                                {product.photo ? (
                                  <img src={product.photo} alt={product.name} className="w-6 h-6 rounded object-cover" />
                                ) : (
                                  <Package className="w-4 h-4 text-neutral-300" />
                                )}
                                <span>{product.name || "N/A"}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-sm text-neutral-700">{product.brand || "N/A"}</td>
                            <td className="px-3 py-2.5 text-sm text-neutral-700">
                              {product.category && (
                                <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-xs">
                                  {product.category}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-sm font-mono text-neutral-600">{product.code || "N/A"}</td>
                            <td className="px-3 py-2.5 text-sm font-semibold text-neutral-900 text-right">{product.quantity || 0}</td>
                            <td className="px-3 py-2.5 text-sm text-emerald-600 font-medium text-right">{formatCurrency(product.price)}</td>
                            <td className="px-3 py-2.5 text-sm font-semibold text-purple-600 text-right">{formatCurrency(product.total_invoice_amount)}</td>
                            <td className="px-3 py-2.5 text-sm text-neutral-700 max-w-[120px] truncate">{product.supplier || "N/A"}</td>
                            <td className="px-3 py-2.5 text-sm font-mono text-neutral-600">{product.invoice_number || "N/A"}</td>
                            <td className="px-3 py-2.5 text-sm text-neutral-700">{formatDate(product.invoice_date)}</td>
                            <td className="px-3 py-2.5 text-sm text-neutral-700">
                              <span className="font-mono text-xs">{product.courier_number || "N/A"}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {product.data_entry_done && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    <CheckCircle2 className="w-3 h-3" /> Entry
                                  </span>
                                )}
                                {product.verification_done && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> Verified
                                  </span>
                                )}
                                {!product.data_entry_done && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock className="w-3 h-3" /> Pending
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => setSelectedProduct(product)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {productTotalPages > 1 && (
                    <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-neutral-100 bg-neutral-50/60">
                      <div className="text-[11px] text-neutral-500">Page {productSafePage} of {productTotalPages}</div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setProductPage((p) => Math.max(1, p - 1))} disabled={productSafePage === 1} className="px-3 py-1.5 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-white disabled:opacity-50">
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setProductPage((p) => Math.min(productTotalPages, p + 1))} disabled={productSafePage === productTotalPages} className="px-3 py-1.5 rounded-md border border-neutral-200 text-xs text-neutral-700 hover:bg-white disabled:opacity-50">
                          <ChevronRightIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {viewingList && (
        <ListViewerModal courier={viewingList} onClose={() => setViewingList(null)} />
      )}
      
      {viewingInvoice && (
        <InvoiceViewerModal courier={viewingInvoice} onClose={() => setViewingInvoice(null)} />
      )}
      
      {openedCourier && <DataEntryTableModal courier={openedCourier} onClose={() => setOpenedCourier(null)} onUpdated={applyUpdate} />}
      
      {selectedProduct && <ProductDetailsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
    </DashboardShell>
  );
}