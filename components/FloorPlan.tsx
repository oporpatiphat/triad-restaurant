

import React, { useState, useMemo } from 'react';
import { useStore } from '../services/StoreContext';
import { MenuItem, Table, TableStatus, CustomerClass, OrderStatus, OrderItem } from '../types';
import { Utensils, Users, CheckCircle, Search, X, DollarSign, CreditCard, Banknote, Plus, Minus, AlertOctagon, Loader2, Package, ShoppingBag, Truck, Edit3, UtensilsCrossed } from 'lucide-react';

export const FloorPlan: React.FC = () => {
  const { tables, menu, inventory, createOrder, addItemsToOrder, requestCheckBill, settleTableBill, orders } = useStore();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  
  // New Order / Add Items State
  const [customerName, setCustomerName] = useState('');
  const [customerClass, setCustomerClass] = useState<CustomerClass>(CustomerClass.MIDDLE);
  const [orderBasket, setOrderBasket] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [boxCount, setBoxCount] = useState(0); 
  const [bagCount, setBagCount] = useState(0); 
  const [tableNote, setTableNote] = useState('');
  
  // NEW: Staff Meal Toggle
  const [isStaffMeal, setIsStaffMeal] = useState(false);

  const availableMenu = menu.filter(m => m.isAvailable && m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // AGGREGATE ALL ACTIVE ORDERS FOR THIS TABLE
  const tableActiveOrders = useMemo(() => {
     if (!selectedTable) return [];
     return orders.filter(o => 
         o.tableId === selectedTable.id && 
         o.status !== OrderStatus.COMPLETED && 
         o.status !== OrderStatus.CANCELLED
     ).sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [selectedTable, orders]);

  // Derive "Main" info from the first active order
  const mainActiveOrder = tableActiveOrders.length > 0 ? tableActiveOrders[0] : null;
  const isWaitingPayment = tableActiveOrders.some(o => o.status === OrderStatus.WAITING_PAYMENT);

  // Combine items for display in the summary (SORTED by Category then Custom Order)
  const aggregatedItems = useMemo(() => {
     const allItems: { item: OrderItem, orderId: string, status: OrderStatus, isStaffMeal?: boolean }[] = [];
     tableActiveOrders.forEach(order => {
         order.items.forEach(item => {
             allItems.push({ item, orderId: order.id, status: order.status, isStaffMeal: order.isStaffMeal });
         });
     });

     // SORT LOGIC
     return allItems.sort((a, b) => {
        const menuA = menu.find(m => m.id === a.item.menuItemId);
        const menuB = menu.find(m => m.id === b.item.menuItemId);
        
        if (!menuA || !menuB) return 0;

        // 1. Sort by Category Priority
        const catOrder = ['Main Dish', 'Appetizer', 'Soup', 'Drink', 'Set', 'Other'];
        const idxA = catOrder.indexOf(menuA.category);
        const idxB = catOrder.indexOf(menuB.category);
        
        if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
            return idxA - idxB;
        }

        // 2. Sort by Custom SortOrder (from Menu Management)
        const sortA = menuA.sortOrder !== undefined ? menuA.sortOrder : 9999;
        const sortB = menuB.sortOrder !== undefined ? menuB.sortOrder : 9999;
        
        if (sortA !== sortB) {
            return sortA - sortB;
        }

        // 3. Fallback to Name
        return menuA.name.localeCompare(menuB.name);
     });
  }, [tableActiveOrders, menu]);

  const aggregatedTotal = useMemo(() => {
      return tableActiveOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  }, [tableActiveOrders]);

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
    setBoxCount(0);
    setBagCount(0);
    setTableNote('');
    setIsStaffMeal(false); // Reset staff meal toggle
  };

  const addToBasket = (item: MenuItem) => {
    // Basic checks
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
    
    setIsSubmitting(true);

    if (selectedTable.status === TableStatus.AVAILABLE) {
        // NEW TABLE OPENING
        if (orderBasket.length === 0) {
            alert("กรุณาเลือกรายการอาหาร");
            setIsSubmitting(false);
            return;
        }
        if (!customerName) {
            alert("กรุณาระบุชื่อลูกค้า");
            setIsSubmitting(false);
            return;
        }
        const success = await createOrder(selectedTable.id, customerName, customerClass, orderBasket, boxCount, bagCount, tableNote, isStaffMeal);
        if (success) cleanupAndClose();
    } else {
        // ADDING ITEMS (CREATES NEW ORDER)
        if (orderBasket.length === 0 && !tableNote) {
             setSelectedTable(null); // Just close if nothing to add
             return;
        }
        
        // Use the new function that spawns a separate order document
        const success = await addItemsToOrder(selectedTable.id, orderBasket, boxCount, bagCount, tableNote, isStaffMeal);
        if (success) cleanupAndClose();
    }
    setIsSubmitting(false);
  };

  const cleanupAndClose = () => {
      setSelectedTable(null);
      setOrderBasket([]);
      setCustomerName('');
      setTableNote('');
      setIsStaffMeal(false);
  };

  const handleCheckBill = async () => {
    if (selectedTable) {
      await requestCheckBill(selectedTable.id);
    }
  };

  const handlePaymentReceived = async (method: 'CASH' | 'CARD') => {
    if (selectedTable) {
      await settleTableBill(selectedTable.id, method);
      setSelectedTable(null);
    }
  };

  const getTableStatusColor = (table: Table) => {
    if (table.status === TableStatus.AVAILABLE) return 'bg-white border-green-500/30 text-stone-700 hover:border-green-500 hover:bg-green-50/30';
    
    // Check if any order on table is waiting for payment
    const activeOrders = orders.filter(o => o.tableId === table.id && o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED);
    const isWaiting = activeOrders.some(o => o.status === OrderStatus.WAITING_PAYMENT);
    
    if (isWaiting) {
       return 'bg-blue-50 border-blue-500 text-blue-800 shadow-blue-100 animate-pulse';
    }
    
    return 'bg-red-50 border-red-500 text-red-800 shadow-red-100';
  };

  const getTableStatusText = (table: Table) => {
    if (table.status === TableStatus.AVAILABLE) return 'ว่าง';
    
    const activeOrders = orders.filter(o => o.tableId === table.id && o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED);
    const isWaiting = activeOrders.some(o => o.status === OrderStatus.WAITING_PAYMENT);

    if (isWaiting) return 'รอชำระเงิน';
    return 'ไม่ว่าง';
  }

  const renderFloorSection = (floor: 'GROUND' | 'UPPER' | 'DELIVERY', title: string) => {
    const isDelivery = floor === 'DELIVERY';
    return (
      <div className="mb-10">
        <h3 className={`text-xl font-bold text-stone-600 mb-4 px-2 border-l-4 ${isDelivery ? 'border-orange-500 text-orange-700' : 'border-red-600'}`}>{title}</h3>
        <div className="grid grid-cols-4 gap-8">
          {tables.filter(t => t.floor === floor).map(table => {
            const activeOrders = orders.filter(o => o.tableId === table.id && o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED);
            const isWaitingPay = activeOrders.some(o => o.status === OrderStatus.WAITING_PAYMENT);
            
            return (
            <button
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={`group relative aspect-square rounded-[2rem] border-4 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center justify-center
                ${getTableStatusColor(table)}`}
            >
              {/* Table Decoration */}
              {!isDelivery && (
                  <>
                  <div className={`absolute -top-3 w-1/2 h-2 rounded-full ${table.status === TableStatus.AVAILABLE ? 'bg-stone-300' : isWaitingPay ? 'bg-blue-300' : 'bg-red-300'}`}></div>
                  <div className={`absolute -bottom-3 w-1/2 h-2 rounded-full ${table.status === TableStatus.AVAILABLE ? 'bg-stone-300' : isWaitingPay ? 'bg-blue-300' : 'bg-red-300'}`}></div>
                  <div className={`absolute -left-3 h-1/2 w-2 rounded-full ${table.status === TableStatus.AVAILABLE ? 'bg-stone-300' : isWaitingPay ? 'bg-blue-300' : 'bg-red-300'}`}></div>
                  <div className={`absolute -right-3 h-1/2 w-2 rounded-full ${table.status === TableStatus.AVAILABLE ? 'bg-stone-300' : isWaitingPay ? 'bg-blue-300' : 'bg-red-300'}`}></div>
                  </>
              )}

              {isDelivery && (
                  <div className="absolute top-2 left-2 opacity-20">
                      <Truck size={32} />
                  </div>
              )}

              <div className="text-5xl font-heading font-bold mb-1">{table.number}</div>
              <div className={`text-sm font-bold uppercase mb-2 ${table.status === TableStatus.AVAILABLE ? 'text-green-600' : isWaitingPay ? 'text-blue-600' : 'text-red-600'}`}>
                  {getTableStatusText(table)}
              </div>
              
              {!isDelivery && (
                <div className="flex items-center gap-1.5 text-sm font-medium opacity-60 bg-white/50 px-3 py-1 rounded-full">
                  <Users size={16} /> {table.capacity}
                </div>
              )}
              
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
  };

  // Helper to calculate current basket price
  const basketTotal = orderBasket.reduce((sum, i) => sum + (i.price * i.quantity), 0) + (boxCount * 100);

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
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#a8a29e 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10">
          {renderFloorSection('GROUND', 'ชั้นล่าง (Ground Floor)')}
          {renderFloorSection('UPPER', 'ชั้นบน (Upper Floor)')}
          {renderFloorSection('DELIVERY', 'โซนเดลิเวอรี่ (Delivery)')}
        </div>
      </div>

      {/* New Order / Table Detail Modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-7xl h-[90vh] rounded-3xl shadow-2xl flex overflow-hidden border border-stone-200">
            
            {/* LEFT SIDE: Menu Selection */}
            <div className="flex-1 p-8 overflow-y-auto bg-stone-50 border-r border-stone-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-stone-800 font-heading">
                      {selectedTable.status === TableStatus.AVAILABLE ? 'เปิดโต๊ะ / สั่งอาหาร' : 'สั่งอาหารเพิ่ม (Add Items)'}
                  </h3>
                  <p className="text-stone-500 text-sm">เลือกรายการเพื่อเพิ่มลงในออเดอร์ (ออเดอร์ใหม่จะถูกส่งเข้าครัวแยกใบ)</p>
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
                        const remainingQuota = item.dailyStock === -1 ? 999 : item.dailyStock - inBasketQty;
                        const isQuotaFull = remainingQuota <= 0;
                        const hasIngredients = item.ingredients.every(ingName => {
                           const stockItem = inventory.find(i => i.name === ingName);
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

            {/* RIGHT SIDE: Order Info & Summary */}
            <div className="w-96 bg-white flex flex-col shadow-xl z-20">
              <div className="p-6 bg-red-50 border-b border-red-100">
                 <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-bold">{selectedTable.number}</span>
                      <span className="text-sm font-bold text-red-900 uppercase tracking-wide">
                        {selectedTable.status === TableStatus.AVAILABLE ? 'New Table' : 'Combined Bill'}
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
                    <div className="bg-white p-3 rounded-lg border border-red-100">
                       <div className="text-sm font-bold text-stone-800">{mainActiveOrder?.customerName || 'Unknown'}</div>
                       <div className="text-xs text-red-500 font-bold uppercase">{mainActiveOrder?.customerClass || 'General'}</div>
                       <div className="text-[10px] text-stone-400 mt-1">{tableActiveOrders.length} Active Orders</div>
                    </div>
                 )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* BASKET SECTION (New Items) */}
                {orderBasket.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                           <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">รายการที่กำลังเพิ่ม (New Order)</div>
                           
                           {/* Staff Meal Toggle */}
                           <button 
                             onClick={() => setIsStaffMeal(!isStaffMeal)}
                             className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold transition-colors border ${isStaffMeal ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-stone-100 text-stone-400 border-transparent hover:bg-stone-200'}`}
                           >
                              <UtensilsCrossed size={12} />
                              {isStaffMeal ? 'Staff Meal (ฟรี)' : 'ทำกินเอง?'}
                           </button>
                        </div>
                        
                        <div className={`space-y-2 p-2 rounded-xl transition-colors ${isStaffMeal ? 'bg-amber-50/50 border border-amber-100' : ''}`}>
                            {orderBasket.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white text-red-700 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">
                                    x{item.quantity}
                                    </div>
                                    <div>
                                        <div className="font-bold text-stone-800 text-sm">{item.name}</div>
                                        <div className="text-xs text-stone-500">
                                            {isStaffMeal ? <span className="text-amber-600 font-bold line-through decoration-amber-600/50">฿{item.price * item.quantity}</span> : `฿${item.price * item.quantity}`}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => addToBasket(menu.find(m => m.id === item.menuItemId)!)} className="p-1 hover:bg-green-100 text-green-600 rounded"><Plus size={14}/></button>
                                    <button onClick={() => removeFromBasket(idx)} className="p-1 hover:bg-red-200 text-red-600 rounded"><Minus size={14}/></button>
                                </div>
                                </div>
                            ))}
                        </div>
                        <div className="my-4 border-t border-stone-200 border-dashed"></div>
                    </div>
                )}

                {/* ACTIVE ORDERS ITEMS SECTION (Aggregated) */}
                {selectedTable.status !== TableStatus.AVAILABLE && aggregatedItems.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-stone-400 uppercase mb-2 tracking-wider">รายการที่สั่งแล้ว (Total Bill)</div>
                      <div className="space-y-2 opacity-80">
                        {/* Display Boxes/Bags Summation */}
                        {tableActiveOrders.reduce((s, o) => s + (o.boxCount || 0), 0) > 0 && (
                            <div className="flex justify-between items-center p-2 bg-orange-50 border border-orange-100 rounded-lg">
                                <div className="flex gap-2 items-center">
                                <Package size={14} className="text-orange-600"/>
                                <span className="font-bold text-stone-800 text-xs">รวมกล่อง x{tableActiveOrders.reduce((s, o) => s + (o.boxCount || 0), 0)}</span>
                                </div>
                                <div className="text-xs font-bold text-stone-600">฿{tableActiveOrders.reduce((s, o) => s + (o.boxCount || 0) * 100, 0)}</div>
                            </div>
                        )}
                        {tableActiveOrders.reduce((s, o) => s + (o.bagCount || 0), 0) > 0 && (
                            <div className="flex justify-between items-center p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                <div className="flex gap-2 items-center">
                                <ShoppingBag size={14} className="text-blue-600"/>
                                <span className="font-bold text-stone-800 text-xs">รวมถุง x{tableActiveOrders.reduce((s, o) => s + (o.bagCount || 0), 0)}</span>
                                </div>
                                <div className="text-xs font-bold text-green-600">Free</div>
                            </div>
                        )}

                        {/* Display Items */}
                        {aggregatedItems.map((entry, idx) => (
                            <div key={idx} className={`flex justify-between items-center p-2 border rounded-lg ${entry.isStaffMeal ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-100'}`}>
                                <div className="flex gap-2 items-center">
                                    <span className="font-bold text-stone-900 text-xs">x{entry.item.quantity}</span>
                                    <span className="text-stone-700 text-xs">{entry.item.name}</span>
                                    {/* Small indicator of which order batch it belongs to (Optional, but useful) */}
                                    <span className="text-[9px] text-stone-300 ml-1">#{entry.orderId.slice(-3)}</span>
                                    {entry.isStaffMeal && <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded font-bold">Staff</span>}
                                </div>
                                <div className="text-xs font-bold text-stone-600">
                                   {entry.isStaffMeal ? <span className="text-amber-600">ฟรี</span> : `฿${entry.item.price * entry.item.quantity}`}
                                </div>
                            </div>
                        ))}

                        {/* Show Notes from all orders */}
                        {tableActiveOrders.map(o => o.note && (
                            <div key={o.id} className="p-2 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-100 mt-1">
                                <span className="font-bold">Note #{o.id.slice(-3)}:</span> {o.note}
                            </div>
                        ))}
                      </div>
                    </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-stone-100">
                {/* Box & Bag Controls */}
                {orderBasket.length > 0 && (
                   <div className="space-y-2 mb-4">
                       <div className="flex items-center justify-between p-2 rounded-lg border border-stone-200 bg-orange-50/50">
                           <div className="flex items-center gap-2">
                               <Package size={18} className="text-orange-600" />
                               <div>
                                   <div className="text-sm font-bold text-stone-700">กล่อง</div>
                                   <div className="text-xs text-stone-400">{isStaffMeal ? 'ฟรี' : '+100'}</div>
                               </div>
                           </div>
                           <div className="flex items-center gap-2">
                               <button onClick={() => setBoxCount(Math.max(0, boxCount - 1))} className="p-1 rounded-md bg-white border border-stone-200 hover:bg-stone-100 text-stone-500"><Minus size={14}/></button>
                               <span className="font-bold w-6 text-center text-stone-800">{boxCount}</span>
                               <button onClick={() => setBoxCount(boxCount + 1)} className="p-1 rounded-md bg-white border border-stone-200 hover:bg-stone-100 text-stone-500"><Plus size={14}/></button>
                           </div>
                       </div>
                       <div className="flex items-center justify-between p-2 rounded-lg border border-stone-200 bg-blue-50/50">
                           <div className="flex items-center gap-2">
                               <ShoppingBag size={18} className="text-blue-600" />
                               <div>
                                   <div className="text-sm font-bold text-stone-700">ถุง</div>
                                   <div className="text-xs text-green-600 font-bold">Free</div>
                               </div>
                           </div>
                           <div className="flex items-center gap-2">
                               <button onClick={() => setBagCount(Math.max(0, bagCount - 1))} className="p-1 rounded-md bg-white border border-stone-200 hover:bg-stone-100 text-stone-500"><Minus size={14}/></button>
                               <span className="font-bold w-6 text-center text-stone-800">{bagCount}</span>
                               <button onClick={() => setBagCount(bagCount + 1)} className="p-1 rounded-md bg-white border border-stone-200 hover:bg-stone-100 text-stone-500"><Plus size={14}/></button>
                           </div>
                       </div>
                   </div>
                )}

                {/* Note Input (Only for new items) */}
                <div className="mb-4">
                    <label className="text-xs font-bold text-stone-500 flex items-center gap-1 mb-1">
                        <Edit3 size={12}/> หมายเหตุสำหรับออเดอร์ใหม่
                    </label>
                    <textarea 
                        className="w-full border border-stone-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-red-500 outline-none resize-none bg-stone-50"
                        rows={2}
                        placeholder="เช่น แยก 2 กล่อง, ไม่ใส่ผัก..."
                        value={tableNote}
                        onChange={e => setTableNote(e.target.value)}
                    />
                </div>

                <div className="flex justify-between text-2xl font-bold text-stone-800 mb-4 font-heading">
                  <span>รวมทั้งสิ้น</span>
                  {isStaffMeal && orderBasket.length > 0 ? (
                      <span className="text-amber-600 flex flex-col items-end">
                         <span className="text-sm font-normal text-stone-400 line-through">฿{basketTotal.toLocaleString()}</span>
                         <span>ฟรี (Staff)</span>
                      </span>
                  ) : (
                      <span className="text-red-600">฿
                         {(aggregatedTotal + basketTotal).toLocaleString()}
                      </span>
                  )}
                </div>

                {/* Action Buttons */}
                {selectedTable.status === TableStatus.AVAILABLE ? (
                    <button 
                      onClick={submitOrder}
                      disabled={orderBasket.length === 0 || !customerName || isSubmitting}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 text-lg"
                    >
                      {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle size={24} />}
                      {isSubmitting ? 'กำลังบันทึก...' : 'เปิดโต๊ะ & สั่งอาหาร'}
                    </button>
                ) : (
                    <div className="flex gap-2">
                        {isWaitingPayment ? (
                            <div className="flex-1 grid grid-cols-2 gap-2">
                                <button onClick={() => handlePaymentReceived('CASH')} className="py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex flex-col items-center justify-center text-xs gap-1">
                                    <Banknote size={20} /> เงินสด
                                </button>
                                <button onClick={() => handlePaymentReceived('CARD')} className="py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex flex-col items-center justify-center text-xs gap-1">
                                    <CreditCard size={20} /> บัตร
                                </button>
                            </div>
                        ) : (
                            <>
                                <button 
                                    onClick={submitOrder}
                                    disabled={isSubmitting} // Even if basket empty, might just close
                                    className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-white shadow-lg ${orderBasket.length > 0 ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-stone-400 hover:bg-stone-500'}`}
                                >
                                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                                    {orderBasket.length > 0 ? 'สั่งเพิ่ม (แยกใบ)' : 'ปิดหน้าต่าง'}
                                </button>
                                <button 
                                    onClick={handleCheckBill}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20"
                                >
                                    <DollarSign size={20} /> เช็คบิล
                                </button>
                            </>
                        )}
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};