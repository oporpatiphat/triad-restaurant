

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Table, Order, MenuItem, Ingredient, TableStatus, OrderStatus, CustomerClass, StoreSession, OrderItem, Role, SessionRecord } from '../types';
import { generateTables, INITIAL_INGREDIENTS, INITIAL_MENU, MOCK_USERS, INITIAL_POSITIONS } from '../constants';
import { db, isCloudEnabled } from './firebaseConfig';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch, runTransaction, Timestamp, query, orderBy, getDocs, getDoc } from 'firebase/firestore';

interface StoreContextType {
  currentUser: User | null;
  login: (username: string, password?: string) => boolean;
  logout: () => void;
  storeSession: StoreSession;
  sessionHistory: SessionRecord[];
  openStore: (dailyMenuUpdates: MenuItem[], openerName: string) => void;
  closeStore: (closerName: string) => void;
  tables: Table[];
  updateTableStatus: (tableId: string, status: TableStatus) => void;
  orders: Order[];
  createOrder: (tableId: string, customerName: string, customerClass: CustomerClass, items: OrderItem[], boxCount: number, bagCount: number) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: OrderStatus, actorName?: string, paymentMethod?: 'CASH' | 'CARD') => void;
  toggleItemCookedStatus: (orderId: string, itemIndex: number) => void; // New
  cancelOrder: (orderId: string, reason?: string) => void; // New
  deleteOrder: (orderId: string) => void; 
  menu: MenuItem[];
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (item: MenuItem) => void; // Added
  deleteMenuItem: (itemId: string) => void;
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
  deleteStaff: (userId: string) => void;
  availablePositions: string[];
  addPosition: (position: string) => void;
  removePosition: (position: string) => void;
  movePosition: (position: string, direction: 'up' | 'down') => void;
  resetSystem: () => void;
  runSelfHealing: () => void;
  isCloudMode: boolean;
  initializeCloudData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const ENHANCED_INITIAL_MENU = INITIAL_MENU.map(item => ({
  ...item,
  dailyStock: -1 
}));

const KEYS = {
  TABLES: 'TRIAD_TABLES_V8',
  ORDERS: 'TRIAD_ORDERS_V8',
  MENU: 'TRIAD_MENU_V8',
  INVENTORY: 'TRIAD_INVENTORY_V8',
  STAFF: 'TRIAD_STAFF_V8',
  POSITIONS: 'TRIAD_POSITIONS_V8',
  SESSION: 'TRIAD_SESSION_V8',
  SESSIONS_HISTORY: 'TRIAD_SESSIONS_HISTORY_V1',
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

  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>(() => {
    if (isCloudMode) return [];
    try {
      const saved = localStorage.getItem(KEYS.SESSIONS_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({
            ...s,
            openedAt: new Date(s.openedAt),
            closedAt: s.closedAt ? new Date(s.closedAt) : undefined
        }));
      }
    } catch(e) {}
    return [];
  });

  const [tables, setTables] = useState<Table[]>(() => {
    if (isCloudMode) return []; 
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
    if (isCloudMode) return [];
    try {
      const saved = localStorage.getItem(KEYS.MENU);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return ENHANCED_INITIAL_MENU;
  });

  const [inventory, setInventory] = useState<Ingredient[]>(() => {
    if (isCloudMode) return [];
    try {
      const saved = localStorage.getItem(KEYS.INVENTORY);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return INITIAL_INGREDIENTS;
  });
  
  const [staffList, setStaffList] = useState<User[]>(() => {
    if (isCloudMode) return [];
    try {
      const saved = localStorage.getItem(KEYS.STAFF);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return MOCK_USERS;
  });

  const [availablePositions, setAvailablePositions] = useState<string[]>(() => {
    if (isCloudMode) return [];
    try {
      const saved = localStorage.getItem(KEYS.POSITIONS);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return INITIAL_POSITIONS;
  });

  const saveToStorage = (key: string, data: any) => {
    if (!isCloudMode) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error("LocalStorage Error (Quota Exceeded?):", e);
        }
    }
  };

  // --- CLOUD INITIALIZATION ---
  const initializeCloudData = async () => {
      if (!isCloudMode || !db) return;
      try {
          const batch = writeBatch(db!);
          let hasUpdates = false;

          const tablesSnap = await getDocs(collection(db!, 'tables'));
          if (tablesSnap.empty) {
              generateTables().forEach(t => batch.set(doc(db!, 'tables', t.id), t));
              hasUpdates = true;
          }
          const menuSnap = await getDocs(collection(db!, 'menu'));
          if (menuSnap.empty) {
              ENHANCED_INITIAL_MENU.forEach(m => batch.set(doc(db!, 'menu', m.id), m));
              hasUpdates = true;
          }
          const invSnap = await getDocs(collection(db!, 'inventory'));
          if (invSnap.empty) {
              INITIAL_INGREDIENTS.forEach(i => batch.set(doc(db!, 'inventory', i.id), i));
              hasUpdates = true;
          }
          const staffSnap = await getDocs(collection(db!, 'staff'));
          if (staffSnap.empty) {
              MOCK_USERS.forEach(u => batch.set(doc(db!, 'staff', u.id), u));
              hasUpdates = true;
          }
          const positionsRef = doc(db!, 'config', 'positions');
          const positionsDoc = await getDoc(positionsRef);
          if (!positionsDoc.exists()) {
              batch.set(positionsRef, { list: INITIAL_POSITIONS });
              hasUpdates = true;
          }

          if (hasUpdates) {
              await batch.commit();
              alert("ระบบ Cloud ได้เตรียมฐานข้อมูลเริ่มต้นเรียบร้อยแล้ว");
          }
      } catch (error) {
          alert("ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (Permission Error หรือ Config ผิดพลาด)");
      }
  };

  const runSelfHealing = () => {
      if (isCloudMode) {
          alert("ในโหมด Cloud ระบบจะซิงค์ข้อมูลอัตโนมัติ หากข้อมูลไม่ตรงกัน กรุณารีเฟรชหน้าจอ");
          return;
      }
  };

  // --- CLOUD LISTENERS ---
  useEffect(() => {
    if (!isCloudMode || !db) return;
    initializeCloudData();

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
    const unsubHistory = onSnapshot(query(collection(db!, 'sessions'), orderBy('openedAt', 'desc')), (snap) => {
        setSessionHistory(snap.docs.map(processDoc) as SessionRecord[]);
    });
    const unsubTables = onSnapshot(collection(db!, 'tables'), (snap) => {
        const data = snap.docs.map(processDoc) as Table[];
        const sorted = data.sort((a,b) => {
            const numA = parseInt(a.number.replace(/\D/g,'')) || 0;
            const numB = parseInt(b.number.replace(/\D/g,'')) || 0;
            return numA - numB;
        });
        setTables(sorted);
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
        unsubSession(); unsubHistory(); unsubTables(); unsubOrders(); unsubMenu(); unsubInventory(); unsubStaff(); unsubPositions();
    };
  }, [isCloudMode]);

  // --- ACTIONS ---

  const resetSystem = () => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลทั้งหมด?")) {
      if (isCloudMode && db) {
         alert("ระบบ Cloud ไม่อนุญาตให้รีเซ็ตทั้งหมดจากหน้าบ้านเพื่อความปลอดภัย");
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

  const openStore = async (dailyMenuUpdates: MenuItem[], openerName: string) => {
    const newSessionRecord: SessionRecord = {
        id: `sess-${Date.now()}`,
        openedAt: new Date(),
        openedBy: openerName,
        totalSales: 0,
        orderCount: 0
    };

    if (isCloudMode && db) {
       const batch = writeBatch(db!);
       batch.set(doc(db!, 'config', 'session'), { isOpen: true, openedAt: new Date() });
       batch.set(doc(db!, 'sessions', newSessionRecord.id), newSessionRecord);
       
       dailyMenuUpdates.forEach(m => {
          batch.update(doc(db!, 'menu', m.id), { dailyStock: m.dailyStock, isAvailable: m.isAvailable });
       });
       await batch.commit();
    } else {
       const newSession = { isOpen: true, openedAt: new Date() };
       setMenu(dailyMenuUpdates);
       setStoreSession(newSession);
       
       setSessionHistory(prev => {
          const next = [newSessionRecord, ...prev];
          saveToStorage(KEYS.SESSIONS_HISTORY, next);
          return next;
       });

       saveToStorage(KEYS.MENU, dailyMenuUpdates);
       saveToStorage(KEYS.SESSION, newSession);
    }
  };

  const closeStore = async (closerName: string) => {
    const currentOrders = orders.filter(o => o.timestamp >= storeSession.openedAt);
    const totalSales = currentOrders
        .filter(o => o.status === OrderStatus.COMPLETED)
        .reduce((sum, o) => sum + o.totalAmount, 0);
    const orderCount = currentOrders.length;

    if (isCloudMode && db) {
        const batch = writeBatch(db!);
        batch.update(doc(db!, 'config', 'session'), { isOpen: false, closedAt: new Date() });
        
        const q = query(collection(db, 'sessions'), orderBy('openedAt', 'desc'));
        const snap = await getDocs(q);
        const latestSession = snap.docs[0];

        if (latestSession && !latestSession.data().closedAt) {
            batch.update(latestSession.ref, {
                closedAt: new Date(),
                closedBy: closerName,
                totalSales,
                orderCount
            });
        }
        await batch.commit();
    } else {
        const newSession = { ...storeSession, isOpen: false, closedAt: new Date() };
        setStoreSession(newSession);
        
        setSessionHistory(prev => {
            if (prev.length > 0 && !prev[0].closedAt) {
                const updatedLatest = {
                    ...prev[0],
                    closedAt: new Date(),
                    closedBy: closerName,
                    totalSales,
                    orderCount
                };
                const next = [updatedLatest, ...prev.slice(1)];
                saveToStorage(KEYS.SESSIONS_HISTORY, next);
                return next;
            }
            return prev;
        });

        saveToStorage(KEYS.SESSION, newSession);
    }
  };

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    if (isCloudMode && db) {
        await updateDoc(doc(db!, 'tables', tableId), { status });
    } else {
        setTables(prev => {
           const next = prev.map(t => t.id === tableId ? { ...t, status } : t);
           saveToStorage(KEYS.TABLES, next);
           return next;
        });
    }
  };

  const createOrder = async (tableId: string, customerName: string, customerClass: CustomerClass, items: OrderItem[], boxCount: number, bagCount: number): Promise<boolean> => {
    try {
        const boxFee = (boxCount || 0) * 100;
        const totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0) + boxFee;

        if (isCloudMode && db) {
            await runTransaction(db, async (transaction) => {
                const tableRef = doc(db!, 'tables', tableId);
                const tableDoc = await transaction.get(tableRef);
                if (!tableDoc.exists()) throw "Table does not exist!";
                
                const menuRefs = items.map(item => doc(db!, 'menu', item.menuItemId));
                const menuDocs = await Promise.all(menuRefs.map(ref => transaction.get(ref)));

                const requiredIngredientIds = new Set<string>();
                const ingredientUsage = new Map<string, number>();

                menuDocs.forEach((mDoc, idx) => {
                    const mData = mDoc.data() as MenuItem;
                    const orderQty = items[idx].quantity;
                    if (mData.dailyStock !== -1 && mData.dailyStock < orderQty) {
                        throw `เมนู "${mData.name}" หมดแล้ว หรือไม่พอ (เหลือ ${mData.dailyStock})`;
                    }
                    mData.ingredients.forEach(ingName => {
                        const ingObj = inventory.find(i => i.name === ingName);
                        if (ingObj) {
                            requiredIngredientIds.add(ingObj.id);
                            const currentNeed = ingredientUsage.get(ingObj.id) || 0;
                            ingredientUsage.set(ingObj.id, currentNeed + orderQty);
                        }
                    });
                });

                const ingRefs = Array.from(requiredIngredientIds).map(id => doc(db!, 'inventory', id));
                const ingDocs = await Promise.all(ingRefs.map(ref => transaction.get(ref)));

                ingDocs.forEach(iDoc => {
                    const iData = iDoc.data() as Ingredient;
                    const needed = ingredientUsage.get(iData.id) || 0;
                    if (iData.quantity < needed) {
                        throw `วัตถุดิบ "${iData.name}" ไม่พอ (ขาด ${needed - iData.quantity})`;
                    }
                });

                const newOrder: Order = {
                    id: `ord-${Date.now()}`,
                    tableId,
                    customerName,
                    customerClass,
                    items: items,
                    status: OrderStatus.PENDING,
                    totalAmount,
                    timestamp: new Date(),
                    boxCount: boxCount,
                    bagCount: bagCount
                };

                transaction.set(doc(db!, 'orders', newOrder.id), newOrder);
                transaction.update(tableRef, { status: TableStatus.OCCUPIED, currentOrderId: newOrder.id });

                menuDocs.forEach((mDoc, idx) => {
                    const mData = mDoc.data() as MenuItem;
                    const orderQty = items[idx].quantity;
                    if (mData.dailyStock !== -1) {
                        transaction.update(mDoc.ref, { dailyStock: mData.dailyStock - orderQty });
                    }
                });

                ingDocs.forEach(iDoc => {
                    const iData = iDoc.data() as Ingredient;
                    const needed = ingredientUsage.get(iData.id) || 0;
                    transaction.update(iDoc.ref, { quantity: iData.quantity - needed });
                });
            });
            console.log("Transaction successfully committed!");
            return true;
        } else {
            const requiredIngredients = new Map<string, number>();
            for (const item of items) {
                const menuItem = menu.find(m => m.id === item.menuItemId);
                if (menuItem && menuItem.dailyStock !== -1 && menuItem.dailyStock < item.quantity) {
                    alert(`ขออภัย เมนู ${menuItem.name} เหลือเพียง ${menuItem.dailyStock} ที่`);
                    return false;
                }
                if (menuItem && menuItem.ingredients) {
                    menuItem.ingredients.forEach(ingName => {
                        const current = requiredIngredients.get(ingName) || 0;
                        requiredIngredients.set(ingName, current + item.quantity);
                    });
                }
            }

            for (const [ingName, requiredQty] of requiredIngredients.entries()) {
                const stockItem = inventory.find(i => i.name === ingName);
                if (!stockItem || stockItem.quantity < requiredQty) {
                    alert(`วัตถุดิบ "${ingName}" ไม่เพียงพอ (ต้องการ ${requiredQty} แต่มี ${stockItem?.quantity || 0})`);
                    return false;
                }
            }

            const newOrder: Order = {
                id: `ord-${Date.now()}`,
                tableId,
                customerName,
                customerClass,
                items: items,
                status: OrderStatus.PENDING,
                totalAmount,
                timestamp: new Date(),
                boxCount: boxCount,
                bagCount: bagCount
            };

            let updatedOrders: Order[] = [];
            setOrders(prev => {
                const next = [...prev, newOrder];
                updatedOrders = next;
                return next;
            });
            setTables(prev => {
                const next = prev.map(t => t.id === tableId ? { ...t, status: TableStatus.OCCUPIED, currentOrderId: newOrder.id } : t);
                saveToStorage(KEYS.TABLES, next);
                return next;
            });
            setMenu(prev => {
                const next = prev.map(m => {
                    const orderItem = items.find(i => i.menuItemId === m.id);
                    if (orderItem && m.dailyStock !== -1) {
                        return { ...m, dailyStock: Math.max(0, m.dailyStock - orderItem.quantity) };
                    }
                    return m;
                });
                saveToStorage(KEYS.MENU, next);
                return next;
            });
            setInventory(prev => {
                const next = prev.map(ing => {
                    const requiredQty = requiredIngredients.get(ing.name);
                    if (requiredQty) {
                        return { ...ing, quantity: Math.max(0, ing.quantity - requiredQty) };
                    }
                    return ing;
                });
                saveToStorage(KEYS.INVENTORY, next);
                return next;
            });
            saveToStorage(KEYS.ORDERS, updatedOrders);
            return true;
        }
    } catch (error: any) {
        console.error("Order Transaction Failed:", error);
        alert(`เกิดข้อผิดพลาด: ${error}`);
        return false;
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
        }
        await batch.commit();
    } else {
        setOrders(prev => {
            const next = prev.map(o => o.id === orderId ? { ...o, ...updates } : o);
            saveToStorage(KEYS.ORDERS, next);
            return next;
        });
        
        if (status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED) {
             setTables(prev => {
                const order = orders.find(o => o.id === orderId);
                if (order) {
                    const next = prev.map(t => t.id === order.tableId ? { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined } : t);
                    saveToStorage(KEYS.TABLES, next);
                    return next;
                }
                return prev;
             });
        }
    }
  };

  const toggleItemCookedStatus = async (orderId: string, itemIndex: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const newItems = [...order.items];
    const item = newItems[itemIndex];
    if (item) {
        item.isCooked = !item.isCooked;
    }

    if (isCloudMode && db) {
        await updateDoc(doc(db!, 'orders', orderId), { items: newItems });
    } else {
        setOrders(prev => {
            const next = prev.map(o => o.id === orderId ? { ...o, items: newItems } : o);
            saveToStorage(KEYS.ORDERS, next);
            return next;
        });
    }
  };

  // Cancel order logic - WITH RESTOCKING
  const cancelOrder = async (orderId: string) => {
      // 1. Find the order
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      if (isCloudMode && db) {
          try {
              await runTransaction(db, async (transaction) => {
                  const orderRef = doc(db!, 'orders', orderId);
                  const orderDoc = await transaction.get(orderRef);
                  if (!orderDoc.exists()) throw "Order not found";
                  const orderData = orderDoc.data() as Order;
                  const tableRef = doc(db!, 'tables', orderData.tableId);

                  const menuUpdates = new Map<string, number>(); 
                  const ingredientUpdates = new Map<string, number>(); 

                  // Calculate refunds
                  for (const item of orderData.items) {
                      menuUpdates.set(item.menuItemId, (menuUpdates.get(item.menuItemId) || 0) + item.quantity);
                      
                      // Using local menu state for mapping (assuming sync)
                      const menuItem = menu.find(m => m.id === item.menuItemId);
                      if (menuItem) {
                           menuItem.ingredients.forEach(ingName => {
                               ingredientUpdates.set(ingName, (ingredientUpdates.get(ingName) || 0) + item.quantity);
                           });
                      }
                  }

                  // Restore Menu Stock
                  for (const [mId, qty] of menuUpdates) {
                       const mRef = doc(db!, 'menu', mId);
                       const mDoc = await transaction.get(mRef);
                       if (mDoc.exists()) {
                           const mData = mDoc.data() as MenuItem;
                           if (mData.dailyStock !== -1) {
                               transaction.update(mRef, { dailyStock: mData.dailyStock + qty, isAvailable: true });
                           }
                       }
                  }

                  // Restore Inventory
                  for (const [ingName, qty] of ingredientUpdates) {
                      const ingObj = inventory.find(i => i.name === ingName);
                      if (ingObj) {
                          const iRef = doc(db!, 'inventory', ingObj.id);
                          const iDoc = await transaction.get(iRef);
                          if (iDoc.exists()) {
                              const iData = iDoc.data() as Ingredient;
                              transaction.update(iRef, { quantity: iData.quantity + qty });
                          }
                      }
                  }

                  // Cancel Order & Free Table
                  transaction.update(orderRef, { status: OrderStatus.CANCELLED });
                  transaction.update(tableRef, { status: TableStatus.AVAILABLE, currentOrderId: null });
              });
          } catch (e) {
              console.error("Cancel Transaction failed", e);
              alert("เกิดข้อผิดพลาดในการยกเลิก: " + e);
          }
      } else {
          // --- LOCAL MODE ---
          // 1. Restore Inventory
          const ingredientsToRestore = new Map<string, number>();
          order.items.forEach(item => {
              const menuItem = menu.find(m => m.id === item.menuItemId);
              if (menuItem) {
                  menuItem.ingredients.forEach(ingName => {
                      ingredientsToRestore.set(ingName, (ingredientsToRestore.get(ingName) || 0) + item.quantity);
                  });
              }
          });

          setInventory(prev => {
              const next = prev.map(ing => {
                  const qtyToAdd = ingredientsToRestore.get(ing.name);
                  if (qtyToAdd) {
                      return { ...ing, quantity: ing.quantity + qtyToAdd };
                  }
                  return ing;
              });
              saveToStorage(KEYS.INVENTORY, next);
              return next;
          });

          // 2. Restore Menu Stock
          setMenu(prev => {
              const next = prev.map(m => {
                  const orderItem = order.items.find(i => i.menuItemId === m.id);
                  if (orderItem && m.dailyStock !== -1) {
                      return {
                          ...m,
                          dailyStock: m.dailyStock + orderItem.quantity,
                          isAvailable: true 
                      };
                  }
                  return m;
              });
              saveToStorage(KEYS.MENU, next);
              return next;
          });

          // 3. Update Status
          await updateOrderStatus(orderId, OrderStatus.CANCELLED);
      }
  };

  const deleteOrder = async (orderId: string) => {
    if (isCloudMode && db) {
        await deleteDoc(doc(db!, 'orders', orderId));
    } else {
        setOrders(prev => {
            const next = prev.filter(o => o.id !== orderId);
            saveToStorage(KEYS.ORDERS, next);
            return next;
        });
    }
  };

  const updateIngredientQuantity = async (itemId: string, delta: number) => {
    const ingName = inventory.find(i => i.id === itemId)?.name;
    const newQuantity = Math.max(0, (inventory.find(i => i.id === itemId)?.quantity || 0) + delta);

    if (isCloudMode && db) {
        const batch = writeBatch(db!);
        batch.update(doc(db!, 'inventory', itemId), { quantity: newQuantity });
        if (delta > 0 && ingName) {
            const affectedMenus = menu.filter(m => m.ingredients.includes(ingName) && m.dailyStock !== -1);
            const tempInventory = inventory.map(i => i.id === itemId ? { ...i, quantity: newQuantity } : i);

            affectedMenus.forEach(m => {
                let maxPossible = 9999;
                m.ingredients.forEach(iName => {
                   const iObj = tempInventory.find(i => i.name === iName);
                   if (iObj) {
                       if (iObj.quantity < maxPossible) maxPossible = iObj.quantity;
                   } else {
                       maxPossible = 0;
                   }
                });
                
                if (maxPossible > m.dailyStock) {
                    batch.update(doc(db!, 'menu', m.id), { dailyStock: maxPossible, isAvailable: maxPossible > 0 });
                }
            });
        }
        await batch.commit();
    } else {
        const updatedInventory = inventory.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item);
        setInventory(updatedInventory);
        saveToStorage(KEYS.INVENTORY, updatedInventory);

        if (delta > 0 && ingName) {
            setMenu(prev => {
                const next = prev.map(m => {
                    if (m.ingredients.includes(ingName) && m.dailyStock !== -1) {
                         let maxPossible = 9999;
                         m.ingredients.forEach(iName => {
                             const iObj = updatedInventory.find(i => i.name === iName);
                             if (iObj) {
                                 if (iObj.quantity < maxPossible) maxPossible = iObj.quantity;
                             } else {
                                 maxPossible = 0;
                             }
                         });
                         if (maxPossible > m.dailyStock) {
                             return { ...m, dailyStock: maxPossible, isAvailable: maxPossible > 0 };
                         }
                    }
                    return m;
                });
                saveToStorage(KEYS.MENU, next);
                return next;
            });
        }
    }
  };

  const addMenuItem = async (item: MenuItem) => {
    if (isCloudMode && db) await setDoc(doc(db!, 'menu', item.id), item);
    else {
        setMenu(prev => {
            const next = [...prev, item];
            saveToStorage(KEYS.MENU, next);
            return next;
        });
    }
  };

  const updateMenuItem = async (item: MenuItem) => {
    if (isCloudMode && db) await setDoc(doc(db!, 'menu', item.id), item);
    else {
        setMenu(prev => {
            const next = prev.map(m => m.id === item.id ? item : m);
            saveToStorage(KEYS.MENU, next);
            return next;
        });
    }
  };
  
  const deleteMenuItem = async (itemId: string) => {
    if (isCloudMode && db) {
        await deleteDoc(doc(db!, 'menu', itemId));
    } else {
        setMenu(prev => {
            const next = prev.filter(item => item.id !== itemId);
            saveToStorage(KEYS.MENU, next);
            return next;
        });
    }
  };

  const toggleMenuAvailability = async (itemId: string) => {
    if (isCloudMode && db) {
        const item = menu.find(m => m.id === itemId);
        if (item) await updateDoc(doc(db!, 'menu', itemId), { isAvailable: !item.isAvailable });
    } else {
        setMenu(prev => {
            const next = prev.map(item => item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item);
            saveToStorage(KEYS.MENU, next);
            return next;
        });
    }
  };
  const updateMenuStock = async (itemId: string, quantity: number) => {
    if (isCloudMode && db) await updateDoc(doc(db!, 'menu', itemId), { dailyStock: quantity });
    else {
        setMenu(prev => {
            const next = prev.map(item => item.id === itemId ? { ...item, dailyStock: quantity } : item);
            saveToStorage(KEYS.MENU, next);
            return next;
        });
    }
  };

  const addIngredient = async (ingredient: Ingredient) => {
    if (isCloudMode && db) await setDoc(doc(db!, 'inventory', ingredient.id), ingredient);
    else {
        setInventory(prev => {
            const next = [...prev, ingredient];
            saveToStorage(KEYS.INVENTORY, next);
            return next;
        });
    }
  };
  const removeIngredient = async (id: string) => {
    if (isCloudMode && db) await deleteDoc(doc(db!, 'inventory', id));
    else {
        setInventory(prev => {
            const next = prev.filter(item => item.id !== id);
            saveToStorage(KEYS.INVENTORY, next);
            return next;
        });
    }
  };
  const addStaff = async (user: User) => {
    if (isCloudMode && db) await setDoc(doc(db!, 'staff', user.id), user);
    else {
        setStaffList(prev => {
            const next = [...prev, user];
            saveToStorage(KEYS.STAFF, next);
            return next;
        });
    }
  };
  const updateStaff = async (user: User) => {
    if (isCloudMode && db) await setDoc(doc(db!, 'staff', user.id), user);
    else {
        setStaffList(prev => {
            const next = prev.map(u => u.id === user.id ? user : u);
            saveToStorage(KEYS.STAFF, next);
            return next;
        });
    }
  };
  const terminateStaff = async (userId: string) => {
    if (!currentUser) return;
    if (isCloudMode && db) await updateDoc(doc(db!, 'staff', userId), { isActive: false, endDate: new Date().toISOString().split('T')[0] });
    else {
        setStaffList(prev => {
            const next = prev.map(u => u.id === userId ? { ...u, isActive: false, endDate: new Date().toISOString().split('T')[0] } : u);
            saveToStorage(KEYS.STAFF, next);
            return next;
        });
    }
  };
  const deleteStaff = async (userId: string) => {
    if (isCloudMode && db) {
        await deleteDoc(doc(db!, 'staff', userId));
    } else {
        setStaffList(prev => {
            const next = prev.filter(u => u.id !== userId);
            saveToStorage(KEYS.STAFF, next);
            return next;
        });
    }
  };

  const addPosition = async (position: string) => {
    if (isCloudMode && db) await setDoc(doc(db!, 'config', 'positions'), { list: [...availablePositions, position] });
    else {
        setAvailablePositions(prev => {
            const next = [...prev, position];
            saveToStorage(KEYS.POSITIONS, next);
            return next;
        });
    }
  };
  const removePosition = async (position: string) => {
    if (isCloudMode && db) {
        const newList = availablePositions.filter(p => p !== position);
        await setDoc(doc(db!, 'config', 'positions'), { list: newList });
    } else {
        setAvailablePositions(prev => {
            const next = prev.filter(p => p !== position);
            saveToStorage(KEYS.POSITIONS, next);
            return next;
        });
    }
  };
  const movePosition = async (position: string, direction: 'up' | 'down') => {
    const index = availablePositions.indexOf(position);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === availablePositions.length - 1) return;
    
    if (isCloudMode && db) {
        const newPositions = [...availablePositions];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newPositions[index], newPositions[swapIndex]] = [newPositions[swapIndex], newPositions[index]];
        await setDoc(doc(db!, 'config', 'positions'), { list: newPositions });
    } else {
        setAvailablePositions(prev => {
            const newPositions = [...prev];
            const swapIndex = direction === 'up' ? index - 1 : index + 1;
            [newPositions[index], newPositions[swapIndex]] = [newPositions[swapIndex], newPositions[index]];
            saveToStorage(KEYS.POSITIONS, newPositions);
            return newPositions;
        });
    }
  };

  return (
    <StoreContext.Provider value={{
      currentUser, login, logout,
      storeSession, sessionHistory, openStore, closeStore,
      tables, updateTableStatus,
      orders, createOrder, updateOrderStatus, toggleItemCookedStatus, cancelOrder, deleteOrder,
      menu, addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuAvailability, updateMenuStock,
      inventory, updateIngredientQuantity, addIngredient, removeIngredient,
      staffList, addStaff, updateStaff, terminateStaff, deleteStaff,
      availablePositions, addPosition, removePosition, movePosition,
      resetSystem, runSelfHealing, isCloudMode, initializeCloudData
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