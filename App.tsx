import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './services/StoreContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { FloorPlan } from './components/FloorPlan';
import { KitchenView } from './components/KitchenView';
import { InventoryView } from './components/InventoryView';
import { AdminDashboard } from './components/AdminDashboard';
import MenuManagement from './components/MenuManagement';
import { StaffManagement } from './components/StaffManagement';
import { HistoryView } from './components/HistoryView';

// Protected Route Component: Checks if user is logged in
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useStore();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/floorplan" replace />} />
        <Route path="floorplan" element={<FloorPlan />} />
        <Route path="kitchen" element={<KitchenView />} />
        <Route path="inventory" element={<InventoryView />} />
        <Route path="history" element={<HistoryView />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="menu" element={<MenuManagement />} />
        <Route path="staff" element={<StaffManagement />} />
      </Route>

      {/* Catch all redirect */}
      <Route path="*" element={<Navigate to="/floorplan" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </StoreProvider>
  );
}