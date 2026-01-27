

import React, { useState } from 'react';
import { useStore } from '../services/StoreContext';
import { OrderStatus, Order, Role } from '../types';
import { ChefHat, Flame, User, ArrowRight, AlertTriangle, AlertCircle, X, CheckSquare, Square, Package, ShoppingBag, BookOpen, ChevronUp } from 'lucide-react';

const KanbanColumn = ({ title, items, icon: Icon, colorClass, nextStatus, actionLabel, isAlert, currentUser, updateOrderStatus, toggleItemCookedStatus, cancelOrder, tables, menu }: any) => {
    
    // Permission: Owner, Staff, Chef can act
    const canAct = currentUser?.role === Role.OWNER || currentUser?.role === Role.STAFF || currentUser?.role === Role.CHEF;
    const isRestricted = !canAct;

    const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());

    const toggleRecipe = (itemId: string) => {
        const next = new Set(expandedRecipes);
        if (next.has(itemId)) {
            next.delete(itemId);
        } else {
            next.add(itemId);
        }
        setExpandedRecipes(next);
    }

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
          {items.map((order: Order) => (
            <div key={order.id} className={`bg-white p-4 rounded-xl shadow-sm border hover:shadow-md transition-shadow relative group ${isAlert ? 'border-red-200 shadow-red-100' : 'border-stone-200'}`}>
               
               {/* Cancel Button (Visible on Hover or always visible on mobile) */}
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
                  <span className="text-xs text-stone-400 font-mono">{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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

               <div className="space-y-3 mb-4 border-t border-b border-stone-100 py-3">
                 {order.items.map((item, idx) => {
                   const isCookingPhase = order.status === OrderStatus.COOKING;
                   const uniqueKey = `${order.id}-${idx}`;
                   const menuItem = menu?.find((m: any) => m.id === item.menuItemId);
                   const isExpanded = expandedRecipes.has(uniqueKey);
                   
                   return (
                   <div key={idx}>
                       <div className={`flex items-start gap-2 text-sm ${item.isCooked ? 'opacity-50' : 'text-stone-700'}`}>
                         {isCookingPhase && !isRestricted ? (
                             <button onClick={() => toggleItemCookedStatus(order.id, idx)} className="mt-0.5 text-stone-400 hover:text-green-600">
                                 {item.isCooked ? <CheckSquare size={16} className="text-green-600"/> : <Square size={16}/>}
                             </button>
                         ) : (
                             <span className="font-bold text-stone-900 mt-0.5">x{item.quantity}</span>
                         )}
                         
                         <div className="flex-1">
                             <div className={`flex items-center justify-between ${item.isCooked ? 'line-through decoration-stone-400' : ''}`}>
                                <span>
                                    {isCookingPhase && !isRestricted && <span className="font-bold mr-1">x{item.quantity}</span>}
                                    {item.name}
                                </span>
                                {menuItem && menuItem.ingredients && menuItem.ingredients.length > 0 && (
                                    <button 
                                        onClick={() => toggleRecipe(uniqueKey)}
                                        className="text-stone-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                    >
                                        {isExpanded ? <ChevronUp size={14} /> : <BookOpen size={14} />}
                                    </button>
                                )}
                             </div>
                             
                             {/* Ingredients Detail */}
                             {isExpanded && menuItem && menuItem.ingredients && (
                                 <div className="mt-1 pl-2 border-l-2 border-red-200 text-xs text-stone-500">
                                     <span className="font-bold text-stone-400">วัตถุดิบ: </span>
                                     {menuItem.ingredients.join(', ')}
                                 </div>
                             )}
                         </div>
                       </div>
                   </div>
                 )})}
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
          ))}
          {items.length === 0 && (
             <div className="text-center py-10 text-stone-300 text-sm">ไม่มีรายการ</div>
          )}
        </div>
      </div>
    );
};

export const KitchenView: React.FC = () => {
  const { orders, updateOrderStatus, toggleItemCookedStatus, cancelOrder, tables, currentUser, menu } = useStore();
  
  // Safe filtering: Ensure orders is an array before filtering
  const safeOrders = Array.isArray(orders) ? orders : [];

  const pendingOrders = safeOrders.filter(o => o.status === OrderStatus.PENDING);
  const cookingOrders = safeOrders.filter(o => o.status === OrderStatus.COOKING);
  const servingOrders = safeOrders.filter(o => o.status === OrderStatus.SERVING);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-stone-800 flex items-center gap-2">
            <ChefHat className="text-red-600" /> งานครัวและบริการ (KDS)
          </h2>
          <div className="text-xs text-stone-400 font-mono">System Ready</div>
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
        />
      </div>
    </div>
  );
};