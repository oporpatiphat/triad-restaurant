import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useStore } from '../services/StoreContext';
import { Role, OrderStatus, MenuItem } from '../types';
import { Armchair, ChefHat, Refrigerator, LogOut, Coffee, Users, History, Crown, Clock, X, Check, Search, AlertCircle, Minus, Plus, Calculator, Infinity, Cloud, CloudOff, Activity } from 'lucide-react';

export const Layout: React.FC = () => {
  const { currentUser, logout, storeSession, openStore, closeStore, orders, menu, isCloudMode } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [dailyMenu, setDailyMenu] = useState<MenuItem[]>([]);
  const [menuSearch, setMenuSearch] = useState('');

  // Determine active tab from URL
  const currentPath = location.pathname.split('/')[1] || 'floorplan';

  // Calculate notifications
  const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING).length;
  const servingOrders = orders.filter(o => o.status === OrderStatus.SERVING).length;

  // --- PERMISSION LOGIC ---
  const pos = currentUser?.position || '';
  
  // 1. Can Open/Close Store: Admin, Co-CEO, CEO, Manager, Fulltime (NOT Parttime)
  const canOperateStore = ['Admin', 'Co-CEO', 'CEO', 'Manager', 'Fulltime'].includes(pos);

  useEffect(() => {
    if (showOpenModal) {
      setDailyMenu(menu.map(m => ({ 
        ...m, 
        dailyStock: 0, 
        isAvailable: false 
      })));
    }
  }, [showOpenModal, menu]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenStoreClick = () => {
    setShowOpenModal(true);
  };

  const handleConfirmOpen = () => {
    const hasAvailableItems = dailyMenu.some(item => item.isAvailable);
    if (!hasAvailableItems) {
      alert("ไม่สามารถเปิดร้านได้: กรุณากำหนดเมนูที่พร้อมขายอย่างน้อย 1 รายการ");
      return;
    }
    openStore(dailyMenu);
    setShowOpenModal(false);
  };

  const updateDailyItem = (id: string, updates: Partial<MenuItem>) => {
    setDailyMenu(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const updateStockQuantity = (id: string, delta: number) => {
    setDailyMenu(prev => prev.map(item => {
        if (item.id !== id) return item;
        const currentStock = item.dailyStock === -1 ? 0 : item.dailyStock;
        const newStock = Math.max(0, currentStock + delta);
        
        const newAvailability = newStock > 0;
        
        return { ...item, dailyStock: newStock, isAvailable: newAvailability };
    }));
  };

  // Define Menus with custom permission checks
  const operationMenu = [
    { id: 'floorplan', label: 'ผังร้าน (Floor)', icon: Armchair, badge: servingOrders },
    { id: 'kitchen', label: 'งานครัว (Kitchen)', icon: ChefHat, badge: pendingOrders },
    { id: 'history', label: 'ประวัติ (History)', icon: History },
    { id: 'inventory', label: 'ตู้เย็น (Stock)', icon: Refrigerator }, 
    { id: 'admin', label: 'คำนวณวัตถุดิบ', icon: Calculator },
  ];

  const managementMenu = [
    { id: 'menu', label: 'จัดการเมนู', icon: Coffee },
    { id: 'staff', label: 'พนักงาน', icon: Users },
    { id: 'activity', label: 'ติดตามงาน', icon: Activity },
  ];

  const categories = ['Main Dish', 'Appetizer', 'Soup', 'Drink', 'Set', 'Other'];

  const renderMenuItem = (item: any) => {
    const isActive = currentPath === item.id;
    return (
      <button
        key={item.id}
        onClick={() => navigate(`/${item.id}`)}
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
          isActive
            ? 'bg-red-800 text-amber-400 shadow-inner font-bold' 
            : 'text-red-100/80 hover:bg-red-900/50 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3 relative z-10">
          <item.icon size={20} className={`${isActive ? 'text-amber-400' : 'text-red-300 group-hover:text-white'} transition-colors`} />
          <span className="text-sm tracking-wide">{item.label}</span>
        </div>
        
        {/* Notification Badge */}
        {item.badge > 0 && (
          <div className="relative z-10">
             <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold px-1.5 border border-red-400 animate-pulse shadow-sm">
               {item.badge}
             </span>
          </div>
        )}
      </button>
    );
  };

  const canManage = currentUser?.role === Role.OWNER;
  const isMenuReady = dailyMenu.some(m => m.isAvailable);

  return (
    <div className="flex h-screen bg-[#F5F5F4] overflow-hidden">
      <aside className="w-64 bg-gradient-to-b from-red-900 to-red-950 text-white flex flex-col shadow-xl relative z-20">
        {/* Brand Header */}
        <div className="p-6 border-b border-red-800/50">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-lg text-red-900">
               <Crown size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-amber-400 tracking-wide font-heading leading-none">Triad Restaurant</h1>
              <p className="text-[10px] text-red-200 tracking-[0.2em] font-medium mt-1">BY LI GROUP</p>
            </div>
          </div>
          
          {/* Cloud Status Indicator */}
          <div className={`mt-4 flex items-center gap-2 text-xs px-2 py-1 rounded border ${isCloudMode ? 'bg-green-900/30 border-green-800 text-green-300' : 'bg-stone-900/30 border-stone-700 text-stone-400'}`}>
             {isCloudMode ? <Cloud size={12} /> : <CloudOff size={12} />}
             <span>{isCloudMode ? 'Cloud Online' : 'Local Mode'}</span>
          </div>
        </div>

        {/* Store Status */}
        <div className="px-6 py-4 bg-red-950/30">
            <div className="flex flex-col gap-2 p-3 bg-red-900/40 rounded-lg border border-red-800/50">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${storeSession.isOpen ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500'}`}></div>
                   <span className="text-xs text-red-100 font-medium tracking-wide">{storeSession.isOpen ? 'OPEN' : 'CLOSED'}</span>
                 </div>
                 {canOperateStore && (
                   <button 
                    onClick={storeSession.isOpen ? closeStore : handleOpenStoreClick}
                    className={`text-[10px] font-bold px-3 py-1 rounded transition-colors tracking-wider ${storeSession.isOpen ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-green-700 text-white'}`}
                   >
                     {storeSession.isOpen ? 'CLOSE' : 'OPEN'}
                   </button>
                 )}
               </div>
               {storeSession.isOpen && (
                 <div className="flex items-center gap-1.5 text-[10px] text-red-300">
                    <Clock size={10} />
                    <span>Opened: {storeSession.openedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                 </div>
               )}
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            <div>
              <h3 className="px-4 text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Operation</h3>
              <div className="space-y-1">
                {operationMenu.map(renderMenuItem)}
              </div>
            </div>

            {canManage && (
              <div>
                <h3 className="px-4 text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Management</h3>
                <div className="space-y-1">
                  {managementMenu.map(renderMenuItem)}
                </div>
              </div>
            )}
        </nav>

        {/* User Profile */}
        <div className="p-4 bg-red-950 border-t border-red-900">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-amber-600 flex items-center justify-center text-red-900 font-bold text-sm">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{currentUser?.name}</p>
              <p className="text-[10px] text-red-300 uppercase tracking-wider">{currentUser?.position}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-800 text-red-200 hover:text-white py-2 rounded-lg transition-colors text-xs font-medium border border-red-800"
          >
            <LogOut size={14} />
            ลงชื่อออก
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 relative bg-stone-100">
        {!storeSession.isOpen && currentPath !== 'admin' && currentPath !== 'menu' && currentPath !== 'staff' && currentPath !== 'inventory' && currentPath !== 'activity' ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-200/90 backdrop-blur-sm z-10">
             <div className="bg-white p-10 rounded-2xl shadow-2xl text-center border-t-4 border-red-600 max-w-sm">
                <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                  <Crown size={32} />
                </div>
                <h2 className="text-2xl font-bold text-stone-800 mb-2 font-heading">ร้านยังไม่เปิด</h2>
                <p className="text-stone-500 text-sm">กรุณาให้ผู้จัดการหรือ Fulltime เปิดร้าน<br/>เพื่อเริ่มระบบรับออเดอร์</p>
             </div>
           </div>
        ) : (
          <div className="max-w-7xl mx-auto animate-fade-in pb-10">
            <Outlet />
          </div>
        )}
      </main>

      {/* Daily Menu Setup Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-red-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Coffee /> ตั้งค่าเมนูประจำวัน
                </h2>
                <p className="text-red-200 text-sm mt-1">กำหนดจำนวนขายและสถานะเมนูสำหรับวันนี้</p>
              </div>
              <button onClick={() => setShowOpenModal(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                <X />
              </button>
            </div>
            
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex gap-4">
               <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                 <input 
                   type="text" 
                   placeholder="ค้นหาเมนู..." 
                   value={menuSearch} 
                   onChange={e => setMenuSearch(e.target.value)}
                   className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
                 />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
               {categories.map(category => {
                 const categoryItems = dailyMenu.filter(m => 
                   m.category === category &&
                   m.name.toLowerCase().includes(menuSearch.toLowerCase())
                 );
                 
                 if (categoryItems.length === 0) return null;

                 return (
                   <div key={category} className="mb-8">
                     <h3 className="font-bold text-lg text-stone-700 mb-3 sticky top-0 bg-stone-50 py-2 z-10 border-b border-stone-200 flex items-center gap-2">
                        <span className="w-1 h-6 bg-red-50 rounded-full"></span>
                        {category}
                     </h3>
                     <div className="grid grid-cols-2 gap-4">
                       {categoryItems.map(item => (
                         <div key={item.id} className={`bg-white p-4 rounded-xl border-2 transition-all ${item.isAvailable ? 'border-green-500/30' : 'border-stone-200 bg-stone-50'}`}>
                            <div className="flex justify-between items-start mb-3">
                               <div>
                                  <div className={`font-bold ${item.isAvailable ? 'text-stone-800' : 'text-stone-500'}`}>{item.name}</div>
                                  <div className="text-xs text-stone-500">{item.category}</div>
                               </div>
                               <button 
                                 onClick={() => updateDailyItem(item.id, { isAvailable: !item.isAvailable })}
                                 className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                               >
                                 {item.isAvailable ? 'พร้อมขาย' : 'หมด/ไม่ขาย'}
                               </button>
                            </div>
                            
                            <div className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                              <div className="flex items-center justify-between mb-2">
                                 <span className="text-xs font-medium text-stone-500">จำนวนขายวันนี้ (ชิ้น)</span>
                                 <span className="text-xs text-stone-400 whitespace-nowrap">
                                  {item.dailyStock === -1 ? '(ไม่จำกัด)' : 'จำกัดจำนวน'}
                                 </span>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                  <div className="flex items-center bg-white rounded-lg border border-stone-300 flex-1 overflow-hidden h-10 shadow-sm">
                                      <button 
                                        onClick={() => updateStockQuantity(item.id, -1)}
                                        className="w-10 h-full flex items-center justify-center text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors border-r border-stone-200 active:bg-red-100"
                                      >
                                        <Minus size={16} strokeWidth={2.5} />
                                      </button>
                                      
                                      <input 
                                        type="number" 
                                        value={item.dailyStock === -1 ? '' : item.dailyStock === 0 ? '' : item.dailyStock}
                                        placeholder={item.dailyStock === -1 ? "∞" : "0"}
                                        onChange={(e) => {
                                          const valStr = e.target.value;
                                          if (valStr === '' || valStr === '0') {
                                            updateDailyItem(item.id, { dailyStock: 0, isAvailable: false });
                                          } else {
                                            updateDailyItem(item.id, { dailyStock: parseInt(valStr), isAvailable: true });
                                          }
                                        }}
                                        className="w-full text-center outline-none text-base font-bold bg-transparent no-spinner text-stone-800 placeholder-stone-300"
                                      />

                                      <button 
                                        onClick={() => updateStockQuantity(item.id, 1)}
                                        className="w-10 h-full flex items-center justify-center text-stone-500 hover:text-green-600 hover:bg-green-50 transition-colors border-l border-stone-200 active:bg-green-100"
                                      >
                                        <Plus size={16} strokeWidth={2.5} />
                                      </button>
                                  </div>
                                  
                                  <button
                                    onClick={() => updateDailyItem(item.id, { dailyStock: -1, isAvailable: true })}
                                    className={`h-10 aspect-square flex items-center justify-center rounded-lg border transition-colors shadow-sm ${item.dailyStock === -1 ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-stone-300 text-stone-400 hover:bg-stone-50'}`}
                                    title="ไม่จำกัด (Unlimited)"
                                  >
                                    <Infinity size={20} />
                                  </button>
                              </div>
                              
                              <div className="flex gap-1 mt-2">
                                 {[5, 10, 20].map(val => (
                                   <button
                                     key={val}
                                     onClick={() => updateStockQuantity(item.id, val)}
                                     className="flex-1 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-500 hover:text-green-600 hover:border-green-200 hover:bg-green-50 transition-colors shadow-sm"
                                   >
                                     +{val}
                                   </button>
                                 ))}
                              </div>

                            </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 );
               })}
               
               {dailyMenu.filter(m => m.name.toLowerCase().includes(menuSearch.toLowerCase())).length === 0 && (
                 <div className="text-center p-8 text-stone-400">
                    ไม่พบเมนูที่ค้นหา
                 </div>
               )}
            </div>

            <div className="p-6 bg-white border-t border-stone-200 flex justify-between items-center">
               <div className="text-sm">
                 {!isMenuReady && (
                   <span className="flex items-center gap-2 text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 animate-pulse">
                     <AlertCircle size={16} /> กรุณาเลือกเมนูที่พร้อมขายอย่างน้อย 1 รายการ
                   </span>
                 )}
               </div>
               <div className="flex gap-3">
                  <button onClick={() => setShowOpenModal(false)} className="px-6 py-3 rounded-xl border border-stone-300 text-stone-600 font-bold hover:bg-stone-50 transition-colors">
                    ยกเลิก
                  </button>
                  <button 
                    onClick={handleConfirmOpen}
                    disabled={!isMenuReady} 
                    className={`px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2 shadow-lg transition-all ${isMenuReady ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' : 'bg-stone-300 cursor-not-allowed shadow-none'}`}
                  >
                    <Check size={20} />
                    ยืนยันเปิดร้าน
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};