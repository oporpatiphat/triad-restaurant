import React, { useState } from 'react';
import { StoreProvider, useStore } from './services/StoreContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { FloorPlan } from './components/FloorPlan';
import { KitchenView } from './components/KitchenView';
import { InventoryView } from './components/InventoryView';
import { AdminDashboard } from './components/AdminDashboard';
import { MenuManagement } from './components/MenuManagement';
import { StaffManagement } from './components/StaffManagement';
import { HistoryView } from './components/HistoryView';

const MainApp: React.FC = () => {
  const { currentUser } = useStore();
  const [activeTab, setActiveTab] = useState('floorplan');

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'floorplan' && <FloorPlan />}
      {activeTab === 'kitchen' && <KitchenView />}
      {activeTab === 'inventory' && <InventoryView />}
      {activeTab === 'history' && <HistoryView />}
      {activeTab === 'admin' && <AdminDashboard />}
      {activeTab === 'menu' && <MenuManagement />}
      {activeTab === 'staff' && <StaffManagement />}
    </Layout>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainApp />
    </StoreProvider>
  );
}