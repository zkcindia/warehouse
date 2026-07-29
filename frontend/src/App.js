// import React from "react";
// import "@/App.css";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { Toaster } from "sonner";
// import { AuthProvider, useAuth } from "@/context/AuthContext";
// import RoleSelectionPage from "@/pages/RoleSelectionPage";
// import LoginPage from "@/pages/LoginPage";
// import OwnerDashboard from "@/pages/OwnerDashboard";
// import WarehouseDashboard from "@/pages/WarehouseDashboard";
// import CashierDashboard from "@/pages/CashierDashboard";
// import DataEntryDashboard from "@/pages/DataEntryDashboard";
// import StaffDashboard from "@/pages/StaffDashboard";

// function ProtectedRoute({ children, allowedRoles }) {
//   const { user, loading } = useAuth();
//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-neutral-50">
//         <div className="text-neutral-500 text-sm">Loading…</div>
//       </div>
//     );
//   }
//   if (!user) return <Navigate to="/login" replace />;
//   if (allowedRoles && !allowedRoles.includes(user.role)) {
//     return <Navigate to={`/dashboard/${user.role.replace('_', '-')}`} replace />;
//   }
//   return children;
// }

// function RootRedirect() {
//   const { user, loading } = useAuth();
//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-neutral-50">
//         <div className="text-neutral-500 text-sm">Loading…</div>
//       </div>
//     );
//   }
//   if (user) {
//     const path = `/dashboard/${user.role.replace('_', '-')}`;
//     return <Navigate to={path} replace />;
//   }
//   return <Navigate to="/login" replace />;
// }

// function App() {
//   return (
//     <div className="App">
//       <AuthProvider>
//         <BrowserRouter>
//           <Toaster position="top-right" richColors closeButton />
//           <Routes>
//             <Route path="/" element={<RootRedirect />} />
//             <Route path="/login" element={<RoleSelectionPage />} />
//             <Route path="/login/:role" element={<LoginPage />} />
//             <Route
//               path="/dashboard/owner"
//               element={
//                 <ProtectedRoute allowedRoles={["owner"]}>
//                   <OwnerDashboard />
//                 </ProtectedRoute>
//               }
//             />
//             <Route
//               path="/dashboard/cashier"
//               element={
//                 <ProtectedRoute allowedRoles={["cashier"]}>
//                   <CashierDashboard />
//                 </ProtectedRoute>
//               }
//             />
//             <Route
//               path="/dashboard/warehouse"
//               element={
//                 <ProtectedRoute allowedRoles={["warehouse"]}>
//                   <WarehouseDashboard />
//                 </ProtectedRoute>
//               }
//             />
//             <Route
//               path="/dashboard/data-entry"
//               element={
//                 <ProtectedRoute allowedRoles={["data_entry"]}>
//                   <DataEntryDashboard />
//                 </ProtectedRoute>
//               }
//             />
//             <Route
//               path="/dashboard/verification"
//               element={
//                 <ProtectedRoute allowedRoles={["verification"]}>
//                   <StaffDashboard />
//                 </ProtectedRoute>
//               }
//             />
//             <Route path="*" element={<RootRedirect />} />
//           </Routes>
//         </BrowserRouter>
//       </AuthProvider>
//     </div>
//   );
// }

// export default App;


import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import RoleSelectionPage from "@/pages/RoleSelectionPage";
import LoginPage from "@/pages/LoginPage";
import OwnerDashboard from "@/pages/OwnerDashboard";
import WarehouseDashboard from "@/pages/WarehouseDashboard";
import CashierDashboard from "@/pages/CashierDashboard";
import DataEntryDashboard from "@/pages/DataEntryDashboard";
import StaffDashboard from "@/pages/StaffDashboard";

import PurchaseDashboard from "./purchagedashboard/PurchaseDashboard";
import {
  PurchaseRequest,
  NoteForApproval,
  PurchaseOrder,
  GoodsReceiptNote,
} from "./purchagedashboard/pages/NoteForApproval";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-500 text-sm">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/dashboard/${user.role.replace("_", "-")}`} replace />;
  }
  return children;
}



function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-500 text-sm">Loading…</div>
      </div>
    );
  }
  if (user) {
    const path = `/dashboard/${user.role.replace("_", "-")}`;
    return <Navigate to={path} replace />;
  }
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors closeButton />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<RoleSelectionPage />} />
            <Route path="/login/:role" element={<LoginPage />} />

            <Route
              path="/dashboard/owner"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/purchase"
              element={
                <ProtectedRoute allowedRoles={["purchase"]}>
                  <PurchaseDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/purchase/purchase-request"
              element={
                <ProtectedRoute allowedRoles={["purchase"]}>
                  <PurchaseRequest />
                </ProtectedRoute>
              }
            />

            <Route
              path="/purchase/note-for-approval"
              element={
                <ProtectedRoute allowedRoles={["purchase"]}>
                  <NoteForApproval />
                </ProtectedRoute>
              }
            />

            <Route
              path="/purchase/purchase-order"
              // element={
              //   <ProtectedRoute allowedRoles={["purchase"]}>
              //     <PurchaseOrder />
              //   </ProtectedRoute>
              // }
            />

            <Route
              path="/purchase/goods-receipt-note"
              // element={
              //   <ProtectedRoute allowedRoles={["purchase"]}>
              //     <GoodsReceiptNote />
              //   </ProtectedRoute>
              // }
            />

            <Route
              path="/dashboard/cashier"
              element={
                <ProtectedRoute allowedRoles={["cashier"]}>
                  <CashierDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/warehouse"
              element={
                <ProtectedRoute allowedRoles={["warehouse"]}>
                  <WarehouseDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/data-entry"
              element={
                <ProtectedRoute allowedRoles={["data_entry"]}>
                  <DataEntryDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/verification"
              element={
                <ProtectedRoute allowedRoles={["verification"]}>
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;