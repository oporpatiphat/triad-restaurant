import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Table, Order, MenuItem, Ingredient, TableStatus, OrderStatus, CustomerClass, StoreSession, OrderItem } from '../types';
import { generateTables, INITIAL_INGREDIENTS, INITIAL_MENU, MOCK_USERS, INITIAL_POSITIONS } from '../constants';

interface StoreContextType {
  currentUser: User | null;
  login: (username: string, password?: string) => boolean;
  logout: () => void;
  storeSession: StoreSession;
  openStore: (dailyMenuUpdates: MenuItem[]) => void;
  closeStore: () => void;
  tables: Table[];
  updateTableStatus: (tableId: string, status: TableStatus) => void;
  orders: Order[];
  createOrder: (tableId: string, customerName: string, customerClass: CustomerClass, items: OrderItem[]) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, actorName?: string, paymentMethod?: 'CASH' | 'CARD') => void;
  menu: MenuItem[];
  addMenuItem: (item: MenuItem) => void;
  toggleMenuAvailability: (itemId: string) => void;
  updateMenuStock: (itemId: string, quantity: number) => void;
  inventory: Ingredient[];
  updateIngredientQuantity: (itemId: string, delta: number) => void;
  addIngredient: (ingredient: Ingredient) => void;
  removeIngredient: (id: string) => void;
  staffList: User[];
  addStaff: (user: User) => void;
  updateStaff: (user: User) => void;
  terminateStaff: (userId: string) => void;
  availablePositions: string[];
  addPosition: (position: string) => void;
  removePosition: (position: string) => void;
  movePosition: (position: string, direction: 'up' | 'down') => void;
  resetSystem: () => void; // New function to clear data
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Enhance initial menu with default dailyStock
const ENHANCED_INITIAL_MENU = INITIAL_MENU.map(item => ({
  ...item,
  dailyStock: -1 // Default unlimited
}));

// LocalStorage Keys - UPDATED TO V5 FOR FINAL PRODUCTION DEPLOYMENT (Clean Users)
const KEYS = {
  TABLES: 'TRIAD_TABLES_V5',
  ORDERS: 'TRIAD_ORDERS_V5',
  MENU: 'TRIAD_MENU_V5',
  INVENTORY: 'TRIAD_INVENTORY_V5',
  STAFF: 'TRIAD_STAFF_V5',
  POSITIONS: 'TRIAD_POSITIONS_V5',
  SESSION: 'TRIAD_SESSION_V5'
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- Initialize State from LocalStorage or Defaults ---

  const [storeSession, setStoreSession] = useState<StoreSession>(() => {
    try {
      const saved = localStorage.getItem(KEYS.SESSION);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
           ...parsed,
           openedAt: new Date(parsed.openedAt),
           closedAt: parsed.closedAt ? new Date(parsed.closedAt) : undefined
        };
      }
    } catch(e) {}
    return { isOpen: false, openedAt: new Date() };
  });

  const [tables, setTables] = useState<Table[]>(() => {
    try {
      const saved = localStorage.getItem(KEYS.TABLES);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return generateTables();
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(KEYS.ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((o: any) => ({
          ...o,
          timestamp: new Date(o.timestamp)
        }));
      }
    } catch(e) {}
    return [];
  });

  const [menu, setMenu] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem(KEYS.MENU);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return ENHANCED_INITIAL_MENU;
  });

  const [inventory, setInventory] = useState<Ingredient[]>(() => {
    try {
      const saved = localStorage.getItem(KEYS.INVENTORY);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return INITIAL_INGREDIENTS;
  });
  
  const [staffList, setStaffList] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(KEYS.STAFF);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return MOCK_USERS;
  });

  const [availablePositions, setAvailablePositions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(KEYS.POSITIONS);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return INITIAL_POSITIONS;
  });

  // --- Effects to Save State Changes to LocalStorage ---

  useEffect(() => {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(storeSession));
  }, [storeSession]);

  useEffect(() => {
    localStorage.setItem(KEYS.TABLES, JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(KEYS.MENU, JSON.stringify(menu));
  }, [menu]);

  useEffect(() => {
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem(KEYS.STAFF, JSON.stringify(staffList));
  }, [staffList]);

  useEffect(() => {
    localStorage.setItem(KEYS.POSITIONS, JSON.stringify(availablePositions));
  }, [availablePositions]);


  // --- Actions ---

  const resetSystem = () => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลทั้งหมด? (ข้อมูลออเดอร์, สต็อก จะหายไป)")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const login = (username: string, password?: string) => {
    const user = staffList.find(u => u.username === username && u.password === password);
    if (user) {
      if (!user.isActive) {
        alert("บัญชีนี้ถูกระงับการใช้งานแล้ว (Resigned/Inactive)");
        return false;
      }
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  const openStore = (dailyMenuUpdates: MenuItem[]) => {
    setMenu(dailyMenuUpdates);
    setStoreSession({ isOpen: true, openedAt: new Date() });
  };

  const closeStore = () => {
    setStoreSession(prev => ({ ...prev, isOpen: false, closedAt: new Date() }));
  };

  const updateTableStatus = (tableId: string, status: TableStatus) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
  };

  const createOrder = (tableId: string, customerName: string, customerClass: CustomerClass, items: OrderItem[]) => {
    // 1. Validate Daily Stock (Quota Limit)
    for (const item of items) {
      const menuItem = menu.find(m => m.id === item.menuItemId);
      if (menuItem && menuItem.dailyStock !== -1 && menuItem.dailyStock < item.quantity) {
        alert(`ขออภัย เมนู ${menuItem.name} เหลือเพียง ${menuItem.dailyStock} ที่ (สั่งไป ${item.quantity})`);
        return;
      }
    }

    // 2. Validate Inventory (Physical Stock Limit)
    const requiredIngredients = new Map<string, number>();
    items.forEach(orderItem => {
      const menuItem = menu.find(m => m.id === orderItem.menuItemId);
      if (menuItem && menuItem.ingredients) {
        menuItem.ingredients.forEach(ingName => {
          const current = requiredIngredients.get(ingName) || 0;
          requiredIngredients.set(ingName, current + orderItem.quantity);
        });
      }
    });

    for (const [ingName, requiredQty] of requiredIngredients.entries()) {
      const stockItem = inventory.find(i => i.name === ingName);
      if (!stockItem || stockItem.quantity < requiredQty) {
        alert(`ไม่สามารถเปิดออเดอร์ได้: วัตถุดิบ "${ingName}" ไม่เพียงพอ (ขาด ${requiredQty - (stockItem?.quantity || 0)})`);
        return;
      }
    }

    // 3. Deduct Daily Stock
    setMenu(prevMenu => prevMenu.map(m => {
      const orderItem = items.find(i => i.menuItemId === m.id);
      if (orderItem && m.dailyStock !== -1) {
        return { ...m, dailyStock: Math.max(0, m.dailyStock - orderItem.quantity) };
      }
      return m;
    }));

    // 4. Deduct Raw Inventory
    setInventory(prevInventory => {
      const newInventory = prevInventory.map(ing => ({ ...ing }));
      items.forEach(orderItem => {
        const menuItem = menu.find(m => m.id === orderItem.menuItemId);
        if (menuItem && menuItem.ingredients) {
          menuItem.ingredients.forEach(ingName => {
             const targetIngIndex = newInventory.findIndex(i => i.name === ingName);
             if (targetIngIndex !== -1) {
               const currentQty = newInventory[targetIngIndex].quantity;
               newInventory[targetIngIndex].quantity = Math.max(0, currentQty - orderItem.quantity);
             }
          });
        }
      });
      return newInventory;
    });

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      tableId,
      customerName,
      customerClass,
      items: items,
      status: OrderStatus.PENDING,
      totalAmount: items.reduce((sum, i) => sum + (i.price * i.quantity), 0),
      timestamp: new Date()
    };
    setOrders(prev => [...prev, newOrder]);
    
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: TableStatus.OCCUPIED, currentOrderId: newOrder.id } : t));
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, actorName?: string, paymentMethod?: 'CASH' | 'CARD') => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const updates: Partial<Order> = { status };
      if (status === OrderStatus.COOKING && actorName) updates.chefName = actorName;
      if (status === OrderStatus.SERVING && actorName) updates.serverName = actorName;
      if (status === OrderStatus.COMPLETED && paymentMethod) updates.paymentMethod = paymentMethod;
      return { ...o, ...updates };
    }));

    if (status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED) {
      const order = orders.find(o => o.id === orderId);
      const targetTableId = order?.tableId;

      if (targetTableId) {
        setTables(prev => prev.map(t => 
          t.id === targetTableId
            ? { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined } 
            : t
        ));
      } else {
        setTables(prev => prev.map(t => 
          t.currentOrderId === orderId 
            ? { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined } 
            : t
        ));
      }

      // REFUND LOGIC
      if (status === OrderStatus.CANCELLED && order) {
        setMenu(prevMenu => prevMenu.map(m => {
          const orderItem = order.items.find(i => i.menuItemId === m.id);
          if (orderItem && m.dailyStock !== -1) {
             return { ...m, dailyStock: m.dailyStock + orderItem.quantity };
          }
          return m;
        }));

        setInventory(prevInv => {
           const newInv = prevInv.map(i => ({...i}));
           order.items.forEach(orderItem => {
              const menuItem = menu.find(m => m.id === orderItem.menuItemId);
              if (menuItem && menuItem.ingredients) {
                 menuItem.ingredients.forEach(ingName => {
                    const targetIndex = newInv.findIndex(i => i.name === ingName);
                    if (targetIndex !== -1) {
                       newInv[targetIndex].quantity += orderItem.quantity;
                    }
                 });
              }
           });
           return newInv;
        });
      }
    }
  };

  const addMenuItem = (item: MenuItem) => {
    setMenu(prev => [...prev, item]);
  };

  const toggleMenuAvailability = (itemId: string) => {
    setMenu(prev => prev.map(item => item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item));
  };
  
  const updateMenuStock = (itemId: string, quantity: number) => {
    setMenu(prev => prev.map(item => item.id === itemId ? { ...item, dailyStock: quantity } : item));
  };

  const updateIngredientQuantity = (itemId: string, delta: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id === itemId) {
         const newQuantity = Math.max(0, item.quantity + delta);
         return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const addIngredient = (ingredient: Ingredient) => {
    setInventory(prev => [...prev, ingredient]);
  };

  const removeIngredient = (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  };

  const addStaff = (user: User) => {
    setStaffList(prev => [...prev, user]);
  };

  const updateStaff = (user: User) => {
    setStaffList(prev => prev.map(u => u.id === user.id ? user : u));
  };

  const terminateStaff = (userId: string) => {
    if (!currentUser) return;
    const targetUser = staffList.find(u => u.id === userId);
    if (!targetUser) return;
    const protectedPositions = ['Admin', 'Co-CEO'];
    const lowerAdmins = ['CEO', 'Manager'];
    if (lowerAdmins.includes(currentUser.position) && protectedPositions.includes(targetUser.position)) {
        alert(`ไม่อนุญาต: ระดับ ${currentUser.position} ไม่สามารถลบบัญชีระดับ ${targetUser.position} ได้`);
        return;
    }
    setStaffList(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          isActive: false,
          endDate: new Date().toISOString().split('T')[0]
        };
      }
      return u;
    }));
  };

  const addPosition = (position: string) => {
    if (!availablePositions.includes(position)) {
      setAvailablePositions(prev => [...prev, position]);
    }
  };

  const removePosition = (position: string) => {
    setAvailablePositions(prev => prev.filter(p => p !== position));
  };

  const movePosition = (position: string, direction: 'up' | 'down') => {
    const index = availablePositions.indexOf(position);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === availablePositions.length - 1) return;

    const newPositions = [...availablePositions];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newPositions[index], newPositions[swapIndex]] = [newPositions[swapIndex], newPositions[index]];
    setAvailablePositions(newPositions);
  };

  return (
    <StoreContext.Provider value={{
      currentUser, login, logout,
      storeSession, openStore, closeStore,
      tables, updateTableStatus,
      orders, createOrder, updateOrderStatus,
      menu, addMenuItem, toggleMenuAvailability, updateMenuStock,
      inventory, updateIngredientQuantity, addIngredient, removeIngredient,
      staffList, addStaff, updateStaff, terminateStaff,
      availablePositions, addPosition, removePosition, movePosition,
      resetSystem
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};