import React from 'react';
import { useStore } from '../services/StoreContext';
import { OrderStatus, Order, Role } from '../types';
import { ChefHat, Flame, User, ArrowRight, AlertTriangle, AlertCircle } from 'lucide-react';

// --- Extract KanbanColumn Component OUTSIDE (Fixes stability issues) ---
const KanbanColumn = ({ title, items, icon: Icon, colorClass, nextStatus, actionLabel, isAlert, currentUser, updateOrderStatus, tables }: any) => {
    // Permission Logic:
    // Simply check if user is OWNER (Admin/Manager) or STAFF (Employee)
    // Both roles should be able to operate the KDS (Kitchen Display System)
    const canAct = currentUser?.role === Role.OWNER || currentUser?.role === Role.STAFF || currentUser?.role === Role.CHEF;

    const isRestricted = !canAct;

    const getTableNumber = (tableId: string) => tables.find((t: any) => t.id === tableId)?.number || '??';
    
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
            <div key={order.id} className={`bg-white p-4 rounded-xl shadow-sm border hover:shadow-md transition-shadow ${isAlert ? 'border-red-200 shadow-red-100' : 'border-stone-200'}`}>
               <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${isAlert ? 'bg-red-100 text-red-700' : 'text-stone-500 bg-stone-100'}`}>โต๊ะ {getTableNumber(order.tableId)}</span>
                    <div className="font-bold text-stone-800 mt-1">{order.customerName}</div>
                    <div className="text-[10px] text-red-500 uppercase font-bold tracking-wide">{order.customerClass}</div>
                  </div>
                  <span className="text-xs text-stone-400 font-mono">{order.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
               </div>
               
               <div className="space-y-1 mb-4 border-t border-b border-stone-100 py-2">
                 {order.items.map((item, idx) => (
                   <div key={idx} className="flex gap-2 text-sm text-stone-700">
                     <span className="font-bold text-stone-900">x{item.quantity}</span>
                     <span>{item.name}</span>
                   </div>
                 ))}
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
        </div>
      </div>
    );
};

export const KitchenView: React.FC = () => {
  const { orders, updateOrderStatus, tables, currentUser } = useStore();
  
  // Filter active orders (Excluding completed, cancelled, and waiting payment)
  const activeOrders = orders.filter(o => 
    o.status !== OrderStatus.CANCELLED && 
    o.status !== OrderStatus.COMPLETED &&
    o.status !== OrderStatus.WAITING_PAYMENT
  );
  
  const pendingCount = activeOrders.filter(o => o.status === OrderStatus.PENDING).length;

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-3xl font-bold text-stone-800 mb-4 flex items-center gap-2">
        <ChefHat className="text-red-600" /> งานครัวและบริการ (KDS)
      </h2>

      {/* Alert Banner */}
      {pendingCount > 0 && (
        <div className="bg-red-600 rounded-xl p-3 mb-4 text-white shadow-lg shadow-red-200 flex items-center justify-between animate-pulse">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full"><AlertTriangle size={24} /></div>
              <div>
                <div className="font-bold text-lg">มีออเดอร์รอทำ {pendingCount} รายการ</div>
                <div className="text-red-100 text-xs">กรุณารับออเดอร์และเริ่มปรุงอาหารทันที</div>
              </div>
           </div>
           <div className="px-4 py-1 bg-white text-red-700 font-bold rounded-full text-sm">Action Required</div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        <KanbanColumn 
          title="รอทำ (Ordered)" 
          status={OrderStatus.PENDING}
          items={activeOrders.filter(o => o.status === OrderStatus.PENDING)}
          icon={AlertCircle}
          colorClass="bg-red-500" // Red for Waiting
          isAlert={true}
          nextStatus={OrderStatus.COOKING}
          actionLabel="เริ่มทำ (Start)"
          roleRequired={Role.CHEF}
          currentUser={currentUser}
          updateOrderStatus={updateOrderStatus}
          tables={tables}
        />
        <KanbanColumn 
          title="กำลังทำ (Cooking)" 
          status={OrderStatus.COOKING}
          items={activeOrders.filter(o => o.status === OrderStatus.COOKING)}
          icon={Flame}
          colorClass="bg-orange-500"
          nextStatus={OrderStatus.SERVING}
          actionLabel="พร้อมเสิร์ฟ (Ready)"
          roleRequired={Role.CHEF}
          currentUser={currentUser}
          updateOrderStatus={updateOrderStatus}
          tables={tables}
        />
        <KanbanColumn 
          title="รอเสิร์ฟ (Serving)" 
          status={OrderStatus.SERVING}
          items={activeOrders.filter(o => o.status === OrderStatus.SERVING)}
          icon={User}
          colorClass="bg-green-500"
          nextStatus={OrderStatus.SERVED}
          actionLabel="เสิร์ฟแล้ว (Served)"
          roleRequired={Role.STAFF}
          currentUser={currentUser}
          updateOrderStatus={updateOrderStatus}
          tables={tables}
        />
      </div>
    </div>
  );
};