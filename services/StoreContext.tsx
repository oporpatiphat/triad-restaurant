import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Table, Order, MenuItem, Ingredient, TableStatus, OrderStatus, CustomerClass, StoreSession, OrderItem, Role } from '../types';
import { generateTables, INITIAL_INGREDIENTS, INITIAL_MENU, MOCK_USERS, INITIAL_POSITIONS } from '../constants';
import { db, isCloudEnabled } from './firebaseConfig';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch, Timestamp, query, orderBy } from 'firebase/firestore';

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
  resetSystem: () => void;
  isCloudMode: boolean; // New status indicator
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Enhance initial menu with default dailyStock
const ENHANCED_INITIAL_MENU = INITIAL_MENU.map(item => ({
  ...item,
  dailyStock: -1 // Default unlimited
}));

// LocalStorage Keys
const KEYS = {
  TABLES: 'TRIAD_TABLES_V5',
  ORDERS: 'TRIAD_ORDERS_V5',
  MENU: 'TRIAD_MENU_V5',
  INVENTORY: 'TRIAD_INVENTORY_V5',
  STAFF: 'TRIAD_STAFF_V5',
  POSITIONS: 'TRIAD_POSITIONS_V5',
  SESSION: 'TRIAD_SESSION_V5',
  USER: 'TRIAD_USER_V5' // New Key for persistence
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isCloudMode] = useState(isCloudEnabled && !!db);

  // --- Initial State (Loads from LS first, overridden by Cloud later if active) ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(KEYS.USER);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  });

  // Persist User
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(KEYS.USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(KEYS.USER);
    }
  }, [currentUser]);

  const [storeSession, setStoreSession] = useState<StoreSession>(() => {
    if (isCloudMode) return { isOpen: false, openedAt: new Date() };
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
    if (isCloudMode) return generateTables();
    try {
      const saved = localStorage.getItem(KEYS.TABLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        // SAFETY CHECK: If array is empty, force regenerate default tables
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }
      }
    } catch(e) {}
    // If we reach here, either no save or empty save. Force Generate.
    return generateTables();
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    if (isCloudMode) return [];
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

  // --- SELF-HEALING: Sync Tables with Active Orders (Fix Disappearing Orders in Local Mode) ---
  useEffect(() => {
    // Only run this logic if NOT in cloud mode (Cloud mode handles via DB)
    if (isCloudMode) return;

    setTables(currentTables => {
      let hasChanges = false;
      const newTables = [...currentTables];

      // 1. Identify which tables SHOULD be occupied based on active orders
      const activeOrderMap = new Map<string, Order>(); // tableId -> Order
      orders.forEach(o => {
        if (o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED) {
           activeOrderMap.set(o.tableId, o);
        }
      });

      // 2. Scan tables and fix discrepancies
      for (let i = 0; i < newTables.length; i++) {
         const table = newTables[i];
         const activeOrder = activeOrderMap.get(table.id);

         if (activeOrder) {
            // Case A: Table should be occupied but is marked available (or wrong order linked)
            if (table.status === TableStatus.AVAILABLE || table.currentOrderId !== activeOrder.id) {
               newTables[i] = { 
                 ...table, 
                 status: activeOrder.status === OrderStatus.WAITING_PAYMENT ? TableStatus.OCCUPIED : TableStatus.OCCUPIED, 
                 currentOrderId: activeOrder.id 
               };
               hasChanges = true;
            }
         } else {
            // Case B: Table thinks it has an order, but that order doesn't exist/is closed in 'orders' list
            if (table.status === TableStatus.OCCUPIED && table.currentOrderId && !orders.find(o => o.id === table.currentOrderId)) {
                // Only free the table if the order ID is completely missing from our knowledge base (orphaned)
                // If the order exists but is COMPLETED, the createOrder/updateOrder logic usually handles it.
                // This is just a fallback for "phantom" locks.
                newTables[i] = {
                    ...table,
                    status: TableStatus.AVAILABLE,
                    currentOrderId: undefined
                };
                hasChanges = true;
            }
         }
      }

      return hasChanges ? newTables : currentTables;
    });
  }, [orders, isCloudMode]);


  const [menu, setMenu] = useState<MenuItem[]>(() => {
    if (isCloudMode) return ENHANCED_INITIAL_MENU;
    try {
      const saved = localStorage.getItem(KEYS.MENU);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return ENHANCED_INITIAL_MENU;
  });

  const [inventory, setInventory] = useState<Ingredient[]>(() => {
    if (isCloudMode) return INITIAL_INGREDIENTS;
    try {
      const saved = localStorage.getItem(KEYS.INVENTORY);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return INITIAL_INGREDIENTS;
  });
  
  const [staffList, setStaffList] = useState<User[]>(() => {
    if (isCloudMode) return MOCK_USERS;
    try {
      const saved = localStorage.getItem(KEYS.STAFF);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return MOCK_USERS;
  });

  const [availablePositions, setAvailablePositions] = useState<string[]>(() => {
    if (isCloudMode) return INITIAL_POSITIONS;
    try {
      const saved = localStorage.getItem(KEYS.POSITIONS);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return INITIAL_POSITIONS;
  });

  // --- CLOUD SYNCHRONIZATION (LISTENERS) ---
  useEffect(() => {
    if (!isCloudMode || !db) return;

    // Helper to convert Firestore Timestamp to Date
    const processDoc = (docSnap: any) => {
        const data = docSnap.data();
        Object.keys(data).forEach(key => {
            if (data[key] instanceof Timestamp) {
                data[key] = data[key].toDate();
            }
        });
        return { id: docSnap.id, ...data };
    };

    // Use db! here because isCloudMode check implies db is present
    const unsubSession = onSnapshot(doc(db!, 'config', 'session'), (doc) => {
        if (doc.exists()) {
            setStoreSession(processDoc(doc) as StoreSession);
        }
    });

    const unsubTables = onSnapshot(collection(db!, 'tables'), (snap) => {
        const data = snap.docs.map(processDoc) as Table[];
        // If Cloud DB is empty, don't override with empty array immediately to avoid UI glitch
        // But for consistency, if it's truly empty, we might need an admin init script.
        if (data.length > 0) {
           setTables(data.sort((a,b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1))));
        }
    });

    const unsubOrders = onSnapshot(query(collection(db!, 'orders'), orderBy('timestamp', 'asc')), (snap) => {
        setOrders(snap.docs.map(processDoc) as Order[]);
    });

    const unsubMenu = onSnapshot(collection(db!, 'menu'), (snap) => {
        setMenu(snap.docs.map(processDoc) as MenuItem[]);
    });

    const unsubInventory = onSnapshot(collection(db!, 'inventory'), (snap) => {
        setInventory(snap.docs.map(processDoc) as Ingredient[]);
    });

    const unsubStaff = onSnapshot(collection(db!, 'staff'), (snap) => {
        setStaffList(snap.docs.map(processDoc) as User[]);
    });

    const unsubPositions = onSnapshot(doc(db!, 'config', 'positions'), (doc) => {
        if (doc.exists()) {
            setAvailablePositions(doc.data().list);
        }
    });

    return () => {
        unsubSession();
        unsubTables();
        unsubOrders();
        unsubMenu();
        unsubInventory();
        unsubStaff();
        unsubPositions();
    };
  }, [isCloudMode]);

  // --- LocalStorage Fallback Effects ---
  useEffect(() => {
    if (!isCloudMode) localStorage.setItem(KEYS.SESSION, JSON.stringify(storeSession));
  }, [storeSession, isCloudMode]);

  useEffect(() => {
    // IMPORTANT: Only save if we actually have tables. 
    // This prevents overwriting valid data with an empty array if something goes wrong.
    if (!isCloudMode && tables.length > 0) {
        localStorage.setItem(KEYS.TABLES, JSON.stringify(tables));
    }
  }, [tables, isCloudMode]);

  useEffect(() => {
    if (!isCloudMode) localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  }, [orders, isCloudMode]);

  useEffect(() => {
    if (!isCloudMode) localStorage.setItem(KEYS.MENU, JSON.stringify(menu));
  }, [menu, isCloudMode]);

  useEffect(() => {
    if (!isCloudMode) localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inventory));
  }, [inventory, isCloudMode]);

  useEffect(() => {
    if (!isCloudMode) localStorage.setItem(KEYS.STAFF, JSON.stringify(staffList));
  }, [staffList, isCloudMode]);

  useEffect(() => {
    if (!isCloudMode) localStorage.setItem(KEYS.POSITIONS, JSON.stringify(availablePositions));
  }, [availablePositions, isCloudMode]);


  // --- Actions (Branching Logic) ---

  const resetSystem = () => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลทั้งหมด?")) {
      if (isCloudMode && db) {
         alert("Cannot reset cloud database from client for safety.");
      } else {
         localStorage.clear();
         window.location.reload();
      }
    }
  };

  const login = (username: string, password?: string) => {
    // 1. MASTER KEY LOGIC (เข้าได้เสมอ ไม่สน Database)
    if (username === 'sumalin' && password === '9753127') {
      const existingAdmin = staffList.find(u => u.username === 'sumalin');
      
      // ถ้ามีข้อมูลใน DB ให้ใช้ข้อมูลนั้น
      if (existingAdmin) {
        setCurrentUser(existingAdmin);
      } else {
        // ถ้าไม่มี (Database ว่างเปล่า) ให้สร้าง User Admin จำลองขึ้นมาเลย
        const masterAdmin: User = {
          id: 'u_master_admin',
          username: 'sumalin',
          name: 'คุณสุมลิน (Master)',
          role: Role.OWNER,
          position: 'Co-CEO',
          staffClass: 'Elite',
          startDate: new Date().toISOString(),
          isActive: true
        };
        setCurrentUser(masterAdmin);
      }
      return true;
    }

    // 2. Normal Login Logic
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

  const openStore = async (dailyMenuUpdates: MenuItem[]) => {
    if (isCloudMode && db) {
       const batch = writeBatch(db!);
       batch.set(doc(db!, 'config', 'session'), { isOpen: true, openedAt: new Date() });
       dailyMenuUpdates.forEach(m => {
          batch.update(doc(db!, 'menu', m.id), { dailyStock: m.dailyStock, isAvailable: m.isAvailable });
       });
       await batch.commit();
    } else {
       setMenu(dailyMenuUpdates);
       setStoreSession({ isOpen: true, openedAt: new Date() });
    }
  };

  const closeStore = async () => {
    if (isCloudMode && db) {
        await updateDoc(doc(db!, 'config', 'session'), { isOpen: false, closedAt: new Date() });
    } else {
        setStoreSession(prev => ({ ...prev, isOpen: false, closedAt: new Date() }));
    }
  };

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    if (isCloudMode && db) {
        await updateDoc(doc(db!, 'tables', tableId), { status });
    } else {
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
    }
  };

  const createOrder = async (tableId: string, customerName: string, customerClass: CustomerClass, items: OrderItem[]) => {
    for (const item of items) {
      const menuItem = menu.find(m => m.id === item.menuItemId);
      if (menuItem && menuItem.dailyStock !== -1 && menuItem.dailyStock < item.quantity) {
        alert(`ขออภัย เมนู ${menuItem.name} เหลือเพียง ${menuItem.dailyStock} ที่ (สั่งไป ${item.quantity})`);
        return;
      }
    }
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
        alert(`ไม่สามารถเปิดออเดอร์ได้: วัตถุดิบ "${ingName}" ไม่เพียงพอ`);
        return;
      }
    }

    const newOrder: Order = {
        id: `ord-${Date.now()}-${Math.floor(Math.random()*1000)}`, // Reduced collision chance
        tableId,
        customerName,
        customerClass,
        items: items,
        status: OrderStatus.PENDING,
        totalAmount: items.reduce((sum, i) => sum + (i.price * i.quantity), 0),
        timestamp: new Date()
    };

    if (isCloudMode && db) {
        const batch = writeBatch(db!);
        batch.set(doc(db!, 'orders', newOrder.id), newOrder);
        batch.update(doc(db!, 'tables', tableId), { status: TableStatus.OCCUPIED, currentOrderId: newOrder.id });
        items.forEach(orderItem => {
            const menuItem = menu.find(m => m.id === orderItem.menuItemId);
            if (menuItem && menuItem.dailyStock !== -1) {
                const newStock = Math.max(0, menuItem.dailyStock - orderItem.quantity);
                batch.update(doc(db!, 'menu', menuItem.id), { dailyStock: newStock });
            }
        });
        for (const [ingName, requiredQty] of requiredIngredients.entries()) {
            const stockItem = inventory.find(i => i.name === ingName);
            if (stockItem) {
                batch.update(doc(db!, 'inventory', stockItem.id), { quantity: Math.max(0, stockItem.quantity - requiredQty) });
            }
        }
        await batch.commit();
    } else {
        setMenu(prevMenu => prevMenu.map(m => {
            const orderItem = items.find(i => i.menuItemId === m.id);
            if (orderItem && m.dailyStock !== -1) {
                return { ...m, dailyStock: Math.max(0, m.dailyStock - orderItem.quantity) };
            }
            return m;
        }));
        setInventory(prevInventory => {
            const newInventory = prevInventory.map(ing => ({ ...ing }));
            for (const [ingName, requiredQty] of requiredIngredients.entries()) {
                const idx = newInventory.findIndex(i => i.name === ingName);
                if (idx !== -1) newInventory[idx].quantity -= requiredQty;
            }
            return newInventory;
        });
        setOrders(prev => [...prev, newOrder]);
        // Note: Table status update is also handled by the new useEffect, but explicit update here is safer for immediate feedback
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: TableStatus.OCCUPIED, currentOrderId: newOrder.id } : t));
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, actorName?: string, paymentMethod?: 'CASH' | 'CARD') => {
    const updates: any = { status };
    if (status === OrderStatus.COOKING && actorName) updates.chefName = actorName;
    if (status === OrderStatus.SERVING && actorName) updates.serverName = actorName;
    if (status === OrderStatus.COMPLETED && paymentMethod) updates.paymentMethod = paymentMethod;

    if (isCloudMode && db) {
        const batch = writeBatch(db!);
        batch.update(doc(db!, 'orders', orderId), updates);
        if (status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED) {
            const order = orders.find(o => o.id === orderId);
            const targetTableId = order?.tableId;
            if (targetTableId) {
                batch.update(doc(db!, 'tables', targetTableId), { status: TableStatus.AVAILABLE, currentOrderId: null });
            } 
            if (status === OrderStatus.CANCELLED && order) {
                 order.items.forEach(item => {
                    const m = menu.find(x => x.id === item.menuItemId);
                    if(m && m.dailyStock !== -1) {
                        batch.update(doc(db!, 'menu', m.id), { dailyStock: m.dailyStock + item.quantity });
                    }
                    if (m && m.ingredients) {
                        m.ingredients.forEach(ingName => {
                            const inv = inventory.find(i => i.name === ingName);
                            if(inv) batch.update(doc(db!, 'inventory', inv.id), { quantity: inv.quantity + item.quantity });
                        });
                    }
                 });
            }
        }
        await batch.commit();
    } else {
        setOrders(prev => prev.map(o => {
            if (o.id !== orderId) return o;
            return { ...o, ...updates };
        }));
        if (status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED) {
            const order = orders.find(o => o.id === orderId);
            const targetTableId = order?.tableId;
            if (targetTableId) {
                setTables(prev => prev.map(t => t.id === targetTableId ? { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined } : t));
            } else {
                setTables(prev => prev.map(t => t.currentOrderId === orderId ? { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined } : t));
            }
            if (status === OrderStatus.CANCELLED && order) {
                 setMenu(prevMenu => prevMenu.map(m => {
                    const orderItem = order.items.find(i => i.menuItemId === m.id);
                    if (orderItem && m.dailyStock !== -1) return { ...m, dailyStock: m.dailyStock + orderItem.quantity };
                    return m;
                 }));
            }
        }
    }
  };

  const addMenuItem = async (item: MenuItem) => {
    if (isCloudMode && db) {
        await setDoc(doc(db!, 'menu', item.id), item);
    } else {
        setMenu(prev => [...prev, item]);
    }
  };

  const toggleMenuAvailability = async (itemId: string) => {
    if (isCloudMode && db) {
        const item = menu.find(m => m.id === itemId);
        if (item) await updateDoc(doc(db!, 'menu', itemId), { isAvailable: !item.isAvailable });
    } else {
        setMenu(prev => prev.map(item => item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item));
    }
  };
  
  const updateMenuStock = async (itemId: string, quantity: number) => {
    if (isCloudMode && db) {
        await updateDoc(doc(db!, 'menu', itemId), { dailyStock: quantity });
    } else {
        setMenu(prev => prev.map(item => item.id === itemId ? { ...item, dailyStock: quantity } : item));
    }
  };

  const updateIngredientQuantity = async (itemId: string, delta: number) => {
    if (isCloudMode && db) {
        const item = inventory.find(i => i.id === itemId);
        if(item) await updateDoc(doc(db!, 'inventory', itemId), { quantity: Math.max(0, item.quantity + delta) });
    } else {
        setInventory(prev => prev.map(item => {
            if (item.id === itemId) return { ...item, quantity: Math.max(0, item.quantity + delta) };
            return item;
        }));
    }
  };

  const addIngredient = async (ingredient: Ingredient) => {
    if (isCloudMode && db) {
        await setDoc(doc(db!, 'inventory', ingredient.id), ingredient);
    } else {
        setInventory(prev => [...prev, ingredient]);
    }
  };

  const removeIngredient = async (id: string) => {
    if (isCloudMode && db) {
        await deleteDoc(doc(db!, 'inventory', id));
    } else {
        setInventory(prev => prev.filter(item => item.id !== id));
    }
  };

  const addStaff = async (user: User) => {
    if (isCloudMode && db) {
        await setDoc(doc(db!, 'staff', user.id), user);
    } else {
        setStaffList(prev => [...prev, user]);
    }
  };

  const updateStaff = async (user: User) => {
    if (isCloudMode && db) {
        await setDoc(doc(db!, 'staff', user.id), user);
    } else {
        setStaffList(prev => prev.map(u => u.id === user.id ? user : u));
    }
  };

  const terminateStaff = async (userId: string) => {
    if (!currentUser) return;
    const targetUser = staffList.find(u => u.id === userId);
    if (!targetUser) return;
    const protectedPositions = ['Admin', 'Co-CEO'];
    const lowerAdmins = ['CEO', 'Manager'];
    if (lowerAdmins.includes(currentUser.position) && protectedPositions.includes(targetUser.position)) {
        alert(`ไม่อนุญาต: ระดับ ${currentUser.position} ไม่สามารถลบบัญชีระดับ ${targetUser.position} ได้`);
        return;
    }
    if (isCloudMode && db) {
        await updateDoc(doc(db!, 'staff', userId), { isActive: false, endDate: new Date().toISOString().split('T')[0] });
    } else {
        setStaffList(prev => prev.map(u => {
            if (u.id === userId) return { ...u, isActive: false, endDate: new Date().toISOString().split('T')[0] };
            return u;
        }));
    }
  };

  const addPosition = async (position: string) => {
    if (availablePositions.includes(position)) return;
    if (isCloudMode && db) {
        await setDoc(doc(db!, 'config', 'positions'), { list: [...availablePositions, position] });
    } else {
        setAvailablePositions(prev => [...prev, position]);
    }
  };

  const removePosition = async (position: string) => {
    const newList = availablePositions.filter(p => p !== position);
    if (isCloudMode && db) {
        await setDoc(doc(db!, 'config', 'positions'), { list: newList });
    } else {
        setAvailablePositions(newList);
    }
  };

  const movePosition = async (position: string, direction: 'up' | 'down') => {
    const index = availablePositions.indexOf(position);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === availablePositions.length - 1) return;

    const newPositions = [...availablePositions];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newPositions[index], newPositions[swapIndex]] = [newPositions[swapIndex], newPositions[index]];

    if (isCloudMode && db) {
        await setDoc(doc(db!, 'config', 'positions'), { list: newPositions });
    } else {
        setAvailablePositions(newPositions);
    }
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
      resetSystem, isCloudMode
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