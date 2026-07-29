import React, { useCallback, useEffect, useState, useRef } from "react";
import axios from "axios";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Crown,
  Truck,
  Layers,
  RefreshCw,
  Loader2,
  Building2,
  ClipboardList,
  Lock,
  CheckCircle2,
  UserPlus,
  FileText,
  Plus,
  Trash2,
  Upload,
  File,
  Eye,
  X,
  Download,
  FileImage,
  FileSpreadsheet,
  Image as ImageIcon,
  List,
  FileIcon,
  Check,
  Receipt,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import {
  StatTile,
  EditCourierModal,
  PendingCashierCourierCard,
  PendingWarehouseCourierCard,
} from "../components/ownersdahboardpages/OwnerDashboardComponents";

// Custom hooks
const useFileUpload = () => {
  const fileToDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const buildFileUrl = (path, API) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const cleanAPI = API.endsWith('/') ? API.slice(0, -1) : API;
    const fullUrl = `${cleanAPI}/${cleanPath}`;
    return fullUrl;
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return File;
    if (fileType.startsWith("image/")) return FileImage;
    if (fileType.includes("pdf")) return FileIcon;
    if (fileType.includes("spreadsheet") || fileType.includes("excel") || fileType.includes("sheet")) return FileSpreadsheet;
    if (fileType.includes("word") || fileType.includes("document")) return FileIcon;
    if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("archive")) return FileIcon;
    if (fileType.includes("text")) return FileIcon;
    return File;
  };

  return { fileToDataURL, buildFileUrl, getFileIcon };
};

const useBillManagement = () => {

  
  const [billRows, setBillRows] = useState([
    {
      id: Date.now(),
      courierName: "",
      listWithRate: { files: [], previews: [] },
      listWithoutRate: { files: [], previews: [] },
      invoiceFiles: { files: [], previews: [] },
      uploading: false,
    },
  ]);
  const [billGroups, setBillGroups] = useState([]);

  const addBillRow = () => {
    setBillRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        courierName: "",
        listWithRate: { files: [], previews: [] },
        listWithoutRate: { files: [], previews: [] },
        invoiceFiles: { files: [], previews: [] },
        uploading: false,
      },
    ]);
  };

  const removeBillRow = (rowId) => {
    setBillRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const updateBillRowName = (rowId, value) => {
    setBillRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, courierName: value } : row
      )
    );
  };

  const updateBillRowFiles = (rowId, field, files, previews) => {
    setBillRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: {
                files: [...row[field].files, ...files],
                previews: [...row[field].previews, ...previews],
              },
            }
          : row
      )
    );
  };

  const removeBillFile = (rowId, field, fileId) => {
    setBillRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const fileData = row[field];
        const nextPreviews = fileData.previews.filter((file) => file.id !== fileId);
        const removeIndex = fileData.previews.findIndex((file) => file.id === fileId);
        const nextFiles = fileData.files.filter((_, index) => index !== removeIndex);
        return {
          ...row,
          [field]: {
            files: nextFiles,
            previews: nextPreviews,
          },
        };
      })
    );
  };

  const setBillRowUploading = (rowId, uploading) => {
    setBillRows((prev) =>
      prev.map((item) =>
        item.id === rowId ? { ...item, uploading } : item
      )
    );
  };

  return {
    billRows,
    billGroups,
    setBillGroups,
    addBillRow,
    removeBillRow,
    updateBillRowName,
    updateBillRowFiles,
    removeBillFile,
    setBillRowUploading,
  };
};

const useCourierActions = (API, authHeaders, refreshAnalytics) => {
  const [busyId, setBusyId] = useState(null);
  const [editingCourier, setEditingCourier] = useState(null);
  const [uploadCourier, setUploadCourier] = useState(null);

  const handleApprove = async (courier) => {
    setBusyId(courier.id);
    try {
      await axios.patch(
        `${API}/couriers/${courier.id}/owner-approve`,
        { accepted: true },
        { headers: authHeaders() }
      );
      toast.success(`${courier.courier_number} approved for Warehouse processing`);
      refreshAnalytics();
      return true;
    } catch (e) {
      const errorMsg = e?.response?.data?.detail || e?.message || "Failed to approve courier";
      toast.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (courier, reason) => {
    setBusyId(courier.id);
    try {
      await axios.patch(
        `${API}/couriers/${courier.id}/owner-reject`,
        { reason },
        { headers: authHeaders() }
      );
      toast.success(`${courier.courier_number} rejected, sent back to Cashier`);
      refreshAnalytics();
      return true;
    } catch (e) {
      const errorMsg = e?.response?.data?.detail || e?.message || "Failed to reject courier";
      toast.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const forwardCourier = async (c) => {
    setBusyId(c.id);
    try {
      await axios.patch(
        `${API}/couriers/${c.id}/owner-forward`,
        { forward: true },
        { headers: authHeaders() }
      );
      toast.success(`${c.courier_number} forwarded to Data Entry`);
      refreshAnalytics();
      return true;
    } catch (e) {
      const errorMsg = e?.response?.data?.detail || e?.message || "Failed to forward";
      toast.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleGstToggle = async (courier, documentType) => {
    try {
      await axios.patch(
        `${API}/couriers/${courier.id}`,
        { document_type: documentType },
        { headers: authHeaders() }
      );
      toast.success(`${documentType} selected for ${courier.courier_number}`);
      return true;
    } catch (err) {
      toast.error("Failed to update document type");
      return false;
    }
  };

  return {
    busyId,
    editingCourier,
    setEditingCourier,
    uploadCourier,
    setUploadCourier,
    handleApprove,
    handleReject,
    forwardCourier,
    handleGstToggle,
  };
};

const useListUpload = () => {
  const [showListWithRateModal, setShowListWithRateModal] = useState(false);
  const [showListWithoutRateModal, setShowListWithoutRateModal] = useState(false);
  const [listWithRateText, setListWithRateText] = useState("");
  const [listWithoutRateText, setListWithoutRateText] = useState("");
  const [listImages, setListImages] = useState([]);

  const handleSelectListImages = async (e, fileToDataURL) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length !== files.length) {
      toast.error("Only image files allowed");
      e.target.value = "";
      return;
    }

    const previews = await Promise.all(
      imageFiles.map(async (file) => ({
        file,
        name: file.name,
        mime: file.type,
        preview: await fileToDataURL(file),
      }))
    );

    setListImages((prev) => [...prev, ...previews]);
    e.target.value = "";
  };

  const removeImage = (index) => {
    setListImages((prev) => prev.filter((_, i) => i !== index));
  };

const handleSubmitList = async (type, uploadCourier, text, API, authHeaders, load) => {
  if (!uploadCourier) {
    toast.error("Courier not selected");
    return false;
  }

  const newImages = listImages.filter((img) => !img.existing);

  if (!text.trim() && newImages.length === 0 && listImages.length === 0) {
    toast.error("Add list text or upload at least one image");
    return false;
  }

  try {
    const payload = {
      upload_list_type: type,
      upload_list_text: text.trim() || null,

      // only newly selected images send to backend
      upload_list_images: newImages.map((img) => ({
        name: img.name,
        mime: img.mime,
        photo: img.preview,
      })),
    };

    await axios.patch(`${API}/couriers/${uploadCourier.id}`, payload, {
      headers: authHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    toast.success(`List ${type === "with_rate" ? "with" : "without"} rate uploaded successfully`);

    setShowListWithRateModal(false);
    setShowListWithoutRateModal(false);
    setListWithRateText("");
    setListWithoutRateText("");
    setListImages([]);

    if (load) load();
    return true;
  } catch (err) {
    const errorMsg = err?.response?.data?.detail || err?.message || "Failed to upload list";
    toast.error(typeof errorMsg === "object" ? JSON.stringify(errorMsg) : errorMsg);
    return false;
  }
};

  return {
    showListWithRateModal,
    showListWithoutRateModal,
    listWithRateText,
    listWithoutRateText,
    listImages,
    setShowListWithRateModal,
    setShowListWithoutRateModal,
    setListWithRateText,
    setListWithoutRateText,
    setListImages,
    handleSelectListImages,
    removeImage,
    handleSubmitList,
  };
};

const useInvoiceUpload = () => {
  const [uploadCourier, setUploadCourier] = useState(null);
  const uploadInvoiceRef = useRef(null);

  const fileToDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUploadInvoiceFile = async (e, API, authHeaders, load) => {
    const file = e.target.files?.[0];
    if (!file || !uploadCourier) return;

    if (!file.type.startsWith("image/")) {
      e.target.value = "";
      toast.error("Invoice must be image");
      return;
    }

    try {
      const dataUrl = await fileToDataURL(file);
      await axios.patch(
        `${API}/couriers/${uploadCourier.id}`,
        {
          invoice_photo: dataUrl,
          invoice_name: file.name,
          invoice_mime: file.type || null,
        },
        {
          headers: authHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      toast.success("Invoice uploaded successfully");
      setUploadCourier(null);
      if (load) load();
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || err?.message || "Failed to upload invoice";
      toast.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    } finally {
      e.target.value = "";
    }
  };

  return {
    uploadCourier,
    setUploadCourier,
    uploadInvoiceRef,
    handleUploadInvoiceFile,
  };
};

export default function OwnerDashboard() {
  const { user, API, authHeaders } = useAuth();
  const { fileToDataURL, buildFileUrl, getFileIcon } = useFileUpload();
  
  const [analytics, setAnalytics] = useState(null);
  const [pendingCashierCouriers, setPendingCashierCouriers] = useState([]);
  const [pendingWarehouseCouriers, setPendingWarehouseCouriers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mapping state
  const [mappingData, setMappingData] = useState({
    show: false,
    groupId: null,
    couriers: [],
    loading: false,
    selectedCourier: null,
    submitting: false
  });

  const billManagement = useBillManagement();
  const listUpload = useListUpload();
  const invoiceUpload = useInvoiceUpload();

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [a, cashierPending, warehousePending, mappedDocs, unmappedDocs] =
        await Promise.all([
          axios.get(`${API}/owner/analytics`, { headers: authHeaders() }),
          axios.get(`${API}/owner/pending-cashier-couriers`, {
            headers: authHeaders(),
          }),
          axios.get(`${API}/owner/couriers/pending`, {
            headers: authHeaders(),
          }),
          axios.get(`${API}/documents/mapped`, {
            headers: authHeaders(),
          }),
          axios.get(`${API}/documents/unmapped`, {
            headers: authHeaders(),
          }),
        ]);

      setAnalytics(a.data || null);
      setPendingWarehouseCouriers(warehousePending.data || []);

      // Create a map of courier_id to their files from mapped documents
      const courierFilesMap = new Map();
      
      if (mappedDocs.data?.success && mappedDocs.data?.data) {
        mappedDocs.data.data.forEach(doc => {
          const courierId = doc.mapped_courier_id;
          if (!courierId) return;
          
          if (!courierFilesMap.has(courierId)) {
            courierFilesMap.set(courierId, {
              list_with_rate: [],
              list_without_rate: [],
              invoice_files: [],
              courier_details: doc.courier_details || {}
            });
          }
          
          const files = courierFilesMap.get(courierId);
          
          if (doc.list_with_rate) {
            files.list_with_rate.push(...doc.list_with_rate);
          }
          if (doc.list_without_rate) {
            files.list_without_rate.push(...doc.list_without_rate);
          }
          if (doc.invoice_files) {
            files.invoice_files.push(...doc.invoice_files);
          }
        });
      }

      // Enhance cashier couriers with mapped files
      const enhancedCashierCouriers = (cashierPending.data || []).map(courier => {
        const files = courierFilesMap.get(courier.id) || {};
        return {
          ...courier,
          list_with_rate: files.list_with_rate || [],
          list_without_rate: files.list_without_rate || [],
          invoice_files: files.invoice_files || [],
        };
      });

      // Process unmapped documents
      const responseData = unmappedDocs.data;
      let groups = [];
      
      if (responseData?.success && responseData?.data) {
        groups = responseData.data.map((doc) => {
          const allFiles = [];
          
          if (doc.list_with_rate) {
            doc.list_with_rate.forEach((file, index) => {
              allFiles.push({
                id: `${doc.id}-list_with_rate-${index}`,
                name: file.file_name,
                type: file.file_type,
                filePath: file.file_path,
                fileUrl: file.file_url,
                preview: file.file_type?.startsWith("image/") ? file.file_url : null,
                category: 'List With Rate',
                categoryIcon: '📋',
                categoryColor: 'blue'
              });
            });
          }
          
          if (doc.list_without_rate) {
            doc.list_without_rate.forEach((file, index) => {
              allFiles.push({
                id: `${doc.id}-list_without_rate-${index}`,
                name: file.file_name,
                type: file.file_type,
                filePath: file.file_path,
                fileUrl: file.file_url,
                preview: file.file_type?.startsWith("image/") ? file.file_url : null,
                category: 'List Without Rate',
                categoryIcon: '📄',
                categoryColor: 'purple'
              });
            });
          }
          
          if (doc.invoice_files) {
            doc.invoice_files.forEach((file, index) => {
              allFiles.push({
                id: `${doc.id}-invoice_files-${index}`,
                name: file.file_name,
                type: file.file_type,
                filePath: file.file_path,
                fileUrl: file.file_url,
                preview: file.file_type?.startsWith("image/") ? file.file_url : null,
                category: 'Invoice',
                categoryIcon: '🧾',
                categoryColor: 'emerald'
              });
            });
          }
          
          return {
            id: doc.id,
            courierName: doc.courier_name || "Unnamed",
            files: allFiles,
            mapped: doc.mapped,
            mapped_courier_id: doc.mapped_courier_id,
            uploaded_by: doc.uploaded_by,
            uploaded_at: doc.uploaded_at,
            list_with_rate: doc.list_with_rate || [],
            list_without_rate: doc.list_without_rate || [],
            invoice_files: doc.invoice_files || [],
            list_with_rate_count: doc.list_with_rate_count || 0,
            list_without_rate_count: doc.list_without_rate_count || 0,
            invoice_files_count: doc.invoice_files_count || 0
          };
        });
      }

      console.log("Unmapped groups:", groups);
      console.log("Enhanced cashier couriers:", enhancedCashierCouriers);
      
      setPendingCashierCouriers(enhancedCashierCouriers);
      billManagement.setBillGroups(groups);
    } catch (e) {
      console.error("Load error:", e);
      const errorMsg = e?.response?.data?.detail || e?.message || "Failed to load owner data";
      toast.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]);

  const refreshAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/owner/analytics`, {
        headers: authHeaders(),
      });
      setAnalytics(response.data || null);
    } catch (e) {}
  };

  const courierActions = useCourierActions(API, authHeaders, refreshAnalytics);

    // FIX: Use a ref to prevent infinite loops
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      load();
    }
  }, []); // Empty dependency array - runs only once on mount

  // Fetch couriers for mapping
  const fetchCouriersForMapping = async (groupId) => {
    if (mappingData.show || mappingData.loading) {
      return;
    }

    setMappingData(prev => ({ 
      ...prev, 
      loading: true, 
      show: true, 
      groupId 
    }));
    
    try {
      const response = await axios.get(`${API}/available-couriers`, {
        headers: authHeaders()
      });
      setMappingData(prev => ({ 
        ...prev, 
        couriers: response.data?.data || [],
        loading: false 
      }));
    } catch (err) {
      console.error("Error fetching couriers:", err);
      toast.error(err?.response?.data?.detail || "Failed to fetch couriers for mapping");
      setMappingData(prev => ({ ...prev, loading: false, show: false }));
    }
  };

  // Handle map courier
  const handleMapCourier = async () => {
    if (!mappingData.selectedCourier || !mappingData.groupId) {
      toast.error("Please select a courier");
      return;
    }

    if (mappingData.submitting) {
      toast.info("Mapping in progress...");
      return;
    }

    setMappingData(prev => ({ ...prev, submitting: true }));

    try {
      const response = await axios.patch(
        `${API}/documents/map`,
        {
          document_id: mappingData.groupId,
          courier_id: mappingData.selectedCourier
        },
        { headers: authHeaders() }
      );
      
      if (response.data?.success) {
        toast.success(`Document mapped successfully`);
        
        // Remove from unmapped list immediately
        billManagement.setBillGroups((prev) =>
          prev.filter((group) => group.id !== mappingData.groupId)
        );
        
        // Clear mapping data and close modal
        setMappingData(prev => ({ 
          ...prev, 
          show: false, 
          selectedCourier: null,
          submitting: false,
          groupId: null,
          couriers: []
        }));
        
        // Refresh the data
        setTimeout(() => {
          load();
        }, 300);
      }
    } catch (err) {
      console.error("Error mapping:", err);
      
      if (err.response?.status === 404) {
        toast.info("Document has already been mapped");
        billManagement.setBillGroups((prev) =>
          prev.filter((group) => group.id !== mappingData.groupId)
        );
        setMappingData(prev => ({ 
          ...prev, 
          show: false, 
          selectedCourier: null,
          submitting: false,
          groupId: null,
          couriers: []
        }));
        load();
      } else {
        const errorMsg = err?.response?.data?.detail || err?.message || "Failed to map document";
        toast.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
        setMappingData(prev => ({ ...prev, submitting: false }));
      }
    }
  };

  const handleCloseMapping = () => {
    setMappingData(prev => ({ 
      ...prev, 
      show: false, 
      selectedCourier: null,
      submitting: false,
      groupId: null,
      couriers: []
    }));
  };

  const handleSelectRowBills = async (rowId, field, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const maxSize = 10 * 1024 * 1024;
    if (files.some((file) => file.size > maxSize)) {
      toast.error("Some files exceed 10MB limit");
      e.target.value = "";
      return;
    }

    const previews = await Promise.all(
      files.map(async (file, index) => ({
        id: Date.now() + index,
        file,
        name: file.name,
        type: file.type,
        preview: file.type.startsWith("image/") ? await fileToDataURL(file) : null,
      }))
    );

    billManagement.updateBillRowFiles(rowId, field, files, previews);
    e.target.value = "";
  };

  const handleSaveBillRow = async (rowId) => {
    const row = billManagement.billRows.find((item) => item.id === rowId);
    if (!row?.courierName.trim()) {
      toast.error("Enter courier/company name");
      return;
    }
    
    const hasFiles = row.listWithRate.files.length > 0 || 
                     row.listWithoutRate.files.length > 0 || 
                     row.invoiceFiles.files.length > 0;
    
    if (!hasFiles) {
      toast.error("Upload at least one file (List With Rate, List Without Rate, or Invoice)");
      return;
    }

    billManagement.setBillRowUploading(rowId, true);
    try {
      const formData = new FormData();
      formData.append("courier_name", row.courierName.trim());
      
      row.listWithRate.files.forEach((file) => {
        formData.append("list_with_rate", file);
      });
      
      row.listWithoutRate.files.forEach((file) => {
        formData.append("list_without_rate", file);
      });
      
      row.invoiceFiles.files.forEach((file) => {
        formData.append("invoice_files", file);
      });

      console.log("Sending to backend:", {
        courier_name: row.courierName.trim(),
        list_with_rate: row.listWithRate.files.length,
        list_without_rate: row.listWithoutRate.files.length,
        invoice_files: row.invoiceFiles.files.length
      });

      const response = await axios.post(`${API}/documents/upload`, formData, {
        headers: { 
          ...authHeaders(), 
          "Content-Type": "multipart/form-data" 
        },
      });

      console.log("Upload success:", response.data);

      toast.success(`Files uploaded successfully for ${row.courierName}`);
      
      const wasLastRow = billManagement.billRows.length === 1;
      billManagement.removeBillRow(rowId);
      if (wasLastRow) {
        billManagement.addBillRow();
      }
      load();
    } catch (err) {
      console.error("Upload error:", err);
      console.error("Error response:", err.response?.data);
      
      let errorMessage = "Failed to upload files";
      if (err.response?.data?.detail) {
        errorMessage = typeof err.response.data.detail === 'object' 
          ? JSON.stringify(err.response.data.detail) 
          : err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
      billManagement.setBillRowUploading(rowId, false);
    }
  };

  const handleViewFile = (file) => {
    if (!file.fileUrl) {
      toast.error("File URL not available");
      return;
    }
    window.open(file.fileUrl, "_blank");
  };

  const handleDownloadFile = async (file) => {
    if (!file.fileUrl) {
      toast.error("File URL not available");
      return;
    }

    try {
      const response = await axios.get(file.fileUrl, {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.name || "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      window.open(file.fileUrl, "_blank");
      toast.error("Direct download failed, opened file instead");
    }
  };

const openUploadListWithRate = (courier) => {
  courierActions.setUploadCourier(courier);

  const mappedImages = (courier.list_with_rate || []).map((file) => ({
    name: file.file_name,
    mime: file.file_type,
    preview: file.file_url,
    existing: true,
  }));

  listUpload.setShowListWithRateModal(true);
  listUpload.setListWithRateText("");
  listUpload.setListImages(mappedImages);
};


const openUploadListWithoutRate = (courier) => {
  courierActions.setUploadCourier(courier);

  const mappedImages = (courier.list_without_rate || []).map((file) => ({
    name: file.file_name,
    mime: file.file_type,
    preview: file.file_url,
    existing: true,
  }));

  listUpload.setShowListWithoutRateModal(true);
  listUpload.setListWithoutRateText("");
  listUpload.setListImages(mappedImages);
};


  const openUploadInvoice = (courier) => {
    invoiceUpload.setUploadCourier(courier);
    invoiceUpload.uploadInvoiceRef.current?.click();
  };

  const handleEditSave = (updatedCourier) => {
    setPendingCashierCouriers((prev) =>
      prev.map((c) => (c.id === updatedCourier.id ? updatedCourier : c))
    );
    setPendingWarehouseCouriers((prev) =>
      prev.map((c) => (c.id === updatedCourier.id ? updatedCourier : c))
    );
  };

  const handleApproveWrapper = async (courier) => {
    const success = await courierActions.handleApprove(courier);
    if (success) {
      setPendingCashierCouriers((arr) => arr.filter((x) => x.id !== courier.id));
    }
  };

  const handleRejectWrapper = async (courier, reason) => {
    const success = await courierActions.handleReject(courier, reason);
    if (success) {
      setPendingCashierCouriers((arr) => arr.filter((x) => x.id !== courier.id));
    }
  };

  const forwardCourierWrapper = async (c) => {
    const success = await courierActions.forwardCourier(c);
    if (success) {
      setPendingWarehouseCouriers((arr) => arr.filter((x) => x.id !== c.id));
    }
  };

  const handleGstToggleWrapper = async (courier, documentType) => {
    const success = await courierActions.handleGstToggle(courier, documentType);
    if (success) {
      setPendingCashierCouriers((prev) =>
        prev.map((c) => (c.id === courier.id ? { ...c, document_type: documentType } : c))
      );
      setPendingWarehouseCouriers((prev) =>
        prev.map((c) => (c.id === courier.id ? { ...c, document_type: documentType } : c))
      );
    }
  };

  const handleListSubmitWrapper = (type) => {
    const text = type === "with_rate" ? listUpload.listWithRateText : listUpload.listWithoutRateText;
    return listUpload.handleSubmitList(
      type, 
      courierActions.uploadCourier, 
      text, 
      API, 
      authHeaders, 
      load
    );
  };

  const handleInvoiceUploadWrapper = (e) => {
    invoiceUpload.handleUploadInvoiceFile(e, API, authHeaders, load);
  };

  const a = analytics || {};

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto pb-10 space-y-6">
        <DashboardHeader user={user} loading={loading} onRefresh={load} />

        <BillUploadSection
          billRows={billManagement.billRows}
          onAddRow={billManagement.addBillRow}
          onRemoveRow={billManagement.removeBillRow}
          onUpdateName={billManagement.updateBillRowName}
          onSelectFiles={handleSelectRowBills}
          onSave={handleSaveBillRow}
          onRemoveFile={billManagement.removeBillFile}
          getFileIcon={getFileIcon}
        />

        <UnmappedBillsSection
          billGroups={billManagement.billGroups}
          onViewFile={handleViewFile}
          onDownloadFile={handleDownloadFile}
          getFileIcon={getFileIcon}
          mappingData={mappingData}
          onFetchCouriers={fetchCouriersForMapping}
          onSelectCourier={(courierId) => setMappingData(prev => ({ ...prev, selectedCourier: courierId }))}
          onMapCourier={handleMapCourier}
          onCloseMapping={handleCloseMapping}
        />

        <StatsGrid analytics={analytics} loading={loading} />

        <CashierSubmissionsSection
          couriers={pendingCashierCouriers}
          loading={loading}
          busyId={courierActions.busyId}
          onApprove={handleApproveWrapper}
          onReject={handleRejectWrapper}
          onEdit={courierActions.setEditingCourier}
          onUploadListWithRate={openUploadListWithRate}
          onUploadListWithoutRate={openUploadListWithoutRate}
          onUploadInvoice={openUploadInvoice}
          onGstToggle={handleGstToggleWrapper}
        />

        <WarehouseSubmissionsSection
          couriers={pendingWarehouseCouriers}
          loading={loading}
          busyId={courierActions.busyId}
          onForward={forwardCourierWrapper}
          onEdit={courierActions.setEditingCourier}
        />
      </div>

      <ListUploadModal
        show={listUpload.showListWithRateModal}
        type="with_rate"
        text={listUpload.listWithRateText}
        images={listUpload.listImages}
        onTextChange={listUpload.setListWithRateText}
        onImageSelect={(e) => listUpload.handleSelectListImages(e, fileToDataURL)}
        onRemoveImage={listUpload.removeImage}
        onSubmit={() => handleListSubmitWrapper("with_rate")}
        onCancel={() => {
          listUpload.setShowListWithRateModal(false);
          listUpload.setListWithRateText("");
          listUpload.setListImages([]);
          courierActions.setUploadCourier(null);
        }}
      />

      <ListUploadModal
        show={listUpload.showListWithoutRateModal}
        type="without_rate"
        text={listUpload.listWithoutRateText}
        images={listUpload.listImages}
        onTextChange={listUpload.setListWithoutRateText}
        onImageSelect={(e) => listUpload.handleSelectListImages(e, fileToDataURL)}
        onRemoveImage={listUpload.removeImage}
        onSubmit={() => handleListSubmitWrapper("without_rate")}
        onCancel={() => {
          listUpload.setShowListWithoutRateModal(false);
          listUpload.setListWithoutRateText("");
          listUpload.setListImages([]);
          courierActions.setUploadCourier(null);
        }}
      />

      <input
        ref={invoiceUpload.uploadInvoiceRef}
        type="file"
        accept="image/*"
        onChange={handleInvoiceUploadWrapper}
        className="hidden"
      />

      {courierActions.editingCourier && (
        <EditCourierModal
          courier={courierActions.editingCourier}
          onClose={() => courierActions.setEditingCourier(null)}
          onSave={handleEditSave}
        />
      )}
    </DashboardShell>
  );
}

// ============= SUB-COMPONENTS =============

const DashboardHeader = ({ user, loading, onRefresh }) => (
  <div className="flex items-center justify-between gap-3 flex-wrap">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
        <Crown className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-neutral-400">Owner</div>
        <div className="text-2xl font-semibold tracking-tight text-neutral-900">Owner Console</div>
        <div className="text-sm text-neutral-500">
          Hi {user?.full_name?.split(" ")[0] || "Owner"}, approve cashier couriers → monitor warehouse → forward to Data Entry.
        </div>
      </div>
    </div>
    <button
      onClick={onRefresh}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-700 hover:bg-neutral-50"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
      Refresh
    </button>
  </div>
);

const BillUploadSection = ({
  billRows,
  onAddRow,
  onRemoveRow,
  onUpdateName,
  onSelectFiles,
  onSave,
  onRemoveFile,
  getFileIcon,
}) => (
  <div className="bg-white border border-emerald-200 rounded-2xl p-4">
    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <FileText className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-neutral-900">Upload Courier Files</div>
          <div className="text-xs text-neutral-500">Add company and upload files in 3 categories</div>
        </div>
      </div>
      <button
        onClick={onAddRow}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs hover:bg-neutral-800"
      >
        <Plus className="w-3.5 h-3.5" />Add Row
      </button>
    </div>
    <div className="space-y-3">
      {billRows.map((row) => (
        <BillRow
          key={row.id}
          row={row}
          onUpdateName={onUpdateName}
          onSelectFiles={onSelectFiles}
          onSave={onSave}
          onRemoveRow={onRemoveRow}
          onRemoveFile={onRemoveFile}
          getFileIcon={getFileIcon}
          isLastRow={billRows.length === 1}
        />
      ))}
    </div>
  </div>
);

const BillRow = ({
  row,
  onUpdateName,
  onSelectFiles,
  onSave,
  onRemoveRow,
  onRemoveFile,
  getFileIcon,
  isLastRow,
}) => {
  const [selectedField, setSelectedField] = useState(null);
  const fileInputRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  const handleUploadClick = (field) => {
    setSelectedField(field);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (selectedField) {
      onSelectFiles(row.id, selectedField, e);
      setSelectedField(null);
    }
  };

  const fields = [
    {
      key: 'listWithRate',
      label: 'List With Rate',
      icon: List,
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-600',
      hoverBg: 'hover:bg-blue-100',
    },
    {
      key: 'listWithoutRate',
      label: 'List Without Rate',
      icon: FileIcon,
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-600',
      hoverBg: 'hover:bg-purple-100',
    },
    {
      key: 'invoiceFiles',
      label: 'Upload Invoice',
      icon: Receipt,
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-600',
      hoverBg: 'hover:bg-emerald-100',
    },
  ];

  const getFileCount = (fieldKey) => {
    return row[fieldKey]?.files?.length || 0;
  };

  const getTotalFiles = () => {
    return getFileCount('listWithRate') + getFileCount('listWithoutRate') + getFileCount('invoiceFiles');
  };

  const allFiles = [
    ...row.listWithRate.previews.map(f => ({ ...f, category: 'List With Rate' })),
    ...row.listWithoutRate.previews.map(f => ({ ...f, category: 'List Without Rate' })),
    ...row.invoiceFiles.previews.map(f => ({ ...f, category: 'Invoice' })),
  ];

  return (
    <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/70">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center gap-2 mb-3">
        <input
          value={row.courierName}
          onChange={(e) => onUpdateName(row.id, e.target.value)}
          placeholder="Company name..."
          className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-200 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-100"
        />
        <button
          onClick={() => onSave(row.id)}
          disabled={row.uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
        >
          {row.uploading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</>
          ) : (
            <>Save {getTotalFiles() > 0 && `(${getTotalFiles()})`}</>
          )}
        </button>
        {!isLastRow && (
          <button
            onClick={() => onRemoveRow(row.id)}
            className="inline-flex items-center justify-center p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {fields.map((field) => {
          const fileCount = getFileCount(field.key);
          const Icon = field.icon;
          const hasFiles = fileCount > 0;
          
          return (
            <button
              key={field.key}
              onClick={() => handleUploadClick(field.key)}
              className={`relative p-2 rounded-lg border-2 transition-all duration-200 text-left
                ${hasFiles ? `${field.borderColor} ${field.bgColor}` : 'border-neutral-200 hover:border-neutral-300'}
                ${field.hoverBg}`}
            >
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${field.bgColor}`}>
                  <Icon className={`w-3.5 h-3.5 ${field.textColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-neutral-700 truncate">{field.label}</div>
                  {hasFiles ? (
                    <div className="text-[10px] text-green-600 flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" />
                      {fileCount} file{fileCount > 1 ? 's' : ''}
                    </div>
                  ) : (
                    <div className="text-[10px] text-neutral-400">Click to upload</div>
                  )}
                </div>
                <Upload className={`w-3 h-3 ${hasFiles ? field.textColor : 'text-neutral-400'}`} />
              </div>
            </button>
          );
        })}
      </div>

      {allFiles.length > 0 && (
        <div className="mt-2 pt-2 border-t border-neutral-200">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
          >
            {expanded ? 'Hide' : 'Show'} files ({allFiles.length})
          </button>
          
          {expanded && (
            <div className="mt-2 flex flex-wrap gap-2">
              {allFiles.map((file) => (
                <FilePreview
                  key={file.id}
                  file={file}
                  onRemove={() => {
                    const fieldKey = file.category === 'List With Rate' ? 'listWithRate' :
                                   file.category === 'List Without Rate' ? 'listWithoutRate' : 'invoiceFiles';
                    onRemoveFile(row.id, fieldKey, file.id);
                  }}
                  getFileIcon={getFileIcon}
                  label={file.category}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FilePreview = ({ file, onRemove, getFileIcon, label }) => {
  const [imageError, setImageError] = useState(false);
  const Icon = getFileIcon(file.type);
  
  return (
    <div className="relative w-20 border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="h-16 bg-neutral-100 flex items-center justify-center">
        {file.preview && !imageError ? (
          <img 
            src={file.preview} 
            alt={file.name} 
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Icon className="w-5 h-5 text-neutral-400" />
        )}
      </div>
      {label && (
        <div className="absolute top-0.5 left-0.5 px-1 py-0.5 bg-black/60 text-white text-[7px] rounded truncate max-w-[60px]">
          {label}
        </div>
      )}
      <div className="px-1 py-0.5 text-[8px] truncate" title={file.name}>
        {file.name}
      </div>
      <button
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

const UnmappedBillsSection = ({ 
  billGroups, 
  onViewFile, 
  onDownloadFile, 
  getFileIcon,
  mappingData,
  onFetchCouriers,
  onSelectCourier,
  onMapCourier,
  onCloseMapping
}) => {
  if (!billGroups || billGroups.length === 0) {
    return (
      <div className="bg-white border border-blue-200 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">Unmapped Bills</div>
            <div className="text-xs text-neutral-500">No unmapped bills found</div>
          </div>
        </div>
      </div>
    );
  }

  const totalFiles = billGroups.reduce((acc, group) => acc + group.files.length, 0);

  return (
    <div className="bg-white border border-blue-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">Unmapped Bills</div>
            <div className="text-xs text-neutral-500">
              {totalFiles} files across {billGroups.length} group{billGroups.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {billGroups.map((group) => (
          <BillGroupCard
            key={group.id}
            group={group}
            onViewFile={onViewFile}
            onDownloadFile={onDownloadFile}
            getFileIcon={getFileIcon}
            onFetchCouriers={onFetchCouriers}
          />
        ))}
      </div>

      {/* Mapping Dropdown */}
      {mappingData.show && (
        <MappingDropdown
          mappingData={mappingData}
          onSelectCourier={onSelectCourier}
          onMapCourier={onMapCourier}
          onClose={onCloseMapping}
        />
      )}
    </div>
  );
};

const BillGroupCard = ({ 
  group, 
  onViewFile, 
  onDownloadFile, 
  getFileIcon,
  onFetchCouriers 
}) => {
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    listWithRate: true,
    listWithoutRate: true,
    invoiceFiles: true
  });

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Group files by category
  const groupedFiles = {
    listWithRate: group.files.filter(f => f.category === 'List With Rate'),
    listWithoutRate: group.files.filter(f => f.category === 'List Without Rate'),
    invoiceFiles: group.files.filter(f => f.category === 'Invoice')
  };

  const categories = [
    { 
      key: 'listWithRate', 
      label: '📋 List With Rate', 
      count: group.list_with_rate_count || 0,
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-600'
    },
    { 
      key: 'listWithoutRate', 
      label: '📄 List Without Rate', 
      count: group.list_without_rate_count || 0,
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-600'
    },
    { 
      key: 'invoiceFiles', 
      label: '🧾 Invoice', 
      count: group.invoice_files_count || 0,
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-600'
    }
  ];

  const handleMapClick = () => {
    onFetchCouriers(group.id);
  };

  return (
    <div className="border border-neutral-200 rounded-xl p-3 bg-white hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-neutral-900 truncate">
            {group.courierName || "Unnamed"}
          </div>
          <div className="text-xs text-neutral-400">
            {group.files.length} file{group.files.length > 1 ? 's' : ''}
          </div>
        </div>
        <button
          onClick={handleMapClick}
          className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 whitespace-nowrap transition-colors flex items-center gap-1"
        >
          <span>Map</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Category Groups */}
      <div className="space-y-2 mt-2">
        {categories.map((category) => {
          const files = groupedFiles[category.key] || [];
          if (files.length === 0) return null;

          const displayFiles = showAllFiles ? files : files.slice(0, 4);
          const hasMore = files.length > 4;

          return (
            <div key={category.key} className={`border rounded-lg ${category.borderColor} ${category.bgColor} p-2`}>
              {/* Category Header */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleCategory(category.key)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-700">{category.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${category.bgColor} ${category.textColor} border ${category.borderColor}`}>
                    {files.length}
                  </span>
                </div>
                <button className="text-neutral-400 hover:text-neutral-600">
                  {expandedCategories[category.key] ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Files Grid */}
              {expandedCategories[category.key] && (
                <div className="mt-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {displayFiles.map((file) => (
                      <FileThumbnail 
                        key={file.id} 
                        file={file} 
                        onView={onViewFile}
                        onDownload={onDownloadFile}
                        getFileIcon={getFileIcon}
                        category={file.category}
                        categoryColor={file.categoryColor}
                        categoryIcon={file.categoryIcon}
                        small={true}
                      />
                    ))}
                  </div>
                  
                  {hasMore && !showAllFiles && (
                    <button
                      onClick={() => setShowAllFiles(true)}
                      className="mt-1 text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      +{files.length - 4} more
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAllFiles && group.files.length > 6 && (
        <button
          onClick={() => setShowAllFiles(false)}
          className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Show less
        </button>
      )}
    </div>
  );
};

const FileThumbnail = ({ file, onView, onDownload, getFileIcon, category, categoryColor, categoryIcon, small }) => {
  const Icon = getFileIcon(file.type);
  const isImage = file.type?.startsWith("image/");
  const imageUrl = file.preview || file.fileUrl;

  const getCategoryColors = (color) => {
    const colors = {
      blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-200' },
      emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-200' },
    };
    return colors[color] || colors.blue;
  };

  const colorClasses = getCategoryColors(categoryColor || 'blue');

  const getFileTypeLabel = (type) => {
    if (!type) return 'File';
    if (type.startsWith('image/')) return 'Image';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('spreadsheet') || type.includes('excel')) return 'Excel';
    if (type.includes('word') || type.includes('document')) return 'Document';
    if (type.includes('text')) return 'Text';
    return 'File';
  };

  const size = small ? 'w-12 h-12' : 'aspect-square';
  const iconSize = small ? 'w-4 h-4' : 'w-6 h-6';
  const textSize = small ? 'text-[6px]' : 'text-[8px]';

  return (
    <div className="relative group">
      <div
        className={`${size} bg-neutral-100 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-400 transition-all`}
        onClick={() => onView(file)}
      >
        {isImage && imageUrl ? (
          <img
            src={imageUrl}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-50">
            <Icon className={`${iconSize} text-neutral-400`} />
            <span className={`${textSize} text-neutral-400 mt-0.5`}>{getFileTypeLabel(file.type)}</span>
          </div>
        )}
      </div>

      {category && !small && (
        <div className={`absolute top-0.5 left-0.5 px-1.5 py-0.5 ${colorClasses.bg} text-white text-[8px] rounded-full flex items-center gap-0.5 shadow-sm`}>
          <span>{categoryIcon || '📄'}</span>
          <span className="truncate max-w-[30px]">
            {category === 'List With Rate' ? 'LWR' : 
             category === 'List Without Rate' ? 'LWOR' : 
             category === 'Invoice' ? 'INV' : ''}
          </span>
        </div>
      )}

      {!small && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
          {file.name}
        </div>
      )}

      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center gap-2 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(file);
          }}
          className={`p-1.5 bg-white rounded-full hover:bg-neutral-100 shadow-lg transition-transform hover:scale-110 ${small ? 'scale-75' : ''}`}
          title="View file"
        >
          <Eye className={`${small ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-neutral-700`} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(file);
          }}
          className={`p-1.5 bg-white rounded-full hover:bg-neutral-100 shadow-lg transition-transform hover:scale-110 ${small ? 'scale-75' : ''}`}
          title="Download file"
        >
          <Download className={`${small ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-neutral-700`} />
        </button>
      </div>
    </div>
  );
};

// ============= CASHIER SUBMISSIONS SECTION =============

const CashierSubmissionsSection = ({
  couriers,
  loading,
  busyId,
  onApprove,
  onReject,
  onEdit,
  onUploadListWithRate,
  onUploadListWithoutRate,
  onUploadInvoice,
  onGstToggle,
}) => {
  if (!couriers.length) return null;

  return (
    <div className="bg-white border border-purple-200 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="text-base font-semibold text-neutral-900">Cashier Submissions · Pending Your Approval</div>
        </div>
      </div>
      {loading ? (
        <div className="py-10 flex items-center justify-center text-neutral-400 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />Loading…
        </div>
      ) : (
        <div className="space-y-3">
          {couriers.map((c) => (
            <PendingCashierCourierCard
              key={c.id}
              courier={c}
              busy={busyId === c.id}
              onApprove={onApprove}
              onReject={onReject}
              onEdit={onEdit}
              onUploadListWithRate={onUploadListWithRate}
              onUploadListWithoutRate={onUploadListWithoutRate}
              onUploadInvoice={onUploadInvoice}
              onGstToggle={onGstToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============= MAPPING DROPDOWN =============

const MappingDropdown = ({ mappingData, onSelectCourier, onMapCourier, onClose }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div ref={dropdownRef} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Map to Courier</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {mappingData.loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-neutral-600">Loading couriers...</span>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Select Courier
              </label>
              <select
                value={mappingData.selectedCourier || ''}
                onChange={(e) => onSelectCourier(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              >
                <option value="">Select a courier...</option>
                {mappingData.couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.courier_number || courier.name || `Courier ${courier.id}`}
                  </option>
                ))}
              </select>
            </div>

            {mappingData.couriers.length === 0 && !mappingData.loading && (
              <div className="text-center py-4 text-neutral-500 text-sm">
                No couriers available for mapping
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={onMapCourier}
                disabled={!mappingData.selectedCourier || mappingData.loading || mappingData.submitting}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {mappingData.submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Mapping...</>
                ) : (
                  'Map'
                )}
              </button>
              <button
                onClick={onClose}
                disabled={mappingData.submitting}
                className="flex-1 px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const StatsGrid = ({ analytics, loading }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
    <StatTile icon={Truck} label="Total couriers" value={loading ? "…" : analytics.total_couriers ?? 0} tone="primary" />
    <StatTile icon={UserPlus} label="Pending Cashier" value={loading ? "…" : analytics.pending_cashier ?? 0} tone="purple" />
    <StatTile icon={ClipboardList} label="Pending warehouse" value={loading ? "…" : analytics.pending_warehouse ?? 0} tone="info" />
    <StatTile icon={Building2} label="Pending your review" value={loading ? "…" : analytics.pending_owner_review ?? 0} tone="warning" />
    <StatTile icon={Lock} label="In Data Entry" value={loading ? "…" : analytics.in_data_entry ?? 0} tone="info" />
    <StatTile icon={ClipboardList} label="Ready for verification" value={loading ? "…" : analytics.ready_verification ?? 0} tone="warning" />
    <StatTile icon={CheckCircle2} label="Verified" value={loading ? "…" : analytics.verified ?? 0} tone="success" />
    <StatTile icon={Layers} label="Total items" value={loading ? "…" : analytics.total_items ?? 0} tone="neutral" />
  </div>
);

const WarehouseSubmissionsSection = ({
  couriers,
  loading,
  busyId,
  onForward,
  onEdit,
}) => {
  if (!couriers.length) return null;

  return (
    <div className="bg-white border border-amber-200 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="text-base font-semibold text-neutral-900">Warehouse Completed · Forward to Data Entry</div>
        </div>
      </div>
      {loading ? (
        <div className="py-10 flex items-center justify-center text-neutral-400 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />Loading…
        </div>
      ) : (
        <div className="space-y-3">
          {couriers.map((c) => (
            <PendingWarehouseCourierCard
              key={c.id}
              courier={c}
              busy={busyId === c.id}
              onForward={onForward}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ListUploadModal = ({ 
  show, 
  type, 
  text, 
  images, 
  onTextChange, 
  onImageSelect, 
  onRemoveImage, 
  onSubmit, 
  onCancel 
}) => {
  const uploadListRef = useRef(null);

  if (!show) return null;

  const title = type === "with_rate" ? "Upload List With Rate" : "Upload List Without Rate";
  const buttonColor = type === "with_rate" ? "bg-blue-600" : "bg-cyan-600";

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={`Paste list ${type === "with_rate" ? "with" : "without"} rate here...`}
          rows={6}
          className="w-full border border-neutral-200 rounded-xl p-3 text-sm mb-4"
        />
        <button
          onClick={() => uploadListRef.current?.click()}
          className="w-full px-4 py-2 rounded-xl bg-neutral-900 text-white mb-4"
        >
          Select Images
        </button>
        <input
          ref={uploadListRef}
          type="file"
          multiple
          accept="image/*"
          onChange={onImageSelect}
          className="hidden"
        />
{images.length > 0 && (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
    {images.map((img, index) => (
      <div key={index} className="relative border border-neutral-200 rounded-xl overflow-hidden bg-white">
        <img
          src={img.preview}
          alt={img.name}
          className="w-full h-32 object-cover"
        />

        {img.existing && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-medium">
            Mapped
          </div>
        )}

        {!img.existing && (
          <button
            onClick={() => onRemoveImage(index)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="p-2 text-[11px] text-neutral-600 truncate">
          {img.name}
        </div>
      </div>
    ))}
  </div>
)}
        <div className="flex gap-2">
          <button onClick={onSubmit} className={`flex-1 px-4 py-2 rounded-xl ${buttonColor} text-white`}>
            Submit
          </button>
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};