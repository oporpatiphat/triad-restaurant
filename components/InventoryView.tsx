import React, { useState } from 'react';
import { useStore } from '../services/StoreContext';
import { Refrigerator, AlertTriangle, Minus, Plus, PlusCircle, X, Save, Trash2, Eye, Package, Layers, CheckCircle, RotateCcw, Edit3 } from 'lucide-react';
import { Ingredient, IngredientCategory, Role } from '../types';

export const InventoryView: React.FC = () => {
  const { inventory, updateIngredientQuantity, addIngredient, removeIngredient, currentUser } = useStore();
  
  // --- STATE ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // Draft State: Stores changes before saving { [itemId]: newQuantity }
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({});

  const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
    name: '',
    category: 'ของแห้ง/อื่นๆ',
    quantity: 0,
    unit: 'ชิ้น',
    threshold: 0
  });

  const canEdit = currentUser?.role === Role.OWNER;
  const categories: IngredientCategory[] = ['เนื้อสัตว์', 'ผัก', 'ไวน์', 'ของแห้ง/อื่นๆ'];

  // --- HELPERS ---

  const getCategoryIcon = (cat: IngredientCategory) => {
    switch (cat) {
        case 'เนื้อสัตว์': return '🥩';
        case 'ผัก': return '🥬';
        case 'ไวน์': return '🍷';
        default: return '📦';
    }
  }

  // Get value to display (Draft or Real)
  const getDisplayQuantity = (item: Ingredient): number => {
    const draftVal = pendingChanges[item.id];
    return draftVal !== undefined ? draftVal : item.quantity;
  };

  // Check if item is modified
  const isModified = (item: Ingredient) => {
    const draftVal = pendingChanges[item.id];
    return draftVal !== undefined && draftVal !== item.quantity;
  };

  const hasAnyChanges = Object.keys(pendingChanges).length > 0;

  // --- ACTIONS ---

  const handleDraftChange = (itemId: string, newQty: number) => {
    const safeQty = Math.max(0, newQty);
    const originalItem = inventory.find(i => i.id === itemId);
    
    // If matches original, remove from pending
    if (originalItem && originalItem.quantity === safeQty) {
        const next = { ...pendingChanges };
        delete next[itemId];
        setPendingChanges(next);
    } else {
        setPendingChanges(prev => ({ ...prev, [itemId]: safeQty }));
    }
  };

  const handleDeltaChange = (itemId: string, delta: number) => {
    const originalItem = inventory.find(i => i.id === itemId);
    if (!originalItem) return;
    
    const currentDisplay = getDisplayQuantity(originalItem);
    handleDraftChange(itemId, currentDisplay + delta);
  };

  const handleSaveChanges = async () => {
    // Process all pending changes
    for (const [id, newQty] of Object.entries(pendingChanges)) {
        const originalItem = inventory.find(i => i.id === id);
        if (originalItem) {
            const delta = newQty - originalItem.quantity;
            if (delta !== 0) {
                // We use existing context function which takes delta
                await updateIngredientQuantity(id, delta);
            }
        }
    }
    setPendingChanges({}); // Clear drafts
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  const handleCancelChanges = () => {
    if (confirm("คุณต้องการยกเลิกการแก้ไขทั้งหมดใช่หรือไม่? ค่าจะกลับไปเป็นล่าสุด")) {
        setPendingChanges({});
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIngredient.name) {
      addIngredient({
        id: `ing-${Date.now()}`,
        name: newIngredient.name,
        category: newIngredient.category as IngredientCategory,
        quantity: Number(newIngredient.quantity) || 0,
        unit: 'ชิ้น',
        threshold: 0
      });
      setShowAddModal(false);
      setNewIngredient({
        name: '',
        category: 'ของแห้ง/อื่นๆ',
        quantity: 0,
        unit: 'ชิ้น',
        threshold: 0
      });
    } else {
      alert("กรุณากรอกชื่อวัตถุดิบ");
    }
  };

  const handleRemove = (item: Ingredient) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบวัตถุดิบ "${item.name}"?`)) {
      removeIngredient(item.id);
      // Also remove from pending if exists
      if (pendingChanges[item.id]) {
          const next = { ...pendingChanges };
          delete next[item.id];
          setPendingChanges(next);
      }
    }
  };

  // Stats Calculation (Based on Real Data, not Draft)
  const totalItems = inventory.length;
  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockItems = inventory.filter(i => i.quantity <= 5).length;

  return (
    <div className="h-full flex flex-col relative">
      {/* Header & Stats Dashboard */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h2 className="text-3xl font-bold text-stone-800 flex items-center gap-2">
                    <Refrigerator className="text-red-600" /> ตู้เย็น / คลังวัตถุดิบ (Stock)
                </h2>
                {!canEdit ? (
                    <div className="text-sm text-stone-500 flex items-center gap-1 mt-1">
                        <Eye size={14} /> Read-Only Mode (คุณดูข้อมูลได้อย่างเดียว)
                    </div>
                ) : (
                    <div className="text-sm text-stone-500 flex items-center gap-1 mt-1">
                        <Edit3 size={14} /> Edit Mode: แก้ไขตัวเลขและกดบันทึกเพื่อยืนยัน
                    </div>
                )}
            </div>
            {canEdit && (
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all hover:-translate-y-0.5"
                >
                    <PlusCircle size={20} /> เพิ่มวัตถุดิบใหม่
                </button>
            )}
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Package size={24} />
               </div>
               <div>
                  <div className="text-sm text-stone-500 font-bold uppercase tracking-wide">รายการทั้งหมด</div>
                  <div className="text-2xl font-bold text-stone-800">{totalItems} <span className="text-sm font-normal text-stone-400">รายการ</span></div>
               </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Layers size={24} />
               </div>
               <div>
                  <div className="text-sm text-stone-500 font-bold uppercase tracking-wide">จำนวนของในคลัง</div>
                  <div className="text-2xl font-bold text-stone-800">{totalQuantity.toLocaleString()} <span className="text-sm font-normal text-stone-400">ชิ้น</span></div>
               </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex items-center gap-4">
               <div className={`w-12 h-12 rounded-full flex items-center justify-center ${lowStockItems > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
                  <AlertTriangle size={24} />
               </div>
               <div>
                  <div className="text-sm text-stone-500 font-bold uppercase tracking-wide">ของใกล้หมด (≤ 5)</div>
                  <div className={`text-2xl font-bold ${lowStockItems > 0 ? 'text-red-600' : 'text-green-600'}`}>{lowStockItems} <span className="text-sm font-normal text-stone-400">รายการ</span></div>
               </div>
            </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 overflow-y-auto space-y-8 pb-24 pr-2">
        {categories.map(category => {
          const items = inventory.filter(i => i.category === category);
          
          return (
            <div key={category}>
               <div className={`flex items-center gap-2 mb-4 px-2`}>
                  <div className={`w-2 h-8 rounded-full ${category === 'เนื้อสัตว์' ? 'bg-red-500' : category === 'ผัก' ? 'bg-green-500' : category === 'ไวน์' ? 'bg-purple-500' : 'bg-amber-500'}`}></div>
                  <h3 className="font-bold text-xl text-stone-800">{category}</h3>
                  <span className="text-sm bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full font-bold">{items.length}</span>
               </div>
               
               {items.length === 0 ? (
                 <div className="p-8 text-center text-stone-400 text-sm bg-white rounded-xl border border-dashed border-stone-300">
                    ไม่มีรายการในหมวดหมู่นี้
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {items.map(item => {
                        const modified = isModified(item);
                        const displayQty = getDisplayQuantity(item);
                        const isLow = displayQty <= 5;
                        
                        return (
                           <div key={item.id} className={`group bg-white rounded-xl p-4 border transition-all relative overflow-hidden ${modified ? 'border-blue-400 shadow-md ring-1 ring-blue-100' : isLow ? 'border-red-300 shadow-red-100' : 'border-stone-200 shadow-sm'}`}>
                              {/* Background Icon Watermark */}
                              <div className="absolute -bottom-4 -right-4 text-8xl opacity-[0.03] pointer-events-none select-none grayscale">
                                 {getCategoryIcon(category)}
                              </div>

                              <div className="flex justify-between items-start mb-3 relative z-10">
                                 <div>
                                    <div className="flex items-center gap-2">
                                       <span className="text-2xl">{getCategoryIcon(category)}</span>
                                       <div className={`font-bold text-lg line-clamp-1 ${modified ? 'text-blue-700' : 'text-stone-800'}`}>{item.name}</div>
                                    </div>
                                    <div className="text-xs text-stone-400 mt-1 pl-1">ID: {item.id}</div>
                                 </div>
                                 {modified ? (
                                     <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 px-2 py-1 rounded-bl-lg shadow-sm text-[10px] font-bold">
                                         Edited
                                     </div>
                                 ) : isLow && (
                                     <div className="absolute top-0 right-0 bg-red-100 text-red-600 p-1.5 rounded-bl-lg shadow-sm">
                                         <AlertTriangle size={16} />
                                     </div>
                                 )}
                              </div>

                              <div className={`rounded-lg p-2 border relative z-10 ${modified ? 'bg-blue-50 border-blue-200' : 'bg-stone-50 border-stone-100'}`}>
                                 <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-bold uppercase ${modified ? 'text-blue-500' : 'text-stone-500'}`}>Quantity ({item.unit})</span>
                                 </div>
                                 <div className="flex items-center justify-between gap-1">
                                     {canEdit && (
                                         <button 
                                           onClick={() => handleDeltaChange(item.id, -1)}
                                           className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 rounded text-stone-500 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm active:bg-stone-200"
                                         >
                                            <Minus size={16} />
                                         </button>
                                     )}
                                     
                                     {canEdit ? (
                                         <input 
                                            type="number"
                                            value={displayQty}
                                            onChange={(e) => handleDraftChange(item.id, parseInt(e.target.value) || 0)}
                                            className={`flex-1 w-full text-center font-bold text-2xl bg-transparent outline-none no-spinner focus:border-b-2 ${modified ? 'text-blue-700 focus:border-blue-500' : isLow ? 'text-red-600 focus:border-red-500' : 'text-stone-800 focus:border-stone-400'}`}
                                         />
                                     ) : (
                                         <div className={`flex-1 text-center font-bold text-2xl ${isLow ? 'text-red-600' : 'text-stone-800'}`}>
                                            {displayQty}
                                         </div>
                                     )}

                                     {canEdit && (
                                         <button 
                                           onClick={() => handleDeltaChange(item.id, 1)}
                                           className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 rounded text-stone-500 hover:text-green-500 hover:bg-green-50 transition-colors shadow-sm active:bg-stone-200"
                                         >
                                            <Plus size={16} />
                                         </button>
                                     )}
                                 </div>
                              </div>
                              
                              {canEdit && (
                                 <div className="mt-3 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 relative z-10">
                                    <button 
                                      onClick={() => handleDeltaChange(item.id, 5)}
                                      className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold py-1.5 rounded border border-stone-200"
                                    >
                                       +5
                                    </button>
                                    <button 
                                      onClick={() => handleDeltaChange(item.id, 10)}
                                      className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold py-1.5 rounded border border-stone-200"
                                    >
                                       +10
                                    </button>
                                    <button 
                                      onClick={() => handleRemove(item)}
                                      className="p-1.5 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              )}
                           </div>
                        );
                    })}
                 </div>
               )}
            </div>
          );
        })}
      </div>

      {/* UNSAVED CHANGES BAR */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40 transition-all duration-300 border border-stone-700 ${hasAnyChanges ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col">
              <span className="font-bold text-lg flex items-center gap-2">
                 <Edit3 size={18} className="text-blue-400" />
                 มีการแก้ไข {Object.keys(pendingChanges).length} รายการ
              </span>
              <span className="text-xs text-stone-400">กรุณากดบันทึกเพื่อยืนยันข้อมูลลงระบบ</span>
          </div>
          <div className="flex gap-3 h-10">
              <button 
                onClick={handleCancelChanges}
                className="px-4 h-full rounded-lg font-bold text-stone-400 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
              >
                 <RotateCcw size={16} /> ยกเลิก
              </button>
              <button 
                onClick={handleSaveChanges}
                className="px-6 h-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/50 flex items-center gap-2 transition-transform active:scale-95"
              >
                 <Save size={18} /> บันทึกการแก้ไข
              </button>
          </div>
      </div>

      {/* SUCCESS TOAST */}
      {showSaveSuccess && (
         <div className="fixed top-20 right-10 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right fade-in duration-300">
            <CheckCircle size={24} />
            <div>
               <div className="font-bold">บันทึกเรียบร้อย</div>
               <div className="text-xs text-green-100">อัปเดตสต็อกเข้าสู่ระบบแล้ว</div>
            </div>
         </div>
      )}

      {/* Add Ingredient Modal */}
      {showAddModal && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100">
              <div className="bg-red-900 p-5 text-white flex justify-between items-center">
                 <div>
                    <h3 className="font-bold text-xl flex items-center gap-2"><PlusCircle size={22} /> เพิ่มวัตถุดิบใหม่</h3>
                    <p className="text-red-200 text-xs mt-1">เพิ่มรายการเข้าสู่คลังสินค้า</p>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="hover:bg-red-800 p-2 rounded-full transition-colors"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
                 <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">ชื่อวัตถุดิบ (Name)</label>
                    <input 
                      type="text" 
                      className="w-full border border-stone-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none bg-stone-50 focus:bg-white transition-colors"
                      placeholder="เช่น ผักบุ้ง, เนื้อเป็ด..."
                      value={newIngredient.name}
                      onChange={e => setNewIngredient({...newIngredient, name: e.target.value})}
                      required
                      autoFocus
                    />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">หมวดหมู่ (Category)</label>
                    <div className="grid grid-cols-2 gap-3">
                       {categories.map(cat => (
                         <div 
                           key={cat}
                           onClick={() => setNewIngredient({...newIngredient, category: cat})}
                           className={`cursor-pointer text-center py-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-1 ${newIngredient.category === cat ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-stone-100 text-stone-500 hover:border-red-200 hover:bg-stone-50'}`}
                         >
                            <span className="text-xl">{getCategoryIcon(cat)}</span>
                            {cat}
                         </div>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">จำนวนตั้งต้น (ชิ้น)</label>
                    <div className="relative">
                       <input 
                           type="number" 
                           min="0"
                           className="w-full border border-stone-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none font-bold text-lg"
                           value={newIngredient.quantity}
                           onChange={e => setNewIngredient({...newIngredient, quantity: Number(e.target.value)})}
                       />
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-bold">ชิ้น</span>
                    </div>
                 </div>

                 <div className="pt-4 flex justify-end gap-3 border-t border-stone-100 mt-2">
                    <button 
                      type="button" 
                      onClick={() => setShowAddModal(false)}
                      className="px-6 py-3 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-50 transition-colors"
                    >
                       ยกเลิก
                    </button>
                    <button 
                      type="submit" 
                      className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-600/20 flex items-center gap-2 transition-transform active:scale-95"
                    >
                       <Save size={18} /> บันทึกข้อมูล
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};