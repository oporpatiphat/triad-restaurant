import React, { useState } from 'react';
import { useStore } from '../services/StoreContext';
import { History, Eye, Receipt, CreditCard, Banknote, X, Calendar, User, MapPin, Trash2, ChevronLeft } from 'lucide-react';
import { Order, Role, SessionRecord } from '../types';

export const HistoryView: React.FC = () => {
  const { sessionHistory, orders, tables, deleteOrder, currentUser } = useStore();
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Helper to get orders for a specific session
  const getOrdersForSession = (session: SessionRecord) => {
      // Find orders that occurred after opening
      // If closed, must be before closing. If still open, just after opening.
      return orders.filter(o => {
          const t = new Date(o.timestamp).getTime();
          const open = new Date(session.openedAt).getTime();
          const close = session.closedAt ? new Date(session.closedAt).getTime() : Date.now();
          
          return t >= open && t <= close && (o.status === 'COMPLETED' || o.status === 'CANCELLED');
      }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const getTableNumber = (tableId: string) => tables.find(t => t.id === tableId)?.number || '??';

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('th-TH', { 
        year: '2-digit', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit' 
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }

  const handleDelete = (orderId: string) => {
     if (confirm("คำเตือน: คุณต้องการลบประวัติออเดอร์นี้ใช่หรือไม่? \n(การลบจะไม่คืนค่าวัตถุดิบและยอดเงิน)")) {
         deleteOrder(orderId);
     }
  };

  const canDelete = currentUser?.role === Role.OWNER;

  // VIEW 1: Session History List
  const renderSessionList = () => (
    <div className="flex-1 bg-white rounded-xl shadow overflow-hidden flex flex-col border border-stone-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 border-b border-stone-200 text-sm">
              <tr>
                <th className="p-4 font-bold text-stone-600">วันที่ (Date)</th>
                <th className="p-4 font-bold text-stone-600">เวลาเปิด - ปิด</th>
                <th className="p-4 font-bold text-stone-600">ผู้เปิดร้าน</th>
                <th className="p-4 font-bold text-stone-600">ผู้ปิดร้าน</th>
                <th className="p-4 font-bold text-stone-600 text-center">จำนวนออเดอร์</th>
                <th className="p-4 font-bold text-stone-600 text-right">ยอดขายรวม</th>
                <th className="p-4 font-bold text-stone-600 text-center">สถานะ</th>
                <th className="p-4 font-bold text-stone-600 text-center">ดูข้อมูล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {sessionHistory.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-stone-400">ยังไม่มีประวัติการเปิดร้าน</td></tr>
              ) : sessionHistory.map(session => (
                <tr key={session.id} className="hover:bg-stone-50 transition-colors">
                  <td className="p-4 text-stone-800 font-bold">
                      {new Date(session.openedAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="p-4 text-stone-600 font-mono">
                      {formatTime(session.openedAt)} - {session.closedAt ? formatTime(session.closedAt) : '...'}
                  </td>
                  <td className="p-4">
                      <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 text-xs font-bold">{session.openedBy}</span>
                  </td>
                  <td className="p-4">
                      {session.closedBy ? (
                          <span className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 text-xs font-bold">{session.closedBy}</span>
                      ) : '-'}
                  </td>
                  <td className="p-4 text-center font-bold text-stone-700">
                      {session.closedAt ? session.orderCount : getOrdersForSession(session).length}
                  </td>
                  <td className="p-4 text-right font-bold text-stone-800 text-base">
                      ฿{(session.closedAt ? session.totalSales : getOrdersForSession(session).reduce((sum, o) => sum + o.totalAmount, 0)).toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                     {session.closedAt ? (
                         <span className="bg-stone-100 text-stone-500 px-2 py-1 rounded text-xs font-bold">Closed</span>
                     ) : (
                         <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold animate-pulse">Open</span>
                     )}
                  </td>
                  <td className="p-4 text-center">
                      <button 
                        onClick={() => setSelectedSession(session)}
                        className="p-2 hover:bg-stone-200 text-stone-500 rounded-lg transition-colors"
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
  );

  // VIEW 2: Orders in Session
  const renderSessionDetails = () => {
    if (!selectedSession) return null;
    const ordersInSession = getOrdersForSession(selectedSession);
    const totalInView = ordersInSession.reduce((sum, o) => sum + o.totalAmount, 0);

    return (
      <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
         <div className="flex items-center gap-4 mb-4">
             <button 
               onClick={() => setSelectedSession(null)}
               className="p-2 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 hover:text-stone-800 shadow-sm"
             >
                 <ChevronLeft />
             </button>
             <div>
                <h3 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                    <History size={20} className="text-stone-400"/>
                    รอบวันที่ {new Date(selectedSession.openedAt).toLocaleDateString('th-TH')}
                </h3>
                <p className="text-sm text-stone-500">
                    เวลา: {formatTime(selectedSession.openedAt)} - {selectedSession.closedAt ? formatTime(selectedSession.closedAt) : 'ปัจจุบัน'} 
                    | รวม {ordersInSession.length} ออเดอร์
                </p>
             </div>
             <div className="ml-auto bg-stone-800 text-white px-4 py-2 rounded-lg shadow-lg">
                 <span className="text-xs text-stone-400 block uppercase font-bold">ยอดขายรอบนี้</span>
                 <span className="text-xl font-bold">฿{totalInView.toLocaleString()}</span>
             </div>
         </div>

         <div className="flex-1 bg-white rounded-xl shadow overflow-hidden flex flex-col border border-stone-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-sm">
                  <tr>
                    <th className="p-4 font-bold text-stone-600">Order ID</th>
                    <th className="p-4 font-bold text-stone-600">เวลา (Time)</th>
                    <th className="p-4 font-bold text-stone-600">โต๊ะ</th>
                    <th className="p-4 font-bold text-stone-600">ลูกค้า</th>
                    <th className="p-4 font-bold text-stone-600">รายการ</th>
                    <th className="p-4 font-bold text-stone-600 text-center">การชำระ</th>
                    <th className="p-4 font-bold text-stone-600 text-right">ยอดรวม</th>
                    <th className="p-4 font-bold text-stone-600 text-center">สถานะ</th>
                    <th className="p-4 font-bold text-stone-600 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {ordersInSession.length === 0 ? (
                    <tr><td colSpan={9} className="p-8 text-center text-stone-400">ไม่มีรายการออเดอร์ในรอบนี้</td></tr>
                  ) : ordersInSession.map(o => (
                    <tr key={o.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-4 font-mono text-stone-400 text-xs">{o.id.slice(-6).toUpperCase()}</td>
                      <td className="p-4 text-stone-600">{formatTime(o.timestamp)}</td>
                      <td className="p-4">
                        <span className="font-bold text-stone-800 bg-stone-100 px-2 py-1 rounded">{getTableNumber(o.tableId)}</span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-stone-800">{o.customerName}</div>
                        <div className="text-[10px] text-red-500 uppercase">{o.customerClass}</div>
                      </td>
                      <td className="p-4 text-stone-500 max-w-xs truncate">
                        {o.items.length} รายการ
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
                        <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => setSelectedOrder(o)}
                              className="p-2 hover:bg-stone-100 text-stone-400 hover:text-stone-600 rounded-lg transition-colors"
                            >
                                <Eye size={18} />
                            </button>
                            {canDelete && (
                                <button 
                                    onClick={() => handleDelete(o.id)}
                                    className="p-2 hover:bg-red-50 text-stone-300 hover:text-red-600 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-3xl font-bold text-stone-800 mb-6 flex items-center gap-2">
        <History className="text-red-600" /> ประวัติการเปิด-ปิดร้าน (Store History)
      </h2>

      {!selectedSession ? renderSessionList() : renderSessionDetails()}

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