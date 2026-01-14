import React, { useState } from 'react';
import { useStore } from '../services/StoreContext';
import { History, Eye, Receipt, CreditCard, Banknote, X, Calendar, User, MapPin } from 'lucide-react';
import { Order } from '../types';

export const HistoryView: React.FC = () => {
  const { orders, tables } = useStore();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filter for completed/cancelled orders
  const historyOrders = orders
    .filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const getTableNumber = (tableId: string) => tables.find(t => t.id === tableId)?.number || '??';

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('th-TH', { 
        year: '2-digit', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-3xl font-bold text-stone-800 mb-6 flex items-center gap-2">
        <History className="text-red-600" /> ประวัติการสั่งอาหาร (History)
      </h2>

      <div className="flex-1 bg-white rounded-xl shadow overflow-hidden flex flex-col border border-stone-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 border-b border-stone-200 text-sm">
              <tr>
                <th className="p-4 font-bold text-stone-600">Order ID</th>
                <th className="p-4 font-bold text-stone-600">เวลา (Time)</th>
                <th className="p-4 font-bold text-stone-600">โต๊ะ (Table)</th>
                <th className="p-4 font-bold text-stone-600">ลูกค้า (Customer)</th>
                <th className="p-4 font-bold text-stone-600">รายการ (Summary)</th>
                <th className="p-4 font-bold text-stone-600 text-center">การชำระ</th>
                <th className="p-4 font-bold text-stone-600 text-right">ยอดรวม</th>
                <th className="p-4 font-bold text-stone-600 text-center">สถานะ</th>
                <th className="p-4 font-bold text-stone-600 text-center">ดูข้อมูล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {historyOrders.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-stone-400">ยังไม่มีประวัติการขาย</td></tr>
              ) : historyOrders.map(o => (
                <tr key={o.id} className="hover:bg-stone-50 transition-colors">
                  <td className="p-4 font-mono text-stone-400 text-xs">{o.id.slice(-6).toUpperCase()}</td>
                  <td className="p-4 text-stone-600">{formatDateTime(o.timestamp)}</td>
                  <td className="p-4">
                     <span className="font-bold text-stone-800 bg-stone-100 px-2 py-1 rounded">{getTableNumber(o.tableId)}</span>
                  </td>
                  <td className="p-4">
                     <div className="font-bold text-stone-800">{o.customerName}</div>
                     <div className="text-[10px] text-red-500 uppercase">{o.customerClass}</div>
                  </td>
                  <td className="p-4 text-stone-500 max-w-xs truncate">
                    {o.items.length} รายการ ({o.items.map(i => i.name).slice(0, 2).join(', ')}{o.items.length > 2 ? '...' : ''})
                  </td>
                  <td className="p-4 text-center">
                     {o.paymentMethod === 'CARD' ? (
                       <span className="inline-flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs font-bold border border-indigo-100">
                          <CreditCard size={12} /> Card
                       </span>
                     ) : o.paymentMethod === 'CASH' ? (
                       <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold border border-green-100">
                          <Banknote size={12} /> Cash
                       </span>
                     ) : <span className="text-stone-300">-</span>}
                  </td>
                  <td className="p-4 text-right font-bold text-stone-800 text-base">฿{o.totalAmount.toLocaleString()}</td>
                  <td className="p-4 text-center">
                     <span className={`px-2 py-1 rounded-full text-xs font-bold ${o.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                       {o.status}
                     </span>
                  </td>
                  <td className="p-4 text-center">
                     <button 
                       onClick={() => setSelectedOrder(o)}
                       className="p-2 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg transition-colors"
                     >
                        <Eye size={18} />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="bg-red-900 p-4 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-2">
                    <Receipt size={20} />
                    <span className="font-bold text-lg">รายละเอียดใบเสร็จ</span>
                 </div>
                 <button onClick={() => setSelectedOrder(null)} className="hover:bg-white/10 p-1 rounded-full transition-colors"><X size={20} /></button>
              </div>

              {/* Receipt Content */}
              <div className="p-6 overflow-y-auto bg-stone-50 flex-1">
                 <div className="bg-white p-6 shadow-sm border border-stone-200 rounded-xl relative overflow-hidden">
                    {/* Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                       <History size={200} />
                    </div>

                    <div className="text-center mb-6 border-b border-stone-100 pb-4">
                       <h3 className="text-xl font-bold text-stone-800 font-heading">Triad Restaurant</h3>
                       <p className="text-[10px] text-stone-400 tracking-widest uppercase mb-2">By Li Group</p>
                       <div className="inline-block px-3 py-1 bg-stone-100 rounded-lg text-xs font-mono text-stone-500">
                          ID: {selectedOrder.id}
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 text-sm mb-6">
                       <div className="text-stone-500 flex items-center gap-1"><Calendar size={12}/> วันที่</div>
                       <div className="text-right font-bold text-stone-700">{formatDateTime(selectedOrder.timestamp)}</div>
                       
                       <div className="text-stone-500 flex items-center gap-1"><MapPin size={12}/> โต๊ะ</div>
                       <div className="text-right font-bold text-stone-700">{getTableNumber(selectedOrder.tableId)}</div>

                       <div className="text-stone-500 flex items-center gap-1"><User size={12}/> ลูกค้า</div>
                       <div className="text-right font-bold text-stone-700">{selectedOrder.customerName} <span className="text-[10px] bg-red-50 text-red-600 px-1 rounded">{selectedOrder.customerClass}</span></div>
                    </div>

                    <div className="border-t border-b border-stone-200 py-4 mb-4">
                       <table className="w-full text-sm">
                          <thead>
                             <tr className="text-stone-400 text-xs text-left">
                                <th className="pb-2 font-normal">รายการ</th>
                                <th className="pb-2 font-normal text-center">จน.</th>
                                <th className="pb-2 font-normal text-right">รวม</th>
                             </tr>
                          </thead>
                          <tbody className="space-y-2">
                             {selectedOrder.items.map((item, idx) => (
                               <tr key={idx}>
                                  <td className="py-1">
                                    <div className="font-bold text-stone-700">{item.name}</div>
                                    <div className="text-xs text-stone-400">@{item.price}</div>
                                  </td>
                                  <td className="py-1 text-center font-mono text-stone-600">x{item.quantity}</td>
                                  <td className="py-1 text-right font-mono text-stone-800">{item.price * item.quantity}</td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>

                    <div className="space-y-3">
                       <div className="flex justify-between items-center">
                          <span className="text-stone-500 text-sm">ช่องทางชำระเงิน</span>
                          <span className="font-bold text-stone-800 flex items-center gap-1">
                             {selectedOrder.paymentMethod === 'CASH' ? <Banknote size={14} className="text-green-600"/> : <CreditCard size={14} className="text-indigo-600"/>}
                             {selectedOrder.paymentMethod || '-'}
                          </span>
                       </div>
                       
                       <div className="flex justify-between items-center text-xl font-bold bg-stone-50 p-3 rounded-lg border border-stone-100">
                          <span className="text-stone-800">ยอดสุทธิ</span>
                          <span className="text-red-600">฿{selectedOrder.totalAmount.toLocaleString()}</span>
                       </div>
                    </div>
                 </div>

                 {/* Staff Info Footer */}
                 <div className="mt-4 text-xs text-center text-stone-400 space-y-1">
                    {selectedOrder.chefName && <div>Chef: {selectedOrder.chefName}</div>}
                    {selectedOrder.serverName && <div>Server: {selectedOrder.serverName}</div>}
                    <div>Status: {selectedOrder.status}</div>
                 </div>
              </div>
              
              <div className="p-4 bg-white border-t border-stone-200">
                 <button onClick={() => setSelectedOrder(null)} className="w-full py-3 bg-stone-800 hover:bg-black text-white rounded-xl font-bold transition-colors">
                    ปิดหน้าต่าง
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};