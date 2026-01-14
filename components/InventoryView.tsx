import React, { useState } from 'react';
import { useStore } from '../services/StoreContext';
import { Refrigerator, AlertTriangle, Minus, Plus, PlusCircle, X, Save, Trash2, Eye, Package, Layers, CheckCircle } from 'lucide-react';
import { Ingredient, IngredientCategory, Role } from '../types';

export const InventoryView: React.FC = () => {
  const { inventory, updateIngredientQuantity, addIngredient, removeIngredient, currentUser } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
    name: '',
    category: 'ของแห้ง/อื่นๆ',
    quantity: 0,
    unit: 'ชิ้น',
    threshold: 0
  });

  const canEdit = currentUser?.role === Role.OWNER;

  const categories: IngredientCategory[] = ['เนื้อสัตว์', 'ผัก', 'ไวน์', 'ของแห้ง/อื่นๆ'];

  const getCategoryIcon = (cat: IngredientCategory) => {
    switch (cat) {
        case 'เนื้อสัตว์': return '🥩';
        case 'ผัก': return '🥬';
        case 'ไวน์': return '🍷';
        default: return '📦';
    }
  }

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
    }
  };

  const handleManualSave = () => {
    // Since state updates immediately in this architecture, this button serves as a confirmation/checkpoint for the user
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  // Stats Calculation
  const totalItems = inventory.length;
  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockItems = inventory.filter(i => i.quantity <= 5).length; // Assuming 5 is low for stats

  return (
    <div className="h-full flex flex-col">
      {/* Header & Stats Dashboard */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
            <div>
            <h2 className="text-3xl font-bold text-stone-800 flex items-center gap-2">
                <Refrigerator className="text-red-600" /> ตู้เย็น / คลังวัตถุดิบ (Stock)
            </h2>
            {!canEdit && (
                <div className="text-sm text-stone-500 flex items-center gap-1 mt-1">
                <Eye size={14} /> Read-Only Mode (คุณดูข้อมูลได้อย่างเดียว)
                </div>
            )}
            </div>
            {canEdit && (
            <div className="flex gap-3">
                 <button 
                    onClick={handleManualSave}
                    className="bg-stone-800 hover:bg-black text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-stone-800/20 transition-all active:scale-95"
                >
                    {showSaveSuccess ? <CheckCircle size={20} className="text-green-400" /> : <Save size={20} />}
                    {showSaveSuccess ? 'บันทึกเรียบร้อย' : 'บันทึกข้อมูล'}
                </button>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all hover:-translate-y-0.5"
                >
                    <PlusCircle size={20} /> เพิ่มวัตถุดิบใหม่
                </button>
            </div>
            )}
        </div>

        {/* Dashboard Cards to fill space */}
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
      <div className="flex-1 overflow-y-auto space-y-8 pb-10 pr-2">
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
                        const isLow = item.quantity <= 5;
                        
                        return (
                           <div key={item.id} className={`group bg-white rounded-xl p-4 border transition-all hover:shadow-lg relative overflow-hidden ${isLow ? 'border-red-300 shadow-red-100' : 'border-stone-200 shadow-sm'}`}>
                              {/* Background Icon Watermark */}
                              <div className="absolute -bottom-4 -right-4 text-8xl opacity-[0.03] pointer-events-none select-none grayscale">
                                 {getCategoryIcon(category)}
                              </div>

                              <div className="flex justify-between items-start mb-3 relative z-10">
                                 <div>
                                    <div className="flex items-center gap-2">
                                       <span className="text-2xl">{getCategoryIcon(category)}</span>
                                       <div className="font-bold text-stone-800 text-lg line-clamp-1">{item.name}</div>
                                    </div>
                                    <div className="text-xs text-stone-400 mt-1 pl-1">ID: {item.id}</div>
                                 </div>
                                 {isLow && (
                                     <div className="absolute top-0 right-0 bg-red-100 text-red-600 p-1.5 rounded-bl-lg shadow-sm">
                                         <AlertTriangle size={16} />
                                     </div>
                                 )}
                              </div>

                              <div className="bg-stone-50 rounded-lg p-3 border border-stone-100 relative z-10">
                                 <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-stone-500 font-bold uppercase">Quantity</span>
                                    <span className="text-xs text-stone-400">{item.unit}</span>
                                 </div>
                                 <div className="flex items-center justify-between gap-2">
                                     {canEdit && (
                                         <button 
                                           onClick={() => updateIngredientQuantity(item.id, -1)}
                                           className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 rounded text-stone-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                                         >
                                            <Minus size={16} />
                                         </button>
                                     )}
                                     
                                     <div className={`flex-1 text-center font-bold text-2xl ${isLow ? 'text-red-600' : 'text-stone-800'}`}>
                                         {item.quantity}
                                     </div>

                                     {canEdit && (
                                         <button 
                                           onClick={() => updateIngredientQuantity(item.id, 1)}
                                           className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 rounded text-stone-500 hover:text-green-500 hover:bg-green-50 transition-colors"
                                         >
                                            <Plus size={16} />
                                         </button>
                                     )}
                                 </div>
                              </div>
                              
                              {canEdit && (
                                 <div className="mt-3 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 relative z-10">
                                    <button 
                                      onClick={() => updateIngredientQuantity(item.id, 5)}
                                      className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold py-1.5 rounded border border-stone-200"
                                    >
                                       +5
                                    </button>
                                    <button 
                                      onClick={() => updateIngredientQuantity(item.id, 10)}
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