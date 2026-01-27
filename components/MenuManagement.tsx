

import React, { useState } from 'react';
import { useStore } from '../services/StoreContext';
import { Coffee, Plus, ToggleLeft, ToggleRight, X, Tag, FileText, DollarSign, CheckSquare, Trash2, Edit } from 'lucide-react';
import { MenuItem } from '../types';

export const MenuManagement: React.FC = () => {
  const { menu, addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuAvailability, inventory } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    category: 'Main Dish',
    ingredients: [],
    isAvailable: true
  });

  const handleEdit = (item: MenuItem) => {
    setNewItem(item);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleCreate = () => {
    setNewItem({ 
      name: '', 
      description: '', 
      price: 0, 
      cost: 0, 
      category: 'Main Dish', 
      isAvailable: true, 
      ingredients: [] 
    });
    setIsEditing(false);
    setShowForm(true);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.name && newItem.price) {
      if (isEditing && newItem.id) {
        updateMenuItem(newItem as MenuItem);
      } else {
        addMenuItem({
          id: `m-${Date.now()}`,
          name: newItem.name,
          description: newItem.description || '',
          price: Number(newItem.price),
          cost: 0, 
          category: newItem.category || 'Main Dish',
          ingredients: newItem.ingredients || [],
          isAvailable: true,
          dailyStock: -1
        });
      }
      setShowForm(false);
      setIsEditing(false);
    }
  };

  const handleDelete = (item: MenuItem) => {
      if(confirm(`คุณแน่ใจหรือไม่ที่จะลบเมนู "${item.name}"? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
          deleteMenuItem(item.id);
      }
  };

  const handleIngredientToggle = (ingredientName: string) => {
    const current = newItem.ingredients || [];
    if (current.includes(ingredientName)) {
      setNewItem({ ...newItem, ingredients: current.filter(i => i !== ingredientName) });
    } else {
      setNewItem({ ...newItem, ingredients: [...current, ingredientName] });
    }
  };

  const categories = ['Main Dish', 'Appetizer', 'Soup', 'Drink', 'Set', 'Other'];

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'เนื้อสัตว์': return 'text-red-600 bg-red-50 border-red-100';
      case 'ผัก': return 'text-green-600 bg-green-50 border-green-100';
      case 'ไวน์': return 'text-purple-600 bg-purple-50 border-purple-100';
      default: return 'text-amber-600 bg-amber-50 border-amber-100';
    }
  };

  // Group inventory for selection
  const ingredientGroups = {
      'เนื้อสัตว์': inventory.filter(i => i.category === 'เนื้อสัตว์'),
      'ผัก': inventory.filter(i => i.category === 'ผัก'),
      'ไวน์': inventory.filter(i => i.category === 'ไวน์'),
      'ของแห้ง/อื่นๆ': inventory.filter(i => i.category !== 'เนื้อสัตว์' && i.category !== 'ผัก' && i.category !== 'ไวน์')
  };

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-stone-800 flex items-center gap-2">
            <Coffee className="text-red-600" /> จัดการเมนูอาหาร
          </h2>
          <p className="text-stone-500 text-sm mt-1">เพิ่มลบแก้ไขรายการอาหารและราคา</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-95"
        >
          <Plus size={20} /> เพิ่มเมนูใหม่
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-red-900 p-5 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-xl flex items-center gap-2">
                  {isEditing ? <Edit size={24} className="text-amber-400" /> : <Plus size={24} className="text-amber-400" />} 
                  {isEditing ? 'แก้ไขเมนู' : 'เพิ่มรายการอาหารใหม่'}
                </h3>
                <p className="text-red-200 text-sm mt-0.5">กรอกข้อมูลเมนูเพื่อนำขึ้นขายหน้าร้าน</p>
              </div>
              <button onClick={() => setShowForm(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto bg-white flex-1">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-1">
                      <Coffee size={14} className="text-red-500" /> ชื่อเมนู (Name) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      placeholder="เช่น ข้าวมันไก่..." 
                      className="w-full border border-stone-300 bg-stone-50 rounded-lg px-4 py-2.5 text-stone-900 focus:ring-2 focus:ring-red-500 focus:bg-white focus:border-red-500 outline-none transition-all placeholder:text-stone-400"
                      value={newItem.name}
                      onChange={e => setNewItem({...newItem, name: e.target.value})}
                      required
                    />
                  </div>

                  {/* Category */}
                  <div className="col-span-2 md:col-span-1">
                     <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-1">
                        <Tag size={14} className="text-red-500" /> หมวดหมู่ (Category)
                     </label>
                     <div className="relative">
                       <select 
                        className="w-full border border-stone-300 bg-stone-50 rounded-lg px-4 py-2.5 text-stone-900 focus:ring-2 focus:ring-red-500 focus:bg-white focus:border-red-500 outline-none appearance-none transition-all"
                        value={newItem.category}
                        onChange={e => setNewItem({...newItem, category: e.target.value})}
                      >
                         {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-1">
                       <DollarSign size={14} className="text-red-500" /> ราคาขาย (Price) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-bold">฿</span>
                      <input 
                        type="number"
                        min="0"
                        className="w-full border border-stone-300 bg-stone-50 rounded-lg pl-10 pr-4 py-2.5 text-stone-900 font-bold focus:ring-2 focus:ring-red-500 focus:bg-white focus:border-red-500 outline-none transition-all"
                        value={newItem.price || ''}
                        onChange={e => setNewItem({...newItem, price: Number(e.target.value)})}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-1">
                       <FileText size={14} className="text-red-500" /> คำอธิบาย (Description)
                    </label>
                    <textarea 
                      placeholder="รายละเอียดเมนู ส่วนประกอบเพิ่มเติม..." 
                      className="w-full border border-stone-300 bg-stone-50 rounded-lg px-4 py-2.5 text-stone-900 focus:ring-2 focus:ring-red-500 focus:bg-white focus:border-red-500 outline-none transition-all placeholder:text-stone-400 min-h-[80px]"
                      value={newItem.description}
                      onChange={e => setNewItem({...newItem, description: e.target.value})}
                    />
                  </div>

                  {/* Ingredient Selection */}
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-1">
                       <CheckSquare size={14} className="text-red-500" /> เลือกวัตถุดิบที่ใช้ (Ingredients)
                    </label>
                    <div className="p-4 border border-stone-200 rounded-xl bg-stone-50/50 max-h-60 overflow-y-auto space-y-4">
                       {inventory.length === 0 ? (
                         <div className="text-center text-stone-400 text-sm py-4">ไม่มีข้อมูลวัตถุดิบในคลัง</div>
                       ) : (
                         Object.entries(ingredientGroups).map(([groupName, items]) => items.length > 0 && (
                            <div key={groupName}>
                                <h4 className="font-bold text-stone-600 text-xs uppercase mb-2 border-b border-stone-200 pb-1">{groupName}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                {items.map(ing => {
                                    const isSelected = newItem.ingredients?.includes(ing.name);
                                    return (
                                    <label 
                                        key={ing.id} 
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all ${isSelected ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-transparent hover:bg-stone-100'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-stone-300'}`}>
                                            {isSelected && <CheckSquare size={12} />}
                                        </div>
                                        <input 
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={() => handleIngredientToggle(ing.name)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm ${isSelected ? 'font-bold text-red-700' : 'text-stone-600'}`}>{ing.name}</div>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-block mt-0.5 ${getCategoryColor(ing.category)}`}>
                                                {ing.category}
                                            </span>
                                        </div>
                                    </label>
                                    );
                                })}
                                </div>
                            </div>
                         ))
                       )}
                    </div>
                    <div className="text-xs text-stone-500 mt-2 flex items-center gap-1">
                       <div className="w-1 h-1 bg-stone-400 rounded-full"></div>
                       <span>ใช้สำหรับการตัดสต็อกวัตถุดิบเมื่อมีการสั่งเมนูนี้</span>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-stone-200 bg-stone-50 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="px-6 py-3 text-stone-600 bg-white border border-stone-300 rounded-xl font-bold hover:bg-stone-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSubmit} 
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2"
              >
                {isEditing ? <Edit size={18} /> : <Plus size={18} />} 
                {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกเมนู'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8 pb-10">
        {categories.map(cat => {
            const items = menu.filter(m => m.category === cat);
            if(items.length === 0) return null;
            return (
                <div key={cat}>
                    <h3 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2 border-b border-stone-200 pb-2">
                        <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                        {cat}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {items.map(item => (
                        <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border transition-all hover:shadow-md group relative ${item.isAvailable ? 'border-stone-200' : 'border-stone-200 bg-stone-50 opacity-80'}`}>
                            
                            {/* Action Buttons (Visible on Hover) */}
                            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                                <button 
                                    onClick={() => handleEdit(item)}
                                    className="bg-white text-stone-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full shadow-sm border border-stone-200"
                                    title="แก้ไขเมนู"
                                >
                                    <Edit size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(item)}
                                    className="bg-white text-stone-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full shadow-sm border border-stone-200"
                                    title="ลบเมนู"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex justify-between items-start mb-3">
                                <h3 className={`font-bold text-lg line-clamp-1 ${item.isAvailable ? 'text-stone-800' : 'text-stone-500'}`}>{item.name}</h3>
                                <button 
                                  onClick={() => toggleMenuAvailability(item.id)}
                                  className={`transition-colors ${item.isAvailable ? 'text-green-500 hover:text-green-600' : 'text-stone-300 hover:text-stone-400'}`}
                                  title={item.isAvailable ? "Available (Click to disable)" : "Unavailable (Click to enable)"}
                                >
                                    {item.isAvailable ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                </button>
                            </div>
                            
                            <p className="text-stone-500 text-sm mb-4 min-h-[40px] line-clamp-2 leading-relaxed">
                               {item.description || "-"}
                            </p>
                            
                            {/* Show Ingredients */}
                            {item.ingredients && item.ingredients.length > 0 && (
                              <div className="mb-4 flex flex-wrap gap-1.5 min-h-[30px] content-start">
                                {item.ingredients.slice(0, 4).map((ing, idx) => (
                                  <span key={idx} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md border border-stone-200 font-medium">
                                    {ing}
                                  </span>
                                ))}
                                {item.ingredients.length > 4 && (
                                   <span className="text-[10px] text-stone-400 px-1">+{item.ingredients.length - 4}</span>
                                )}
                              </div>
                            )}

                            <div className="flex justify-between items-end pt-4 border-t border-stone-100 mt-auto">
                                <div className={`text-xs font-bold px-2 py-1 rounded ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-500'}`}>
                                    {item.isAvailable ? 'พร้อมขาย' : 'ไม่พร้อมขาย'}
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-stone-400 block uppercase tracking-wider font-bold">Price</span>
                                    <span className={`font-bold text-2xl ${item.isAvailable ? 'text-red-600' : 'text-stone-400'}`}>฿{item.price}</span>
                                </div>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};