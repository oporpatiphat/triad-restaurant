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
  runSelfHealing: () => void; // New capability exposed
  isCloudMode: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const ENHANCED_INITIAL_MENU = INITIAL_MENU.map(item => ({
  ...item,
  dailyStock: -1 
}));

// V8: Final Stable Version with Self-Healing
const KEYS = {
  TABLES: 'TRIAD_TABLES_V8',
  ORDERS: 'TRIAD_ORDERS_V8',
  MENU: 'TRIAD_MENU_V8',
  INVENTORY: 'TRIAD_INVENTORY_V8',
  STAFF: 'TRIAD_STAFF_V8',
  POSITIONS: 'TRIAD_POSITIONS_V8',
  SESSION: 'TRIAD_SESSION_V8',
  USER: 'TRIAD_USER_V8'
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isCloudMode] = useState(isCloudEnabled && !!db);

  // --- Initial State Loaders ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(KEYS.USER);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  });

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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
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

  // --- Helpers for Direct Persistence (Synchronous Saving) ---
  const saveToStorage = (key: string, data: any) => {
    if (!isCloudMode) {
        localStorage.setItem(key, JSON.stringify(data));
    }
  };

  // --- SELF-HEALING MECHANISM (The Fix for Disappearing Tables) ---
  const runSelfHealing = () => {
      if (isCloudMode) return;
      
      console.log("Running Self-Healing System...");
      let tablesChanged = false;
      
      // 1. Get all active orders
      const activeOrders = orders.filter(o => 
          o.status !== OrderStatus.COMPLETED && 
          o.status !== OrderStatus.CANCELLED
      );

      const healedTables = tables.map(t => {
          // Find if there is an order for this table
          const activeOrderForTable = activeOrders.find(o => o.tableId === t.id);

          if (activeOrderForTable) {
             // Case A: Order exists, but Table thinks it is AVAILABLE or has wrong Order ID
             if (t.status === TableStatus.AVAILABLE || t.currentOrderId !== activeOrderForTable.id) {
                 tablesChanged = true;
                 console.log(`Healing Table ${t.id}: Forced to OCCUPIED by Order ${activeOrderForTable.id}`);
                 return {
                     ...t,
                     status: TableStatus.OCCUPIED,
                     currentOrderId: activeOrderForTable.id
                 };
             }
          } else {
             // Case B: Table thinks it is OCCUPIED, but no Active Order exists
             if (t.status !== TableStatus.AVAILABLE && t.currentOrderId) {
                 // Check if that order ID actually exists in our orders list
                 const orderExists = orders.find(o => o.id === t.currentOrderId);
                 
                 // If order doesn't exist OR it is completed/cancelled
                 if (!orderExists || orderExists.status === OrderStatus.COMPLETED || orderExists.status === OrderStatus.CANCELLED) {
                     tablesChanged = true;
                     console.log(`Healing Table ${t.id}: Forced to AVAILABLE (Ghost Order Removed)`);
                     return {
                         ...t,
                         status: TableStatus.AVAILABLE,
                         currentOrderId: undefined
                     };
                 }
             }
          }
          return t;
      });

      if (tablesChanged) {
          setTables(healedTables);
          saveToStorage(KEYS.TABLES, healedTables);
          console.log("Self-Healing Complete: Tables synchronized.");
      } else {
          console.log("System Healthy: No issues found.");
      }
  };

  // Run Healing once on mount (Initial Load)
  useEffect(() => {
      runSelfHealing();
  }, []); // Run once on mount

  // --- CLOUD LISTENERS ---
  useEffect(() => {
    if (!isCloudMode || !db) return;
    // ... (Cloud Listeners unchanged) ...
    const processDoc = (docSnap: any) => {
        const data = docSnap.data();
        Object.keys(data).forEach(key => {
            if (data[key] instanceof Timestamp) {
                data[key] = data[key].toDate();
            }
        });
        return { id: docSnap.id, ...data };
    };
    const unsubSession = onSnapshot(doc(db!, 'config', 'session'), (doc) => {
        if (doc.exists()) setStoreSession(processDoc(doc) as StoreSession);
    });
    const unsubTables = onSnapshot(collection(db!, 'tables'), (snap) => {
        const data = snap.docs.map(processDoc) as Table[];
        if (data.length > 0) setTables(data.sort((a,b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1))));
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
        if (doc.exists()) setAvailablePositions(doc.data().list);
    });

    return () => {
        unsubSession(); unsubTables(); unsubOrders(); unsubMenu(); unsubInventory(); unsubStaff(); unsubPositions();
    };
  }, [isCloudMode]);


  // --- Actions ---

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
    if (username === 'sumalin' && password === '9753127') {
      const existingAdmin = staffList.find(u => u.username === 'sumalin');
      const user = existingAdmin || {
          id: 'u_master_admin',
          username: 'sumalin',
          name: 'คุณสุมลิน (Master)',
          role: Role.OWNER,
          position: 'Co-CEO',
          staffClass: 'Elite',
          startDate: new Date().toISOString(),
          isActive: true
      };
      setCurrentUser(user);
      saveToStorage(KEYS.USER, user);
      return true;
    }
    const user = staffList.find(u => u.username === username && u.password === password);
    if (user) {
      if (!user.isActive) {
        alert("บัญชีนี้ถูกระงับการใช้งานแล้ว");
        return false;
      }
      setCurrentUser(user);
      saveToStorage(KEYS.USER, user);
      return true;
    }
    return false;
  };

  const logout = () => {
      setCurrentUser(null);
      localStorage.removeItem(KEYS.USER);
  };

  const openStore = async (dailyMenuUpdates: MenuItem[]) => {
    if (isCloudMode && db) {
       const batch = writeBatch(db!);
       batch.set(doc(db!, 'config', 'session'), { isOpen: true, openedAt: new Date() });
       dailyMenuUpdates.forEach(m => {
          batch.update(doc(db!, 'menu', m.id), { dailyStock: m.dailyStock, isAvailable: m.isAvailable });
       });
       await batch.commit();
    } else {
       const newSession = { isOpen: true, openedAt: new Date() };
       setMenu(dailyMenuUpdates);
       setStoreSession(newSession);
       saveToStorage(KEYS.MENU, dailyMenuUpdates);
       saveToStorage(KEYS.SESSION, newSession);
    }
  };

  const closeStore = async () => {
    if (isCloudMode && db) {
        await updateDoc(doc(db!, 'config', 'session'), { isOpen: false, closedAt: new Date() });
    } else {
        const newSession = { ...storeSession, isOpen: false, closedAt: new Date() };
        setStoreSession(newSession);
        saveToStorage(KEYS.SESSION, newSession);
    }
  };

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    if (isCloudMode && db) {
        await updateDoc(doc(db!, 'tables', tableId), { status });
    } else {
        const newTables = tables.map(t => t.id === tableId ? { ...t, status } : t);
        setTables(newTables);
        saveToStorage(KEYS.TABLES, newTables);
    }
  };

  const createOrder = async (tableId: string, customerName: string, customerClass: CustomerClass, items: OrderItem[]) => {
    // 1. Inventory Check
    for (const item of items) {
      const menuItem = menu.find(m => m.id === item.menuItemId);
      if (menuItem && menuItem.dailyStock !== -1 && menuItem.dailyStock < item.quantity) {
        alert(`ขออภัย เมนู ${menuItem.name} เหลือเพียง ${menuItem.dailyStock} ที่`);
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
        alert(`วัตถุดิบ "${ingName}" ไม่เพียงพอ`);
        return;
      }
    }

    // 2. Prepare Data
    const newOrder: Order = {
        id: `ord-${Date.now()}-${Math.floor(Math.random()*1000)}`,
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
        // --- LOCAL MODE: ATOMIC & DIRECT SAVE ---
        const newOrders = [...orders, newOrder];
        
        const newTables = tables.map(t => 
             t.id === tableId 
             ? { ...t, status: TableStatus.OCCUPIED, currentOrderId: newOrder.id } 
             : t
        );

        const newMenu = menu.map(m => {
            const orderItem = items.find(i => i.menuItemId === m.id);
            if (orderItem && m.dailyStock !== -1) {
                return { ...m, dailyStock: Math.max(0, m.dailyStock - orderItem.quantity) };
            }
            return m;
        });

        const newInventory = inventory.map(ing => {
            const requiredQty = requiredIngredients.get(ing.name);
            if (requiredQty) {
                return { ...ing, quantity: Math.max(0, ing.quantity - requiredQty) };
            }
            return ing;
        });

        // Commit state
        setOrders(newOrders);
        setTables(newTables);
        setMenu(newMenu);
        setInventory(newInventory);

        // Commit storage
        saveToStorage(KEYS.ORDERS, newOrders);
        saveToStorage(KEYS.TABLES, newTables);
        saveToStorage(KEYS.MENU, newMenu);
        saveToStorage(KEYS.INVENTORY, newInventory);
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
            if (order) {
                batch.update(doc(db!, 'tables', order.tableId), { status: TableStatus.AVAILABLE, currentOrderId: null });
            } 
            if (status === OrderStatus.CANCELLED && order) {
                 order.items.forEach(item => {
                    const m = menu.find(x => x.id === item.menuItemId);
                    if(m && m.dailyStock !== -1) {
                        batch.update(doc(db!, 'menu', m.id), { dailyStock: m.dailyStock + item.quantity });
                    }
                 });
            }
        }
        await batch.commit();
    } else {
        // --- LOCAL MODE: DIRECT SAVE ---
        const newOrders = orders.map(o => {
            if (o.id !== orderId) return o;
            return { ...o, ...updates };
        });
        setOrders(newOrders);
        saveToStorage(KEYS.ORDERS, newOrders);
        
        if (status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED) {
             const newTables = tables.map(t => 
                t.currentOrderId === orderId 
                ? { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined } 
                : t
             );
             setTables(newTables);
             saveToStorage(KEYS.TABLES, newTables);
        }
        
        if (status === OrderStatus.CANCELLED) {
             const order = orders.find(o => o.id === orderId);
             if (order) {
                 const newMenu = menu.map(m => {
                    const orderItem = order.items.find(i => i.menuItemId === m.id);
                    if (orderItem && m.dailyStock !== -1) return { ...m, dailyStock: m.dailyStock + orderItem.quantity };
                    return m;
                 });
                 setMenu(newMenu);
                 saveToStorage(KEYS.MENU, newMenu);
             }
        }
    }
  };

  // ... (Other CRUD functions) ...
  const addMenuItem = async (item: MenuItem) => {
    if (isCloudMode && db) await setDoc(doc(db!, 'menu', item.id), item);
    else {
        const newData = [...menu, item];
        setMenu(newData);
        saveToStorage(KEYS.MENU, newData);
    }
  };
  const toggleMenuAvailability = async (itemId: string) => {
    if (isCloudMode && db) {
        const item = menu.find(m => m.id === itemId);
        if (item) await updateDoc(doc(db!, 'menu', itemId), { isAvailable: !item.isAvailable });
    } else {
        const newData = menu.map(item => item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item);
        setMenu(newData);
        saveToStorage(KEYS.MENU, newData);
    }
  };
  const updateMenuStock = async (itemId: string, quantity: number) => {
    if (isCloudMode && db) await updateDoc(doc(db!, 'menu', itemId), { dailyStock: quantity });
    else {
        const newData = menu.map(item => item.id === itemId ? { ...item, dailyStock: quantity } : item);
        setMenu(newData);
        saveToStorage(KEYS.MENU, newData);
    }
  };
  const updateIngredientQuantity = async (itemId: string, delta: number) => {
    if (isCloudMode && db) {
        const item = inventory.find(i => i.id === itemId);
        if(item) await updateDoc(doc(db!, 'inventory', itemId), { quantity: Math.max(0, item.quantity + delta) });
    } else {
        const newData = inventory.map(item => item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item);
        setInventory(newData);
        saveToStorage(KEYS.INVENTORY, newData);
    }
  };
  const addIngredient = async (ingredient: Ingredient) => {
    if (isCloudMode && db) await setDoc(doc(db!, 'inventory', ingredient.id), ingredient);
    else {
        const newData = [...inventory, ingredient];
        setInventory(newData);
        saveToStorage(KEYS.INVENTORY, newData);
    }
  };
  const removeIngredient = async (id: string) => {
    if (isCloudMode && db) await deleteDoc(doc(db!, 'inventory', id));
    else {
        const newData = inventory.filter(item => item.id !== id);
        setInventory(newData);
        saveToStorage(KEYS.INVENTORY, newData);
    }
  };
  const addStaff = async (user: User) => {
    if (isCloudMode && db) await setDoc(doc(db!, 'staff', user.id), user);
    else {
        const newData = [...staffList, user];
        setStaffList(newData);
        saveToStorage(KEYS.STAFF, newData);
    }
  };
  const updateStaff = async (user: User) => {
    if (isCloudMode && db) await setDoc(doc(db!, 'staff', user.id), user);
    else {
        const newData = staffList.map(u => u.id === user.id ? user : u);
        setStaffList(newData);
        saveToStorage(KEYS.STAFF, newData);
    }
  };
  const terminateStaff = async (userId: string) => {
    if (!currentUser) return;
    if (isCloudMode && db) await updateDoc(doc(db!, 'staff', userId), { isActive: false, endDate: new Date().toISOString().split('T')[0] });
    else {
        const newData = staffList.map(u => u.id === userId ? { ...u, isActive: false, endDate: new Date().toISOString().split('T')[0] } : u);
        setStaffList(newData);
        saveToStorage(KEYS.STAFF, newData);
    }
  };
  const addPosition = async (position: string) => {
    if (isCloudMode && db) await setDoc(doc(db!, 'config', 'positions'), { list: [...availablePositions, position] });
    else {
        const newData = [...availablePositions, position];
        setAvailablePositions(newData);
        saveToStorage(KEYS.POSITIONS, newData);
    }
  };
  const removePosition = async (position: string) => {
    const newList = availablePositions.filter(p => p !== position);
    if (isCloudMode && db) await setDoc(doc(db!, 'config', 'positions'), { list: newList });
    else {
        setAvailablePositions(newList);
        saveToStorage(KEYS.POSITIONS, newList);
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
    if (isCloudMode && db) await setDoc(doc(db!, 'config', 'positions'), { list: newPositions });
    else {
        setAvailablePositions(newPositions);
        saveToStorage(KEYS.POSITIONS, newPositions);
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
      resetSystem, runSelfHealing, isCloudMode
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