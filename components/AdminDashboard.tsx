import React, { useState, useMemo } from 'react';
import { useStore } from '../services/StoreContext';
import { Calculator, ShoppingBag, ArrowRight, Search, Copy, Check, Filter, Utensils, XCircle, Plus, Minus } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { menu, inventory } = useStore();

  // Selection State: Record of MenuID -> Quantity
  const [menuQuantities, setMenuQuantities] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Result State
  const [calculationResult, setCalculationResult] = useState<any[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  // Filter Menus for display
  const displayedMenus = useMemo(() => {
    return menu.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || m.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [menu, searchTerm, categoryFilter]);

  const activeCount = (Object.values(menuQuantities) as number[]).filter(q => q > 0).length;

  const handleQuantityChange = (menuId: string, val: string) => {
    const num = parseInt(val);
    setMenuQuantities(prev => ({
      ...prev,
      [menuId]: isNaN(num) ? 0 : num
    }));
    // Reset result when input changes to force recalculation
    setCalculationResult([]); 
  };

  const clearAll = () => {
    setMenuQuantities({});
    setCalculationResult([]);
  };

  const handleCalculate = () => {
    const selectedIds = Object.keys(menuQuantities).filter(id => menuQuantities[id] > 0);
    if (selectedIds.length === 0) return;

    // Aggregation Logic
    const ingredientMap = new Map<string, { required: number, unit: string, category: string }>();

    selectedIds.forEach(menuId => {
       const qty = menuQuantities[menuId];
       const menuItem = menu.find(m => m.id === menuId);
       
       if (menuItem) {
         menuItem.ingredients.forEach(ingName => {
            // Find ingredient details from inventory to get Unit and Category
            const inventoryItem = inventory.find(i => i.name === ingName);
            const unit = inventoryItem ? inventoryItem.unit : 'หน่วย';
            const category = inventoryItem ? inventoryItem.category : 'อื่นๆ';
            
            // Logic: Assume 1 unit per dish
            const amountNeeded = qty * 1; 

            if (ingredientMap.has(ingName)) {
               const current = ingredientMap.get(ingName)!;
               ingredientMap.set(ingName, { ...current, required: current.required + amountNeeded });
            } else {
               ingredientMap.set(ingName, { required: amountNeeded, unit, category });
            }
         });
       }
    });

    // Convert Map to Array
    const results = Array.from(ingredientMap.entries()).map(([name, data]) => ({
       name,
       required: data.required,
       unit: data.unit,
       category: data.category
    }));

    setCalculationResult(results);
  };

  const handleCopy = () => {
    if (calculationResult.length === 0) return;

    // Filter categories
    const meatItems = calculationResult.filter(r => r.category === 'เนื้อสัตว์');
    const vegItems = calculationResult.filter(r => r.category === 'ผัก');
    const wineItems = calculationResult.filter(r => r.category === 'ไวน์');

    if (meatItems.length === 0 && vegItems.length === 0 && wineItems.length === 0) {
        alert("ไม่มีรายการ เนื้อสัตว์, ผัก หรือ ไวน์ ในการคำนวณ");
        return;
    }

    let text = "รายการสั่งซื้อวัตถุดิบ (Triad Restaurant)\n";
    text += "================================\n";
    
    if (meatItems.length > 0) {
        text += "[ หมวดเนื้อสัตว์ ]\n";
        meatItems.forEach((res, idx) => {
            text += `${idx + 1}. ${res.name} : ${res.required} ${res.unit}\n`;
        });
        text += "\n";
    }

    if (vegItems.length > 0) {
        text += "[ หมวดผัก ]\n";
        vegItems.forEach((res, idx) => {
            text += `${idx + 1}. ${res.name} : ${res.required} ${res.unit}\n`;
        });
        text += "\n";
    }

    if (wineItems.length > 0) {
        text += "[ หมวดไวน์ ]\n";
        wineItems.forEach((res, idx) => {
            text += `${idx + 1}. ${res.name} : ${res.required} ${res.unit}\n`;
        });
        text += "\n";
    }
    
    text += "================================";

    navigator.clipboard.writeText(text).then(() => {
       setIsCopied(true);
       setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const menuCategories = ['All', ...Array.from(new Set(menu.map(m => m.category)))];

  return (
    <div className="h-full space-y-4">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-bold text-stone-800 flex items-center gap-2">
                <Calculator className="text-red-600" /> ระบบคำนวณวัตถุดิบ
            </h2>
            <p className="text-stone-500 text-sm">เลือกจำนวนเมนูที่ต้องการผลิต เพื่อคำนวณวัตถุดิบรวม</p>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-180px)]">
         
         {/* LEFT SIDE: MENU LIST SELECTION */}
         <div className="w-7/12 bg-white rounded-xl shadow-sm border border-stone-200 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-stone-200 bg-stone-50 space-y-3">
               <div className="flex gap-2">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="ค้นหาเมนู..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 outline-none focus:ring-2 focus:ring-red-500"
                    />
                 </div>
                 {activeCount > 0 && (
                    <button onClick={clearAll} className="flex items-center gap-1 text-red-600 px-3 hover:bg-red-50 rounded-lg text-sm font-bold">
                        <XCircle size={16} /> ล้างค่า ({activeCount})
                    </button>
                 )}
               </div>
               
               <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {menuCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                        categoryFilter === cat 
                          ? 'bg-red-600 text-white border-red-600' 
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
               </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-stone-100">
               {displayedMenus.map(m => {
                 const qty = menuQuantities[m.id] || 0;
                 return (
                   <div key={m.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${qty > 0 ? 'bg-white border-red-300 shadow-md ring-1 ring-red-100' : 'bg-white border-stone-200 hover:border-red-200'}`}>
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${qty > 0 ? 'bg-red-600 text-white' : 'bg-stone-100 text-stone-400'}`}>
                            {qty > 0 ? qty : <Utensils size={18}/>}
                         </div>
                         <div>
                            <div className={`font-bold ${qty > 0 ? 'text-red-900' : 'text-stone-700'}`}>{m.name}</div>
                            <div className="text-xs text-stone-400">{m.category}</div>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                         <div className="text-xs font-bold text-stone-400 uppercase mr-2 hidden sm:block">จำนวน</div>
                         <div className={`flex items-center rounded-lg shadow-sm border transition-all h-10
                             ${qty > 0 
                               ? 'bg-red-600 border-red-600' 
                               : 'bg-stone-700 border-stone-700' 
                             }`}
                         >
                           <button 
                             onClick={() => handleQuantityChange(m.id, String(Math.max(0, qty - 1)))}
                             className="w-10 h-full flex items-center justify-center text-white/90 hover:bg-black/20 active:bg-black/30 transition-colors"
                           >
                             <Minus size={18} strokeWidth={3} />
                           </button>
                           
                           <input 
                             type="number"
                             min="0"
                             placeholder="0"
                             value={qty > 0 ? qty : ''}
                             onChange={(e) => handleQuantityChange(m.id, e.target.value)}
                             className="w-14 text-center bg-transparent text-white font-bold text-xl outline-none placeholder-white/20 no-spinner"
                           />

                           <button 
                             onClick={() => handleQuantityChange(m.id, String(qty + 1))}
                             className="w-10 h-full flex items-center justify-center text-white/90 hover:bg-black/20 active:bg-black/30 transition-colors"
                           >
                             <Plus size={18} strokeWidth={3} />
                           </button>
                         </div>
                      </div>
                   </div>
                 );
               })}
               
               {displayedMenus.length === 0 && (
                  <div className="text-center p-10 text-stone-400">ไม่พบเมนู</div>
               )}
            </div>

            <div className="p-4 border-t border-stone-200 bg-white">
                <button 
                  onClick={handleCalculate}
                  disabled={activeCount === 0}
                  className="w-full bg-stone-800 hover:bg-black disabled:bg-stone-300 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                   คำนวณวัตถุดิบ ({activeCount} รายการ) <ArrowRight size={20} />
                </button>
            </div>
         </div>

         {/* RIGHT SIDE: RESULTS */}
         <div className="w-5/12 bg-white rounded-xl shadow-sm border border-stone-200 flex flex-col relative overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50">
               <div>
                  <h3 className="font-bold text-lg text-stone-800">ผลลัพธ์ (Total Needed)</h3>
                  <p className="text-xs text-stone-500">แสดงเฉพาะเนื้อสัตว์, ผัก และไวน์</p>
               </div>
               {calculationResult.length > 0 && (
                  <button 
                    onClick={handleCopy}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${isCopied ? 'bg-green-600 text-white' : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'}`}
                  >
                     {isCopied ? <Check size={14} /> : <Copy size={14} />}
                     {isCopied ? 'เรียบร้อย' : 'Copy ส่งร้านค้า'}
                  </button>
               )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 relative">
               {calculationResult.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-stone-300">
                     <ShoppingBag size={64} className="mb-4 opacity-20" />
                     <p>เลือกเมนูทางซ้ายเพื่อเริ่มคำนวณ</p>
                  </div>
               ) : (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                     
                     {/* Meat Section */}
                     {calculationResult.filter(r => r.category === 'เนื้อสัตว์').length > 0 && (
                        <div>
                           <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2 border-b border-red-100 pb-1">
                              เนื้อสัตว์ (Meat)
                           </h4>
                           <ul className="space-y-2">
                              {calculationResult.filter(r => r.category === 'เนื้อสัตว์').map((res, idx) => (
                                 <li key={idx} className="flex justify-between items-center text-sm p-2 rounded hover:bg-stone-50">
                                    <span className="text-stone-700 font-medium">{idx + 1}. {res.name}</span>
                                    <span className="font-bold text-stone-900">{res.required} {res.unit}</span>
                                 </li>
                              ))}
                           </ul>
                        </div>
                     )}

                     {/* Veg Section */}
                     {calculationResult.filter(r => r.category === 'ผัก').length > 0 && (
                        <div>
                           <h4 className="font-bold text-green-700 mb-2 flex items-center gap-2 border-b border-green-100 pb-1">
                              ผัก (Vegetables)
                           </h4>
                           <ul className="space-y-2">
                              {calculationResult.filter(r => r.category === 'ผัก').map((res, idx) => (
                                 <li key={idx} className="flex justify-between items-center text-sm p-2 rounded hover:bg-stone-50">
                                    <span className="text-stone-700 font-medium">{idx + 1}. {res.name}</span>
                                    <span className="font-bold text-stone-900">{res.required} {res.unit}</span>
                                 </li>
                              ))}
                           </ul>
                        </div>
                     )}

                     {/* Wine Section */}
                     {calculationResult.filter(r => r.category === 'ไวน์').length > 0 && (
                        <div>
                           <h4 className="font-bold text-purple-700 mb-2 flex items-center gap-2 border-b border-purple-100 pb-1">
                              ไวน์ (Wine)
                           </h4>
                           <ul className="space-y-2">
                              {calculationResult.filter(r => r.category === 'ไวน์').map((res, idx) => (
                                 <li key={idx} className="flex justify-between items-center text-sm p-2 rounded hover:bg-stone-50">
                                    <span className="text-stone-700 font-medium">{idx + 1}. {res.name}</span>
                                    <span className="font-bold text-stone-900">{res.required} {res.unit}</span>
                                 </li>
                              ))}
                           </ul>
                        </div>
                     )}

                     {/* Info for other categories */}
                     {calculationResult.filter(r => r.category !== 'เนื้อสัตว์' && r.category !== 'ผัก' && r.category !== 'ไวน์').length > 0 && (
                        <div className="mt-8 p-3 bg-stone-100 rounded text-xs text-stone-500 text-center">
                           มีรายการอื่นๆ อีก {calculationResult.filter(r => r.category !== 'เนื้อสัตว์' && r.category !== 'ผัก' && r.category !== 'ไวน์').length} รายการ (ไม่ถูกรวมในการ Copy)
                        </div>
                     )}
                  </div>
               )}
            </div>
         </div>

      </div>
    </div>
  );
};