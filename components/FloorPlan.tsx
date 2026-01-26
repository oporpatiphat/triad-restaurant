import React, { useState, useMemo } from 'react';
import { useStore } from '../services/StoreContext';
import { MenuItem, Table, TableStatus, CustomerClass, OrderStatus, OrderItem } from '../types';
import { Utensils, Users, CheckCircle, Search, X, DollarSign, CreditCard, Banknote, Plus, Minus, AlertOctagon, Loader2, Package } from 'lucide-react';

export const FloorPlan: React.FC = () => {
  const { tables, menu, inventory, createOrder, updateOrderStatus, orders } = useStore();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  
  // New Order State
  const [customerName, setCustomerName] = useState('');
  const [customerClass, setCustomerClass] = useState<CustomerClass>(CustomerClass.MIDDLE);
  const [orderBasket, setOrderBasket] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [includeBox, setIncludeBox] = useState(false); // New State for Box Fee

  const availableMenu = menu.filter(m => m.isAvailable && m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Get Active Order for selected table
  const currentActiveOrder = selectedTable?.currentOrderId ? orders.find(o => o.id === selectedTable.currentOrderId) : null;
  const isWaitingPayment = currentActiveOrder?.status === OrderStatus.WAITING_PAYMENT;

  // Derive unique past customers for suggestion
  const pastCustomers = useMemo(() => {
     const names = new Set(orders.map(o => o.customerName));
     return Array.from(names).filter(Boolean);
  }, [orders]);

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    setOrderBasket([]);
    setSearchTerm('');
    setCustomerName('');
    setCustomerClass(CustomerClass.MIDDLE);
    setIncludeBox(false);
  };

  const addToBasket = (item: MenuItem) => {
    // Basic checks are handled by disable logic, but double check here
    if (item.dailyStock !== -1 && item.dailyStock <= 0) return;
    
    // Check total in basket
    const existingItemIndex = orderBasket.findIndex(i => i.menuItemId === item.id);
    const currentInBasket = existingItemIndex !== -1 ? orderBasket[existingItemIndex].quantity : 0;
    
    if (item.dailyStock !== -1 && (item.dailyStock - currentInBasket) <= 0) {
      alert('จำนวนในตะกร้าครบตามสต็อกที่เหลือแล้ว');
      return;
    }

    if (existingItemIndex !== -1) {
      // Increment
      const newBasket = [...orderBasket];
      newBasket[existingItemIndex].quantity += 1;
      setOrderBasket(newBasket);
    } else {
      // Add new
      setOrderBasket([...orderBasket, {
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        price: item.price
      }]);
    }
  };

  const removeFromBasket = (index: number) => {
    const newBasket = [...orderBasket];
    if (newBasket[index].quantity > 1) {
       newBasket[index].quantity -= 1;
    } else {
       newBasket.splice(index, 1);
    }
    setOrderBasket(newBasket);
  };

  const submitOrder = async () => {
    if (!selectedTable) return;
    if (orderBasket.length === 0) {
        alert("กรุณาเลือกรายการอาหาร");
        return;
    }
    if (!customerName) {
        alert("กรุณาระบุชื่อลูกค้า");
        return;
    }

    setIsSubmitting(true);
    
    // Await the creation process
    const success = await createOrder(selectedTable.id, customerName, customerClass, orderBasket, includeBox);
    
    setIsSubmitting(false);

    if (success) {
        setSelectedTable(null);
        setOrderBasket([]);
        setCustomerName('');
    }
    // If failed, modal stays open, basket stays intact, alert is shown by createOrder
  };

  const handleCheckBill = () => {
    if (currentActiveOrder) {
      updateOrderStatus(currentActiveOrder.id, OrderStatus.WAITING_PAYMENT);
    }
  };

  const handlePaymentReceived = (method: 'CASH' | 'CARD') => {
    if (currentActiveOrder) {
      // Remove confirm dialog to fix user experience issues
      updateOrderStatus(currentActiveOrder.id, OrderStatus.COMPLETED, undefined, method);
      setSelectedTable(null);
    }
  };

  const getTableStatusColor = (table: Table) => {
    if (table.status === TableStatus.AVAILABLE) return 'bg-white border-green-500/30 text-stone-700 hover:border-green-500 hover:bg-green-50/30';
    
    // Check if waiting for payment
    const order = orders.find(o => o.id === table.currentOrderId);
    if (order?.status === OrderStatus.WAITING_PAYMENT) {
       return 'bg-blue-50 border-blue-500 text-blue-800 shadow-blue-100 animate-pulse';
    }
    
    return 'bg-red-50 border-red-500 text-red-800 shadow-red-100';
  };

  const getTableStatusText = (table: Table) => {
    if (table.status === TableStatus.AVAILABLE) return 'ว่าง';
    const order = orders.find(o => o.id === table.currentOrderId);
    if (order?.status === OrderStatus.WAITING_PAYMENT) return 'รอชำระเงิน';
    return 'ไม่ว่าง';
  }

  const renderFloorSection = (floor: 'GROUND' | 'UPPER', title: string) => (
    <div className="mb-10">
      <h3 className="text-xl font-bold text-stone-600 mb-4 px-2 border-l-4 border-red-600">{title}</h3>
      <div className="grid grid-cols-4 gap-8">
        {tables.filter(t => t.floor === floor).map(table => {
          const order = orders.find(o => o.id === table.currentOrderId);
          const isWaitingPay = order?.status === OrderStatus.WAITING_PAYMENT;
          
          return (
          <button
            key={table.id}
            onClick={() => handleTableClick(table)}
            className={`group relative aspect-square rounded-[2rem] border-4 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center justify-center
              ${getTableStatusColor(table)}`}
          >
            {/* Chair Decoration */}
            <div className={`absolute -top-3 w-1/2 h-2 rounded-full ${table.status === TableStatus.AVAILABLE ? 'bg-stone-300' : isWaitingPay ? 'bg-blue-300' : 'bg-red-300'}`}></div>
            <div className={`absolute -bottom-3 w-1/2 h-2 rounded-full ${table.status === TableStatus.AVAILABLE ? 'bg-stone-300' : isWaitingPay ? 'bg-blue-300' : 'bg-red-300'}`}></div>
            <div className={`absolute -left-3 h-1/2 w-2 rounded-full ${table.status === TableStatus.AVAILABLE ? 'bg-stone-300' : isWaitingPay ? 'bg-blue-300' : 'bg-red-300'}`}></div>
            <div className={`absolute -right-3 h-1/2 w-2 rounded-full ${table.status === TableStatus.AVAILABLE ? 'bg-stone-300' : isWaitingPay ? 'bg-blue-300' : 'bg-red-300'}`}></div>

            <div className="text-5xl font-heading font-bold mb-1">{table.number}</div>
            <div className={`text-sm font-bold uppercase mb-2 ${table.status === TableStatus.AVAILABLE ? 'text-green-600' : isWaitingPay ? 'text-blue-600' : 'text-red-600'}`}>
                {getTableStatusText(table)}
            </div>
            
            <div className="flex items-center gap-1.5 text-sm font-medium opacity-60 bg-white/50 px-3 py-1 rounded-full">
              <Users size={16} /> {table.capacity}
            </div>
            
            {/* Status Dot */}
            <div className={`absolute top-4 right-4 w-4 h-4 rounded-full ${table.status === TableStatus.AVAILABLE ? 'bg-green-500' : isWaitingPay ? 'bg-blue-500 animate-bounce' : 'bg-red-500'} ring-4 ring-white`}></div>
            
            {/* Waiting Payment Indicator */}
            {isWaitingPay && (
               <div className="absolute top-4 left-4 text-blue-600 bg-white p-1 rounded-full shadow-sm">
                  <DollarSign size={20} />
               </div>
            )}
          </button>
        )})}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-bold text-stone-800 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <Utensils size={32} />
            </div>
            <span>ผังที่นั่ง</span>
          </h2>
          <p className="text-stone-500 mt-1 ml-16">จัดการสถานะโต๊ะและรับออเดอร์</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl p-8 shadow-sm border border-stone-200 overflow-y-auto relative">
        {/* Floor Background Decor */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#a8a29e 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10">
          {renderFloorSection('GROUND', 'ชั้นล่าง (Ground Floor)')}
          {renderFloorSection('UPPER', 'ชั้นบน (Upper Floor)')}
        </div>
      </div>

      {/* New Order / Table Detail Modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-7xl h-[90vh] rounded-3xl shadow-2xl flex overflow-hidden border border-stone-200">
            
            {/* LEFT SIDE: Menu Selection (Only if table is available) */}
            {selectedTable.status === TableStatus.AVAILABLE ? (
            <div className="flex-1 p-8 overflow-y-auto bg-stone-50">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-stone-800 font-heading">เมนูอาหารที่เปิดขาย</h3>
                  <p className="text-stone-500 text-sm">เลือกรายการเพื่อเพิ่มลงในออเดอร์</p>
                </div>
                <div className="relative w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                   <input 
                      type="text" 
                      placeholder="ค้นหาเมนู..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-full border border-stone-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                   />
                </div>
              </div>

              {/* Categorized Menu */}
              {['Main Dish', 'Appetizer', 'Soup', 'Drink', 'Set', 'Other'].map(category => {
                const items = availableMenu.filter(m => m.category === category);
                if (items.length === 0) return null;
                return (
                  <div key={category} className="mb-8">
                    <h4 className="text-lg font-bold text-red-800 mb-3 border-l-4 border-red-500 pl-3">{category}</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {items.map(item => {
                        const inBasketItem = orderBasket.find(i => i.menuItemId === item.id);
                        const inBasketQty = inBasketItem ? inBasketItem.quantity : 0;
                        
                        // Check Daily Stock Quota
                        const remainingQuota = item.dailyStock === -1 ? 999 : item.dailyStock - inBasketQty;
                        const isQuotaFull = remainingQuota <= 0;

                        // Check Physical Inventory
                        const hasIngredients = item.ingredients.every(ingName => {
                           const stockItem = inventory.find(i => i.name === ingName);
                           // Simple check: do we have ANY of this ingredient left?
                           // Ideally we check (stock - pending basket usage), but for UI speed this is acceptable visual feedback
                           return stockItem && stockItem.quantity > 0;
                        });

                        const isSoldOut = isQuotaFull || !hasIngredients;
                        const statusMessage = !hasIngredients ? 'วัตถุดิบหมด' : isQuotaFull ? 'โควต้าเต็ม' : item.dailyStock === -1 ? 'มีของ' : `เหลือ ${remainingQuota}`;

                        return (
                        <button 
                          key={item.id}
                          onClick={() => addToBasket(item)}
                          disabled={isSoldOut}
                          className={`flex flex-col text-left bg-white p-4 rounded-2xl shadow-sm border transition-all h-full relative overflow-hidden
                             ${isSoldOut ? 'border-stone-100 opacity-60 cursor-not-allowed grayscale bg-stone-50' : 'border-stone-200 hover:border-red-400 hover:shadow-lg group'}`}
                        >
                          <div className="flex justify-between w-full mb-1 items-start relative z-10">
                            <span className="font-bold text-lg text-stone-800 group-hover:text-red-700 transition-colors">{item.name}</span>
                            <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded-lg">฿{item.price}</span>
                          </div>
                          <p className="text-sm text-stone-500 line-clamp-2 mt-auto relative z-10">{item.description}</p>
                          <div className="mt-3 text-xs font-bold flex items-center justify-between relative z-10">
                             <span className={isSoldOut ? "text-red-500 flex items-center gap-1" : "text-green-600"}>
                               {isSoldOut && <AlertOctagon size={12}/>}
                               {statusMessage}
                             </span>
                          </div>
                        </button>
                      )})}
                    </div>
                  </div>
                );
              })}
            </div>
            ) : (
            // EXISTING ORDER VIEW (If table occupied)
            <div className="flex-1 p-8 bg-stone-50 flex flex-col items-center justify-center text-center">
                 <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full">
                     <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isWaitingPayment ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                        {isWaitingPayment ? <DollarSign size={40} /> : <Utensils size={40} />}
                     </div>
                     <h2 className="text-3xl font-bold text-stone-800 mb-2">โต๊ะ {selectedTable.number} ไม่ว่าง</h2>
                     <p className="text-stone-500 mb-8">
                        {isWaitingPayment ? 'ลูกค้ารอชำระเงิน กรุณาเลือกช่องทางชำระ' : 'ลูกค้ากำลังใช้บริการ (ตรวจสอบรายการอาหารได้ที่ด้านขวา)'}
                     </p>
                     
                     {isWaitingPayment ? (
                       <div className="w-full space-y-3">
                         <div className="text-sm text-stone-400 font-medium mb-1">เลือกช่องทางการชำระเงิน</div>
                         <div className="grid grid-cols-2 gap-4">
                            <button 
                              onClick={() => handlePaymentReceived('CASH')}
                              className="py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-600/20 flex flex-col items-center justify-center gap-2"
                            >
                                <Banknote size={28} />
                                <span>เงินสด (Cash)</span>
                            </button>
                            <button 
                              onClick={() => handlePaymentReceived('CARD')}
                              className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-600/20 flex flex-col items-center justify-center gap-2"
                            >
                                <CreditCard size={28} />
                                <span>บัตรเครดิต (Card)</span>
                            </button>
                         </div>
                       </div>
                     ) : (
                       <button 
                         onClick={handleCheckBill}
                         className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3"
                       >
                          <DollarSign /> เช็คบิล (Check Bill)
                       </button>
                     )}
                 </div>
            </div>
            )}

            {/* RIGHT SIDE: Order Info & Summary */}
            <div className="w-96 bg-white border-l border-stone-200 flex flex-col shadow-xl z-20">
              <div className="p-6 bg-red-50 border-b border-red-100">
                 <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-bold">{selectedTable.number}</span>
                      <span className="text-sm font-bold text-red-900 uppercase tracking-wide">
                        {selectedTable.status === TableStatus.AVAILABLE ? 'New Order' : 'Current Order'}
                      </span>
                    </div>
                    <button onClick={() => setSelectedTable(null)} className="text-red-400 hover:text-red-700 p-1 hover:bg-red-100 rounded-full transition-colors"><X size={20} /></button>
                 </div>
                 
                 {selectedTable.status === TableStatus.AVAILABLE ? (
                 <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-red-800 mb-1">ชื่อลูกค้า (Customer Name)</label>
                      <input 
                        type="text" 
                        list="customer-suggestions"
                        value={customerName} 
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full p-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                        placeholder="ระบุชื่อลูกค้า..."
                        autoFocus
                      />
                      <datalist id="customer-suggestions">
                        {pastCustomers.map(name => <option key={name} value={name} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-red-800 mb-1">ระดับลูกค้า (Class)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(CustomerClass).map(cls => (
                           <button
                              key={cls}
                              onClick={() => setCustomerClass(cls)}
                              className={`text-xs py-1.5 rounded-md border transition-all ${customerClass === cls ? 'bg-red-600 text-white border-red-600' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
                           >
                              {cls}
                           </button>
                        ))}
                      </div>
                    </div>
                 </div>
                 ) : (
                    // Display existing customer info
                    <div className="bg-white p-3 rounded-lg border border-red-100">
                       <div className="text-sm font-bold text-stone-800">{currentActiveOrder?.customerName}</div>
                       <div className="text-xs text-red-500 font-bold uppercase">{currentActiveOrder?.customerClass}</div>
                    </div>
                 )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {selectedTable.status === TableStatus.AVAILABLE ? (
                    // BASKET VIEW
                    orderBasket.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-stone-300 space-y-3">
                        <Utensils size={48} className="opacity-20" />
                        <p>ยังไม่มีรายการอาหาร</p>
                      </div>
                    ) : (
                      orderBasket.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl group hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-stone-200">
                          <div className="flex items-center gap-3">
                            <div className="bg-red-100 text-red-700 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
                               x{item.quantity}
                            </div>
                            <div>
                                <div className="font-bold text-stone-800 text-sm">{item.name}</div>
                                <div className="text-xs text-stone-500">฿{item.price * item.quantity}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                             <button onClick={() => addToBasket(menu.find(m => m.id === item.menuItemId)!)} className="p-1 hover:bg-green-100 text-green-600 rounded"><Plus size={14}/></button>
                             <button onClick={() => removeFromBasket(idx)} className="p-1 hover:bg-red-100 text-red-600 rounded"><Minus size={14}/></button>
                          </div>
                        </div>
                      ))
                    )
                ) : (
                    // CURRENT ORDER ITEMS VIEW
                    <div className="space-y-2">
                      {currentActiveOrder?.hasBoxFee && (
                        <div className="flex justify-between items-center p-3 bg-orange-50 border border-orange-100 rounded-xl">
                            <div className="flex gap-2 items-center">
                              <Package size={16} className="text-orange-600"/>
                              <span className="font-bold text-stone-800 text-sm">ค่ากล่อง (Box Fee)</span>
                            </div>
                            <div className="text-sm font-bold text-stone-600">฿100</div>
                        </div>
                      )}
                      {currentActiveOrder?.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-white border border-stone-100 rounded-xl">
                            <div className="flex gap-2">
                                <span className="font-bold text-stone-900 text-sm">x{item.quantity}</span>
                                <span className="text-stone-700 text-sm">{item.name}</span>
                            </div>
                            <div className="text-sm font-bold text-stone-600">฿{item.price * item.quantity}</div>
                          </div>
                      ))}
                    </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-stone-100">
                {/* Box Fee Checkbox for New Orders */}
                {selectedTable.status === TableStatus.AVAILABLE && orderBasket.length > 0 && (
                   <label className="flex items-center gap-2 mb-4 p-3 rounded-lg border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 accent-red-600"
                        checked={includeBox}
                        onChange={(e) => setIncludeBox(e.target.checked)}
                      />
                      <div className="flex-1">
                         <span className="text-sm font-bold text-stone-700 block">เพิ่มกล่อง (Box)</span>
                         <span className="text-xs text-stone-400">คิดค่าบริการเพิ่ม +100 LS$</span>
                      </div>
                      <span className="font-bold text-stone-600">+100</span>
                   </label>
                )}

                <div className="flex justify-between text-stone-500 mb-2 text-sm">
                   <span>จำนวนรายการ</span>
                   <span>
                     {selectedTable.status === TableStatus.AVAILABLE 
                        ? orderBasket.reduce((sum, i) => sum + i.quantity, 0)
                        : currentActiveOrder?.items.reduce((sum, i) => sum + i.quantity, 0)} รายการ
                   </span>
                </div>
                <div className="flex justify-between text-2xl font-bold text-stone-800 mb-6 font-heading">
                  <span>รวมทั้งสิ้น</span>
                  <span className="text-red-600">฿
                     {(selectedTable.status === TableStatus.AVAILABLE 
                        ? orderBasket.reduce((sum, i) => sum + (i.price * i.quantity), 0) + (includeBox ? 100 : 0)
                        : currentActiveOrder?.totalAmount || 0).toLocaleString()}
                  </span>
                </div>

                {selectedTable.status === TableStatus.AVAILABLE && (
                    <button 
                      onClick={submitOrder}
                      disabled={orderBasket.length === 0 || !customerName || isSubmitting}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 text-lg"
                    >
                      {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle size={24} />}
                      {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการสั่ง'}
                    </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
