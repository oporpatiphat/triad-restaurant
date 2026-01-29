import React, { useState } from 'react';
import { useStore } from '../services/StoreContext';
import { OrderStatus, Order, Role, OrderItem } from '../types';
import { ChefHat, Flame, User, ArrowRight, AlertTriangle, AlertCircle, X, CheckSquare, Square, Package, ShoppingBag, ChevronUp, ChevronDown, List, StickyNote, ArrowDown01, ArrowDownAZ, ArrowUpDown } from 'lucide-react';

const KanbanColumn = ({ title, items, icon: Icon, colorClass, nextStatus, actionLabel, isAlert, currentUser, updateOrderStatus, toggleItemCookedStatus, cancelOrder, tables, menu, inventory }: any) => {
    
    // Permission: Owner, Staff, Chef can act
    const canAct = currentUser?.role === Role.OWNER || currentUser?.role === Role.STAFF || currentUser?.role === Role.CHEF;
    const isRestricted = !canAct;

    const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(new Set());
    // NEW: State for sorting mode
    const [ingredientSortMode, setIngredientSortMode] = useState<'QTY' | 'NAME'>('QTY');

    const toggleIngredients = (orderId: string) => {
        const next = new Set(expandedIngredients);
        if (next.has(orderId)) {
            next.delete(orderId);
        } else {
            next.add(orderId);
        }
        setExpandedIngredients(next);
    }

    // NEW: Aggregate ingredients and SORT them
    const getAggregatedIngredients = (order: Order) => {
        const ingredientMap = new Map<string, number>();
        
        order.items.forEach(item => {
            const menuItem = menu?.find((m: any) => m.id === item.menuItemId);
            if (menuItem && menuItem.ingredients) {
                menuItem.ingredients.forEach((ing: string) => {
                    const current = ingredientMap.get(ing) || 0;
                    ingredientMap.set(ing, current + item.quantity);
                });
            }
        });
        
        const enriched = Array.from(ingredientMap.entries()).map(([name, qty]) => {
            const invItem = inventory.find((i: any) => i.name === name);
            return {
                name,
                qty,
                category: invItem ? invItem.category : 'ของแห้ง/อื่นๆ'
            };
        });

        // SORTING LOGIC
        const catOrder = { 'เนื้อสัตว์': 1, 'ผัก': 2, 'ไวน์': 3, 'ของแห้ง/อื่นๆ': 4 };
        
        return enriched.sort((a, b) => {
            // 1. Category Priority (Always keep categories separate)
            const catA = catOrder[a.category as keyof typeof catOrder] || 99;
            const catB = catOrder[b.category as keyof typeof catOrder] || 99;
            if (catA !== catB) return catA - catB;

            // 2. Sort Mode
            if (ingredientSortMode === 'QTY') {
                // Quantity High -> Low
                if (b.qty !== a.qty) return b.qty - a.qty;
                // Fallback to Name
                return a.name.localeCompare(b.name, 'th');
            } else {
                // Name A -> Z
                return a.name.localeCompare(b.name, 'th');
            }
        });
    };

    // Specific Item Priority Sorting Logic (Internal helper)
    const getSpecificItemPriority = (name: string) => {
        const itemPriorityList = [
            'เป็ดปักกิ่ง', 'กระเพาะปลาหูฉลาม', 'เป่าฮื้อเจี๋ยนนํ้ามันหอย', 'หมูหัน/หมูกรอบ', // Main
            'เกี๊ยวซ่า', 'เสี่ยวหลงเปา-ขนมจีบ', 'หมาล่า แห้ง/นํ้า', 'แมงกระพรุนผัดนํ้ามันงา', // Appetizer
            'นํ้าเต้าหู้', 'ชาสมุนไพร', 'นํ้าเก็กฮวย', 'เหมาไถ (เหล้า)' // Drinks
        ];
        const idx = itemPriorityList.indexOf(name);
        return idx !== -1 ? idx : 999;
    };

    const getTableNumber = (tableId: string) => {
        if (!tables) return '??';
        const t = tables.find((t: any) => t.id === tableId);
        return t ? t.number : '??';
    };

    const handleCancel = (orderId: string) => {
        if(confirm("ยืนยันการยกเลิกออเดอร์นี้? โต๊ะจะกลับเป็นสถานะว่าง")) {
            cancelOrder(orderId);
        }
    };

    // Render grouped items logic
    const renderOrderItems = (order: Order) => {
        // 1. Group items by Category
        const groups: Record<string, OrderItem[]> = {};
        const catOrder = ['Main Dish', 'Appetizer', 'Soup', 'Drink', 'Set', 'Other'];

        order.items.forEach(item => {
            const m = menu?.find((x: any) => x.id === item.menuItemId);
            const cat = m ? m.category : 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });

        return catOrder.map(cat => {
            const groupItems = groups[cat];
            if (!groupItems || groupItems.length === 0) return null;

            // 2. Sort within group (Specific Item Priority -> Alphabetical)
            const sortedGroup = [...groupItems].sort((a, b) => {
                const priorityA = getSpecificItemPriority(a.name);
                const priorityB = getSpecificItemPriority(b.name);
                if (priorityA !== priorityB) return priorityA - priorityB;
                return a.name.localeCompare(b.name, 'th');
            });

            // Determine Header Color
            let headerColor = 'text-stone-400'; // Default
            if (cat === 'Main Dish') headerColor = 'text-red-600';
            if (cat === 'Drink') headerColor = 'text-blue-500';
            if (cat === 'Appetizer') headerColor = 'text-orange-500';

            return (
                <div key={cat} className="mb-3 last:mb-0">
                    <div className={`text-[10px] font-bold uppercase border-b border-stone-100 mb-1.5 pb-0.5 ${headerColor}`}>
                        {cat}
                    </div>
                    <div className="space-y-2">
                        {sortedGroup.map((item, idx) => {
                            const isCookingPhase = order.status === OrderStatus.COOKING;
                            // IMPORTANT: Find ORIGINAL index in order.items for the toggle function
                            const originalIndex = order.items.indexOf(item); 

                            return (
                                <div key={idx} className="flex items-center gap-3 text-sm">
                                    {/* Checkbox for chefs with ENHANCED Quantity */}
                                    {isCookingPhase && !isRestricted ? (
                                        <div className="flex items-center gap-2 mt-0.5 shrink-0">
                                            <span className={`font-black text-lg w-8 text-center rounded px-1 ${item.isCooked ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                                {item.quantity}
                                            </span>
                                            <button onClick={() => toggleItemCookedStatus(order.id, originalIndex)} className="text-stone-300 hover:text-green-600 transition-colors transform hover:scale-110">
                                                {item.isCooked ? <CheckSquare size={24} className="text-green-600" /> : <Square size={24} strokeWidth={1.5} />}
                                            </button>
                                        </div>
                                    ) : (
                                        <span className={`font-bold mt-0.5 w-6 text-center shrink-0 ${item.isCooked ? 'text-green-600' : 'text-stone-900'}`}>x{item.quantity}</span>
                                    )}

                                    <div className={`flex-1 font-medium ${item.isCooked ? 'opacity-40 line-through decoration-stone-400' : 'text-stone-800'}`}>
                                        {item.name}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        });
    };
    
    return (
      <div className={`flex flex-col h-full bg-white rounded-2xl border shadow-sm overflow-hidden ${isAlert ? 'border-red-500 ring-2 ring-red-100' : 'border-stone-200'}`}>
        <div className={`p-4 border-b ${isAlert ? 'border-red-500 bg-red-600 text-white' : 'border-stone-100 ' + colorClass + ' bg-opacity-10'} flex items-center justify-between`}>
          <div className={`flex items-center gap-2 font-bold ${isAlert ? 'text-white' : 'text-stone-700'}`}>
            <Icon size={20} className={isAlert ? "text-white animate-pulse" : "text-stone-800"} />
            <h3>{title}</h3>
            <span className={`${isAlert ? 'bg-red-800 text-white' : 'bg-white text-stone-700'} px-2 py-0.5 rounded-full text-xs border shadow-sm`}>{items.length}</span>
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${isAlert ? 'bg-red-50' : 'bg-stone-50/50'}`}>
          {items.map((order: Order) => {
             const aggregatedIngredients = getAggregatedIngredients(order);
             const isIngredientsExpanded = expandedIngredients.has(order.id);

             return (
            <div key={order.id} className={`bg-white p-4 rounded-xl shadow-sm border hover:shadow-md transition-shadow relative group ${isAlert ? 'border-red-200 shadow-red-100' : 'border-stone-200'}`}>
               
               {/* Cancel Button */}
               {!isRestricted && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleCancel(order.id); }}
                     className="absolute top-3 right-3 text-stone-300 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                     title="ยกเลิกออเดอร์ (Cancel Order)"
                   >
                       <X size={16} />
                   </button>
               )}

               <div className="flex justify-between items-start mb-3 pr-6">
                  <div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${isAlert ? 'bg-red-100 text-red-700' : 'text-stone-500 bg-stone-100'}`}>โต๊ะ {getTableNumber(order.tableId)}</span>
                    <div className="font-bold text-stone-800 mt-1">{order.customerName}</div>
                    <div className="text-[10px] text-red-500 uppercase font-bold tracking-wide">{order.customerClass}</div>
                  </div>
                  <div className="text-right">
                      <span className="text-xs text-stone-400 font-mono block">{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span className="text-[10px] text-stone-300">ID: {order.id.slice(-4)}</span>
                  </div>
               </div>
               
               {/* Box & Bag Badges */}
               <div className="flex flex-wrap gap-2 mb-2">
                   {(order.boxCount || 0) > 0 && (
                       <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100 inline-flex items-center gap-1 font-bold">
                           <Package size={12} /> กล่อง x{order.boxCount}
                       </div>
                   )}
                   {(order.bagCount || 0) > 0 && (
                       <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 inline-flex items-center gap-1 font-bold">
                           <ShoppingBag size={12} /> ถุง x{order.bagCount}
                       </div>
                   )}
               </div>

               {/* Note */}
               {order.note && (
                   <div className="mb-3 p-2 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200 flex items-start gap-2">
                       <StickyNote size={14} className="shrink-0 mt-0.5" />
                       <span className="font-bold">{order.note}</span>
                   </div>
               )}

               {/* Total Ingredients Toggle */}
               {aggregatedIngredients.length > 0 && (
                   <div className="mb-3">
                       <button 
                         onClick={() => toggleIngredients(order.id)}
                         className="w-full flex items-center justify-between p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold transition-colors"
                       >
                           <span className="flex items-center gap-1"><List size={14}/> วัตถุดิบรวม ({aggregatedIngredients.length})</span>
                           {isIngredientsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                       </button>
                       {isIngredientsExpanded && (
                           <div className="mt-1 p-3 bg-white rounded-lg text-xs border border-stone-200 animate-in fade-in zoom-in-95 duration-200 shadow-inner">
                               
                               {/* Sort Toggle Controls */}
                               <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
                                  <span className="text-[10px] font-bold text-stone-400 flex items-center gap-1">
                                     <ArrowUpDown size={10} /> เรียงลำดับ (Sort)
                                  </span>
                                  <div className="flex gap-1">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); setIngredientSortMode('QTY'); }}
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${ingredientSortMode === 'QTY' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}
                                     >
                                        <ArrowDown01 size={10} /> จำนวน
                                     </button>
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); setIngredientSortMode('NAME'); }}
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${ingredientSortMode === 'NAME' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}
                                     >
                                        <ArrowDownAZ size={10} /> ชื่อ
                                     </button>
                                  </div>
                               </div>

                               {['เนื้อสัตว์', 'ผัก', 'ไวน์', 'ของแห้ง/อื่นๆ'].map(cat => {
                                   const catItems = aggregatedIngredients.filter(i => i.category === cat);
                                   if (catItems.length === 0) return null;
                                   
                                   let headerColor = 'text-stone-500';
                                   if (cat === 'เนื้อสัตว์') headerColor = 'text-red-600';
                                   if (cat === 'ผัก') headerColor = 'text-green-600';
                                   if (cat === 'ไวน์') headerColor = 'text-purple-600';

                                   return (
                                       <div key={cat} className="mb-2 last:mb-0">
                                           <div className={`font-bold ${headerColor} mb-1 border-b border-stone-100 pb-0.5`}>{cat}</div>
                                           <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                {catItems.map(({name, qty}, i) => (
                                                    <div key={i} className="flex justify-between">
                                                        <span className="text-stone-600">{name}</span>
                                                        <span className={`font-bold ${qty > 1 ? 'text-red-700 text-base' : 'text-stone-800'}`}>x{qty}</span>
                                                    </div>
                                                ))}
                                           </div>
                                       </div>
                                   );
                               })}
                           </div>
                       )}
                   </div>
               )}

               {/* Render Order Items (Grouped) */}
               <div className="space-y-2 mb-4 border-t border-b border-stone-100 py-3">
                   {renderOrderItems(order)}
               </div>

               {/* Staff Info */}
               {(order.chefName || order.serverName) && (
                 <div className="flex gap-2 mb-3 text-[10px] text-stone-500">
                    {order.chefName && <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-100">Chef: {order.chefName}</span>}
                    {order.serverName && <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">Server: {order.serverName}</span>}
                 </div>
               )}

               {nextStatus && (
                 <button 
                   onClick={() => updateOrderStatus(order.id, nextStatus, currentUser?.name)}
                   disabled={isRestricted}
                   className={`w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors
                     ${isRestricted
                       ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                       : isAlert 
                          ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200' 
                          : 'bg-stone-800 text-white hover:bg-black'}`}
                 >
                   <span>{isRestricted ? `${actionLabel} (Locked)` : actionLabel}</span>
                   {!isRestricted && <ArrowRight size={14} />}
                 </button>
               )}
            </div>
          )})}
          {items.length === 0 && (
             <div className="text-center py-10 text-stone-300 text-sm">ไม่มีรายการ</div>
          )}
        </div>
      </div>
    );
};

export const KitchenView: React.FC = () => {
  const { orders, updateOrderStatus, toggleItemCookedStatus, cancelOrder, tables, currentUser, menu, inventory } = useStore();
  
  // Safe filtering
  const safeOrders = Array.isArray(orders) ? orders : [];

  // Sort Orders: Oldest First (Time Ascending)
  // User request: "Number Time Order Max to Min" -> usually implies sorting by time.
  // Standard KDS uses Oldest First (FIFO) so chefs cook order that came first.
  const sortOrders = (os: Order[]) => {
      return os.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const pendingOrders = sortOrders(safeOrders.filter(o => o.status === OrderStatus.PENDING));
  const cookingOrders = sortOrders(safeOrders.filter(o => o.status === OrderStatus.COOKING));
  const servingOrders = sortOrders(safeOrders.filter(o => o.status === OrderStatus.SERVING));

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-stone-800 flex items-center gap-2">
            <ChefHat className="text-red-600" /> งานครัวและบริการ (KDS)
          </h2>
          <div className="text-xs text-stone-400 font-mono">Sorted by Time (Oldest First)</div>
      </div>

      {/* Alert Banner */}
      {pendingOrders.length > 0 && (
        <div className="bg-red-600 rounded-xl p-3 mb-4 text-white shadow-lg shadow-red-200 flex items-center justify-between animate-pulse">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full"><AlertTriangle size={24} /></div>
              <div>
                <div className="font-bold text-lg">มีออเดอร์รอทำ {pendingOrders.length} รายการ</div>
                <div className="text-red-100 text-xs">กรุณารับออเดอร์และเริ่มปรุงอาหารทันที</div>
              </div>
           </div>
           <div className="px-4 py-1 bg-white text-red-700 font-bold rounded-full text-sm">Action Required</div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        <KanbanColumn 
          title="รอทำ (Ordered)" 
          items={pendingOrders}
          icon={AlertCircle}
          colorClass="bg-red-500"
          isAlert={true}
          nextStatus={OrderStatus.COOKING}
          actionLabel="เริ่มทำ (Start)"
          currentUser={currentUser}
          updateOrderStatus={updateOrderStatus}
          cancelOrder={cancelOrder}
          tables={tables}
          menu={menu}
          inventory={inventory}
        />
        <KanbanColumn 
          title="กำลังทำ (Cooking)" 
          items={cookingOrders}
          icon={Flame}
          colorClass="bg-orange-500"
          nextStatus={OrderStatus.SERVING}
          actionLabel="พร้อมเสิร์ฟ (Ready)"
          currentUser={currentUser}
          updateOrderStatus={updateOrderStatus}
          toggleItemCookedStatus={toggleItemCookedStatus}
          cancelOrder={cancelOrder}
          tables={tables}
          menu={menu}
          inventory={inventory}
        />
        <KanbanColumn 
          title="รอเสิร์ฟ (Serving)" 
          items={servingOrders}
          icon={User}
          colorClass="bg-green-500"
          nextStatus={OrderStatus.SERVED}
          actionLabel="เสิร์ฟแล้ว (Served)"
          currentUser={currentUser}
          updateOrderStatus={updateOrderStatus}
          cancelOrder={cancelOrder}
          tables={tables}
          menu={menu}
          inventory={inventory}
        />
      </div>
    </div>
  );
};