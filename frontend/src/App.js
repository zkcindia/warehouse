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
import StaffDashboard from "@/pages/StaffDashboard";

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
    return <Navigate to={`/dashboard/${user.role.replace('_', '-')}`} replace />;
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
    const path = `/dashboard/${user.role.replace('_', '-')}`;
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
                  <StaffDashboard />
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
