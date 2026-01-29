import React, { useState, useEffect } from 'react';
import { useStore } from '../services/StoreContext';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { LayoutGrid, ChefHat, Package, History, Settings, LogOut, Clock, Menu, PlayCircle, StopCircle, User, Users } from 'lucide-react';
import { MenuItem } from '../types';

export const Layout: React.FC = () => {
  const { currentUser, logout, storeSession, openShop, closeShop, menu, inventory } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  // --- Open Shop Modal State ---
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [dailyMenu, setDailyMenu] = useState<MenuItem[]>([]);

  // Initialize daily menu when opening modal
  useEffect(() => {
    if (showOpenModal) {
      setDailyMenu(menu.map(m => {
          // Calculate max stock dynamically
          let maxPossible = 9999;
          if (m.ingredients && m.ingredients.length > 0) {
             m.ingredients.forEach(ingName => {
                 const invItem = inventory.find(i => i.name === ingName);
                 if (invItem) {
                     // Simple 1-to-1 assumption for stock calculation base
                     const limit = Math.floor(invItem.quantity / 1); 
                     if (limit < maxPossible) maxPossible = limit;
                 } else {
                     maxPossible = 0;
                 }
             });
          } else {
             maxPossible = 999;
          }

          // If master menu says "Available", we set it available and set stock to Max.
          const isMasterAvailable = m.isAvailable;
          const initialStock = isMasterAvailable ? maxPossible : 0;
          
          // If maxPossible is 0 due to ingredients, force disable
          const finalAvailable = isMasterAvailable && maxPossible > 0;

          return { 
            ...m, 
            dailyStock: initialStock, 
            isAvailable: finalAvailable 
          };
      }));
    }
  }, [showOpenModal, menu, inventory]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenShopSubmit = async () => {
      const stockMap: Record<string, number> = {};
      dailyMenu.forEach(m => {
          stockMap[m.id] = m.dailyStock;
      });
      await openShop(stockMap, currentUser?.name || 'Admin');
      setShowOpenModal(false);
  };

  const handleCloseShop = () => {
      if(confirm("ยืนยันการปิดร้าน? (ระบบจะสรุปยอดขายและเคลียร์โต๊ะ)")) {
          closeShop(currentUser?.name || 'Admin');
      }
  };

  const handleDailyStockChange = (id: string, val: number) => {
      setDailyMenu(prev => prev.map(m => m.id === id ? { ...m, dailyStock: val, isAvailable: val > 0 } : m));
  };

  const navItems = [
    { path: '/floorplan', label: 'ผังที่นั่ง', icon: LayoutGrid },
    { path: '/kitchen', label: 'ห้องครัว', icon: ChefHat },
    { path: '/inventory', label: 'คลังสินค้า', icon: Package },
    { path: '/history', label: 'ประวัติ', icon: History },
    { path: '/menu', label: 'จัดการเมนู', icon: Menu },
    { path: '/staff', label: 'พนักงาน', icon: Users },
    { path: '/admin', label: 'Admin', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-stone-100 font-sans text-stone-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-24 bg-stone-900 flex flex-col items-center py-6 gap-6 shadow-xl z-20">
         <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-red-900/50">
            T
         </div>
         
         <nav className="flex-1 flex flex-col gap-4 w-full px-2">
            {navItems.map(item => {
               const isActive = location.pathname === item.path;
               return (
                 <Link 
                   key={item.path} 
                   to={item.path}
                   className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${isActive ? 'bg-red-600 text-white shadow-lg shadow-red-900/50 translate-x-1' : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'}`}
                 >
                    <item.icon size={24} />
                    <span className="text-[10px] mt-1 font-bold">{item.label}</span>
                 </Link>
               )
            })}
         </nav>

         <button 
           onClick={handleLogout}
           className="mt-auto text-stone-500 hover:text-red-400 p-3 rounded-xl hover:bg-white/5 transition-colors"
         >
            <LogOut size={24} />
         </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
         {/* Header */}
         <header className="h-20 bg-white border-b border-stone-200 px-8 flex items-center justify-between shadow-sm z-10">
            <div>
               <h1 className="text-2xl font-bold text-stone-800">Triad Restaurant</h1>
               <div className="flex items-center gap-2 text-stone-400 text-xs">
                  <Clock size={12} />
                  <span>{new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
               </div>
            </div>

            <div className="flex items-center gap-6">
               {/* Shop Status Control */}
               {storeSession.isOpen ? (
                   <div className="flex items-center gap-4 bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                       <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          <span className="text-sm font-bold text-green-700">Open</span>
                       </div>
                       <button 
                         onClick={handleCloseShop}
                         className="bg-white text-stone-600 hover:text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-stone-200 hover:border-red-200 transition-colors flex items-center gap-1"
                       >
                          <StopCircle size={14} /> ปิดร้าน
                       </button>
                   </div>
               ) : (
                   <button 
                     onClick={() => setShowOpenModal(true)}
                     className="bg-stone-800 text-white hover:bg-stone-900 px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                   >
                      <PlayCircle size={18} /> เปิดร้าน (Open Shop)
                   </button>
               )}

               <div className="h-8 w-px bg-stone-200"></div>

               <div className="flex items-center gap-3">
                  <div className="text-right">
                     <div className="text-sm font-bold text-stone-800">{currentUser?.name}</div>
                     <div className="text-xs text-stone-500">{currentUser?.position}</div>
                  </div>
                  <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center text-stone-500 overflow-hidden">
                     <User size={20} />
                  </div>
               </div>
            </div>
         </header>

         {/* Page Content */}
         <div className="flex-1 p-8 overflow-hidden bg-stone-100">
            <Outlet />
         </div>
      </main>

      {/* Open Shop Modal */}
      {showOpenModal && (
         <div className="fixed inset-0 bg-stone-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="bg-stone-800 p-6 text-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2"><PlayCircle /> เตรียมความพร้อมก่อนเปิดร้าน</h2>
                        <p className="text-stone-400 text-sm mt-1">ตรวจสอบและกำหนดจำนวนอาหารที่พร้อมขายวันนี้</p>
                    </div>
                    <button onClick={() => setShowOpenModal(false)} className="text-stone-400 hover:text-white">Close</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {dailyMenu.map(item => (
                            <div key={item.id} className={`bg-white p-4 rounded-xl border ${item.isAvailable ? 'border-green-200 shadow-sm' : 'border-stone-200 opacity-60'}`}>
                                <div className="font-bold text-stone-800 mb-1 truncate">{item.name}</div>
                                <div className="text-xs text-stone-500 mb-3">{item.category}</div>
                                <div className="flex items-center gap-2">
                                    <input 
                                       type="number" 
                                       className={`w-full p-2 border rounded-lg text-center font-bold outline-none focus:ring-2 ${item.isAvailable ? 'border-green-300 bg-green-50 text-green-800 focus:ring-green-500' : 'border-stone-200 bg-stone-100 text-stone-400'}`}
                                       value={item.dailyStock}
                                       onChange={(e) => handleDailyStockChange(item.id, parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-stone-200 flex justify-end gap-3 shrink-0">
                    <button onClick={() => setShowOpenModal(false)} className="px-6 py-3 rounded-xl border border-stone-300 text-stone-600 font-bold hover:bg-stone-50">ยกเลิก</button>
                    <button onClick={handleOpenShopSubmit} className="px-8 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-600/20">
                        ยืนยันเปิดร้าน
                    </button>
                </div>
             </div>
         </div>
      )}
    </div>
  );
};