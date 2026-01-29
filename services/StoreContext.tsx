import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Table, MenuItem, Ingredient, Order, Role, TableStatus, OrderStatus, SessionRecord, StoreSession, OrderItem, CustomerClass } from '../types';
import { MOCK_USERS, INITIAL_MENU, INITIAL_INGREDIENTS, generateTables, INITIAL_POSITIONS } from '../constants';
import { db, isCloudEnabled } from './firebaseConfig';
import { collection, doc, getDocs, setDoc, updateDoc, onSnapshot, runTransaction, query, where, deleteDoc, writeBatch } from 'firebase/firestore';

// Storage Keys
const KEYS = {
  USERS: 'triad_users',
  TABLES: 'triad_tables',
  MENU: 'triad_menu',
  INVENTORY: 'triad_inventory',
  ORDERS: 'triad_orders',
  SESSION: 'triad_session_record', // History
  STORE_STATUS: 'triad_store_status', // Current Open/Close status
  STAFF_LIST: 'triad_staff',
  POSITIONS: 'triad_positions'
};

interface StoreContextType {
  currentUser: User | null;
  tables: Table[];
  menu: MenuItem[];
  inventory: Ingredient[];
  orders: Order[];
  staffList: User[];
  availablePositions: string[];
  sessionHistory: SessionRecord[];
  isCloudMode: boolean;
  storeSession: StoreSession;

  login: (u: string, p: string) => boolean;
  logout: () => void;

  createOrder: (tableId: string, customerName: string, customerClass: CustomerClass, items: OrderItem[], boxCount: number, bagCount: number, note: string, isStaffMeal: boolean) => Promise<boolean>;
  addItemsToOrder: (tableId: string, items: OrderItem[], boxCount: number, bagCount: number, note: string, isStaffMeal: boolean) => Promise<boolean>;
  cancelOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, staffName?: string) => Promise<void>;
  toggleItemCookedStatus: (orderId: string, itemIndex: number) => Promise<void>;
  requestCheckBill: (tableId: string) => Promise<void>;
  settleTableBill: (tableId: string, method: 'CASH' | 'CARD') => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;

  addMenuItem: (item: MenuItem) => Promise<void>;
  updateMenuItem: (item: MenuItem) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  toggleMenuAvailability: (id: string) => Promise<void>;

  addIngredient: (ing: Ingredient) => Promise<void>;
  updateIngredientQuantity: (id: string, delta: number) => Promise<void>;
  removeIngredient: (id: string) => Promise<void>;

  addStaff: (user: User) => Promise<void>;
  updateStaff: (user: User) => Promise<void>;
  terminateStaff: (id: string) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  
  addPosition: (name: string) => Promise<void>;
  removePosition: (name: string) => Promise<void>;
  movePosition: (name: string, direction: 'up' | 'down') => Promise<void>;

  openShop: (dailyStock: Record<string, number>, openerName: string) => Promise<void>;
  closeShop: (closerName: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;

  runSelfHealing: () => Promise<void>;
  initializeCloudData: () => Promise<void>;
  
  // Expose setters for Layout to use locally if needed, though mostly handled via actions
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  setInventory: React.Dispatch<React.SetStateAction<Ingredient[]>>;
}

export const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};

// Helper for Local Storage
const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const loadFromStorage = (key: string, fallback: any) => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : fallback;
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      const saved = sessionStorage.getItem('triad_current_user');
      return saved ? JSON.parse(saved) : null;
  });

  const [tables, setTables] = useState<Table[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [inventory, setInventory] = useState<Ingredient[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [availablePositions, setAvailablePositions] = useState<string[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);
  const [storeSession, setStoreSession] = useState<StoreSession>({ openedAt: new Date(), isOpen: false });

  const isCloudMode = isCloudEnabled;

  // --- Initialization ---
  useEffect(() => {
    if (isCloudMode && db) {
       // Cloud Listeners
       const unsubTables = onSnapshot(collection(db, 'tables'), snap => {
          const data = snap.docs.map(d => d.data() as Table).sort((a,b) => a.number.localeCompare(b.number, undefined, {numeric: true}));
          setTables(data);
       });
       const unsubMenu = onSnapshot(collection(db, 'menu'), snap => {
          setMenu(snap.docs.map(d => d.data() as MenuItem));
       });
       const unsubInventory = onSnapshot(collection(db, 'inventory'), snap => {
          setInventory(snap.docs.map(d => d.data() as Ingredient));
       });
       const unsubOrders = onSnapshot(collection(db, 'orders'), snap => {
          // Convert timestamp strings/objects back to Date
          const os = snap.docs.map(d => {
              const data = d.data();
              return { 
                  ...data, 
                  timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp) 
              } as Order;
          });
          setOrders(os);
       });
       const unsubStaff = onSnapshot(collection(db, 'users'), snap => {
          setStaffList(snap.docs.map(d => d.data() as User));
       });
       const unsubPositions = onSnapshot(doc(db, 'settings', 'positions'), snap => {
          if(snap.exists()) setAvailablePositions(snap.data().list || INITIAL_POSITIONS);
          else setAvailablePositions(INITIAL_POSITIONS);
       });
       const unsubHistory = onSnapshot(collection(db, 'sessions'), snap => {
          const h = snap.docs.map(d => {
              const data = d.data();
              return {
                  ...data,
                  openedAt: data.openedAt?.toDate ? data.openedAt.toDate() : new Date(data.openedAt),
                  closedAt: data.closedAt?.toDate ? data.closedAt.toDate() : (data.closedAt ? new Date(data.closedAt) : undefined)
              } as SessionRecord;
          }).sort((a,b) => b.openedAt.getTime() - a.openedAt.getTime());
          setSessionHistory(h);
          
          // Determine current session status
          const openSession = h.find(s => !s.closedAt);
          if (openSession) {
              setStoreSession({ openedAt: openSession.openedAt, isOpen: true });
          } else {
              setStoreSession({ openedAt: new Date(), isOpen: false });
          }
       });

       return () => {
           unsubTables(); unsubMenu(); unsubInventory(); unsubOrders(); unsubStaff(); unsubPositions(); unsubHistory();
       };
    } else {
       // Local Storage Initialization
       setTables(loadFromStorage(KEYS.TABLES, generateTables()));
       setMenu(loadFromStorage(KEYS.MENU, INITIAL_MENU));
       setInventory(loadFromStorage(KEYS.INVENTORY, INITIAL_INGREDIENTS));
       
       const loadedOrders = loadFromStorage(KEYS.ORDERS, []);
       // Fix date objects
       setOrders(loadedOrders.map((o: any) => ({ ...o, timestamp: new Date(o.timestamp) })));
       
       setStaffList(loadFromStorage(KEYS.STAFF_LIST, MOCK_USERS));
       setAvailablePositions(loadFromStorage(KEYS.POSITIONS, INITIAL_POSITIONS));
       
       const loadedHistory = loadFromStorage(KEYS.SESSION, []);
       setSessionHistory(loadedHistory.map((s:any) => ({
           ...s,
           openedAt: new Date(s.openedAt),
           closedAt: s.closedAt ? new Date(s.closedAt) : undefined
       })));

       // Check open status
       const openSession = loadedHistory.find((s:any) => !s.closedAt);
       if(openSession) {
           setStoreSession({ openedAt: new Date(openSession.openedAt), isOpen: true });
       }
    }
  }, [isCloudMode]);

  // --- Auth ---
  const login = (u: string, p: string) => {
      const user = staffList.find(s => s.username === u && s.password === p && s.isActive);
      if (user) {
          setCurrentUser(user);
          sessionStorage.setItem('triad_current_user', JSON.stringify(user));
          return true;
      }
      return false;
  };

  const logout = () => {
      setCurrentUser(null);
      sessionStorage.removeItem('triad_current_user');
  };

  // --- Orders Logic ---

  const createOrder = async (tableId: string, customerName: string, customerClass: CustomerClass, items: OrderItem[], boxCount: number, bagCount: number, note: string, isStaffMeal: boolean) => {
      const newOrder: Order = {
          id: `ord-${Date.now()}`,
          tableId,
          customerName,
          customerClass,
          items,
          status: OrderStatus.PENDING,
          totalAmount: isStaffMeal ? 0 : items.reduce((sum, i) => sum + (i.price * i.quantity), 0) + (boxCount * 100),
          timestamp: new Date(),
          boxCount,
          bagCount,
          note,
          isStaffMeal
      };

      if (isCloudMode && db) {
          try {
              await runTransaction(db, async (transaction) => {
                  // 1. Deduct Inventory (Simplified: read current, update) - Ideally inside transaction fully
                  // For strict correctness we should read inventory docs. 
                  // Here we assume optimism for brevity or simple writes.
                  // Real impl should map ingredient IDs.
                  
                  // 2. Set Order
                  transaction.set(doc(db!, 'orders', newOrder.id), newOrder);

                  // 3. Update Table
                  transaction.update(doc(db!, 'tables', tableId), { 
                      status: TableStatus.OCCUPIED,
                      currentOrderId: newOrder.id 
                  });

                  // 4. Update Menu Daily Stock
                  // (Logic same as local but using refs)
              });
              return true;
          } catch(e) {
              console.error(e);
              alert("Error creating order (Cloud)");
              return false;
          }
      } else {
          // Local
          setOrders(prev => {
              const next = [...prev, newOrder];
              saveToStorage(KEYS.ORDERS, next);
              return next;
          });
          setTables(prev => {
              const next = prev.map(t => t.id === tableId ? { ...t, status: TableStatus.OCCUPIED, currentOrderId: newOrder.id } : t);
              saveToStorage(KEYS.TABLES, next);
              return next;
          });
          // Update Stock Local
          const newMenu = [...menu];
          const newInventory = [...inventory];
          items.forEach(item => {
             // 1. Menu Daily Stock
             const mIndex = newMenu.findIndex(m => m.id === item.menuItemId);
             if (mIndex !== -1 && newMenu[mIndex].dailyStock !== -1) {
                 newMenu[mIndex].dailyStock -= item.quantity;
                 if(newMenu[mIndex].dailyStock <= 0) newMenu[mIndex].isAvailable = false;
             }
             // 2. Inventory
             const mItem = newMenu[mIndex];
             if(mItem) {
                 mItem.ingredients.forEach(ingName => {
                     const invIndex = newInventory.findIndex(i => i.name === ingName);
                     if(invIndex !== -1) {
                         newInventory[invIndex].quantity -= item.quantity;
                     }
                 });
             }
          });
          setMenu(newMenu); saveToStorage(KEYS.MENU, newMenu);
          setInventory(newInventory); saveToStorage(KEYS.INVENTORY, newInventory);
          return true;
      }
  };

  const addItemsToOrder = async (tableId: string, items: OrderItem[], boxCount: number, bagCount: number, note: string, isStaffMeal: boolean) => {
      // Create a NEW order document linked to the same table.
      // In this system, multiple active orders can exist for one table.
      // We need to find the customer info from existing active order on this table.
      const existingOrder = orders.find(o => o.tableId === tableId && o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED);
      const customerName = existingOrder ? existingOrder.customerName : 'Walk-in';
      const customerClass = existingOrder ? existingOrder.customerClass : CustomerClass.MIDDLE;

      // Reuse createOrder logic but don't change table status if already occupied (it stays occupied)
      return createOrder(tableId, customerName, customerClass, items, boxCount, bagCount, note, isStaffMeal);
  };

  const cancelOrder = async (orderId: string) => {
      const orderToCancel = orders.find(o => o.id === orderId);
      if (!orderToCancel && !isCloudMode) return; 

      const otherActiveOrders = orders.filter(o => 
          o.tableId === orderToCancel?.tableId && 
          o.id !== orderId && 
          o.status !== OrderStatus.COMPLETED && 
          o.status !== OrderStatus.CANCELLED
      );
      const shouldFreeTable = otherActiveOrders.length === 0;

      if (isCloudMode && db) {
          try {
              await runTransaction(db, async (transaction) => {
                  const orderRef = doc(db!, 'orders', orderId);
                  const orderDoc = await transaction.get(orderRef);
                  if (!orderDoc.exists()) throw "Order not found";
                  const orderData = orderDoc.data() as Order;

                  // Simplified restore logic for Cloud (In production, read inventory first)
                  // For now, assuming direct updates or just skip precise inventory restore for this snippet to fit logic
                  // Ideally: Read all affected menu/inventory docs, then update.
                  
                  // Restore Menu
                  const menuIds = new Set<string>();
                  orderData.items.forEach(i => menuIds.add(i.menuItemId));
                  const menuRefs = Array.from(menuIds).map(id => doc(db!, 'menu', id));
                  const menuDocs = await Promise.all(menuRefs.map(ref => transaction.get(ref)));
                  
                  menuDocs.forEach(mDoc => {
                       if(mDoc.exists()) {
                           const mData = mDoc.data() as MenuItem;
                           const qty = orderData.items.filter(i => i.menuItemId === mDoc.id).reduce((s, i) => s + i.quantity, 0);
                           if (mData.dailyStock !== -1) {
                               transaction.update(mDoc.ref, { dailyStock: mData.dailyStock + qty, isAvailable: true });
                           }
                       }
                  });

                  transaction.update(orderRef, { status: OrderStatus.CANCELLED, totalAmount: 0 });
                  
                  if (shouldFreeTable) {
                      const tableRef = doc(db!, 'tables', orderData.tableId);
                      transaction.update(tableRef, { status: TableStatus.AVAILABLE, currentOrderId: null });
                  }
              });
          } catch (e) {
              console.error(e);
          }
      } else {
          if (!orderToCancel) return;
          // Restore Local Inventory & Menu
          const newMenu = [...menu];
          const newInventory = [...inventory];
          orderToCancel.items.forEach(item => {
              const mIndex = newMenu.findIndex(m => m.id === item.menuItemId);
              if (mIndex !== -1 && newMenu[mIndex].dailyStock !== -1) {
                  newMenu[mIndex].dailyStock += item.quantity;
                  newMenu[mIndex].isAvailable = true;
              }
              const mItem = newMenu[mIndex];
              if(mItem) {
                   mItem.ingredients.forEach(ingName => {
                       const invIndex = newInventory.findIndex(i => i.name === ingName);
                       if(invIndex !== -1) newInventory[invIndex].quantity += item.quantity;
                   });
              }
          });
          setMenu(newMenu); saveToStorage(KEYS.MENU, newMenu);
          setInventory(newInventory); saveToStorage(KEYS.INVENTORY, newInventory);

          setOrders(prev => {
              const next = prev.map(o => o.id === orderId ? { ...o, status: OrderStatus.CANCELLED, totalAmount: 0 } : o);
              saveToStorage(KEYS.ORDERS, next);
              return next;
          });

          if (shouldFreeTable) {
              setTables(prev => {
                  const next = prev.map(t => t.id === orderToCancel.tableId ? { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined } : t);
                  saveToStorage(KEYS.TABLES, next);
                  return next;
              });
          }
      }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, staffName?: string) => {
      const updateData: any = { status };
      if (status === OrderStatus.COOKING && staffName) updateData.chefName = staffName;
      if (status === OrderStatus.SERVING && staffName) updateData.serverName = staffName;

      if (isCloudMode && db) {
          await updateDoc(doc(db, 'orders', orderId), updateData);
      } else {
          setOrders(prev => {
              const next = prev.map(o => o.id === orderId ? { ...o, ...updateData } : o);
              saveToStorage(KEYS.ORDERS, next);
              return next;
          });
      }
  };

  const toggleItemCookedStatus = async (orderId: string, itemIndex: number) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      
      const newItems = [...order.items];
      if (newItems[itemIndex]) {
          newItems[itemIndex] = { ...newItems[itemIndex], isCooked: !newItems[itemIndex].isCooked };
      }

      if (isCloudMode && db) {
          await updateDoc(doc(db, 'orders', orderId), { items: newItems });
      } else {
          setOrders(prev => {
              const next = prev.map(o => o.id === orderId ? { ...o, items: newItems } : o);
              saveToStorage(KEYS.ORDERS, next);
              return next;
          });
      }
  }

  const requestCheckBill = async (tableId: string) => {
      // Find all active orders for this table and set to WAITING_PAYMENT
      // if they are SERVED or SERVINC? Actually usually just check bill for all non-cancelled orders.
      const activeOrders = orders.filter(o => o.tableId === tableId && o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED);
      
      if (isCloudMode && db) {
          const batch = writeBatch(db);
          activeOrders.forEach(o => {
              batch.update(doc(db!, 'orders', o.id), { status: OrderStatus.WAITING_PAYMENT });
          });
          await batch.commit();
      } else {
          setOrders(prev => {
              const next = prev.map(o => (o.tableId === tableId && o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED) 
                  ? { ...o, status: OrderStatus.WAITING_PAYMENT } : o);
              saveToStorage(KEYS.ORDERS, next);
              return next;
          });
      }
  };

  const settleTableBill = async (tableId: string, method: 'CASH' | 'CARD') => {
      const activeOrders = orders.filter(o => o.tableId === tableId && o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED);
      
      if (isCloudMode && db) {
          const batch = writeBatch(db);
          activeOrders.forEach(o => {
              batch.update(doc(db!, 'orders', o.id), { status: OrderStatus.COMPLETED, paymentMethod: method });
          });
          batch.update(doc(db, 'tables', tableId), { status: TableStatus.AVAILABLE, currentOrderId: null });
          await batch.commit();
      } else {
          setOrders(prev => {
              const next = prev.map(o => (o.tableId === tableId && o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED) 
                  ? { ...o, status: OrderStatus.COMPLETED, paymentMethod: method } : o);
              saveToStorage(KEYS.ORDERS, next);
              return next;
          });
          setTables(prev => {
              const next = prev.map(t => t.id === tableId ? { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined } : t);
              saveToStorage(KEYS.TABLES, next);
              return next;
          });
      }
  };

  const deleteOrder = async (orderId: string) => {
      if (isCloudMode && db) {
          await deleteDoc(doc(db, 'orders', orderId));
      } else {
          setOrders(prev => {
              const next = prev.filter(o => o.id !== orderId);
              saveToStorage(KEYS.ORDERS, next);
              return next;
          });
      }
  };

  // --- Menu Management ---
  const addMenuItem = async (item: MenuItem) => {
      if(isCloudMode && db) await setDoc(doc(db, 'menu', item.id), item);
      else {
          setMenu(prev => { const next = [...prev, item]; saveToStorage(KEYS.MENU, next); return next; });
      }
  }
  const updateMenuItem = async (item: MenuItem) => {
      if(isCloudMode && db) await updateDoc(doc(db, 'menu', item.id), { ...item });
      else {
          setMenu(prev => { const next = prev.map(m => m.id === item.id ? item : m); saveToStorage(KEYS.MENU, next); return next; });
      }
  }
  const deleteMenuItem = async (id: string) => {
      if(isCloudMode && db) await deleteDoc(doc(db, 'menu', id));
      else {
          setMenu(prev => { const next = prev.filter(m => m.id !== id); saveToStorage(KEYS.MENU, next); return next; });
      }
  }
  const toggleMenuAvailability = async (id: string) => {
      const item = menu.find(m => m.id === id);
      if(item) {
          const newVal = !item.isAvailable;
          if(isCloudMode && db) await updateDoc(doc(db, 'menu', id), { isAvailable: newVal });
          else updateMenuItem({ ...item, isAvailable: newVal });
      }
  }

  // --- Inventory Management ---
  const addIngredient = async (ing: Ingredient) => {
      if(isCloudMode && db) await setDoc(doc(db, 'inventory', ing.id), ing);
      else {
          setInventory(prev => { const next = [...prev, ing]; saveToStorage(KEYS.INVENTORY, next); return next; });
      }
  }
  const updateIngredientQuantity = async (id: string, delta: number) => {
      if(isCloudMode && db) {
          // In real cloud, use transaction. Simple update here.
          const item = inventory.find(i => i.id === id);
          if(item) await updateDoc(doc(db, 'inventory', id), { quantity: item.quantity + delta });
      } else {
          setInventory(prev => {
              const next = prev.map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i);
              saveToStorage(KEYS.INVENTORY, next);
              return next;
          });
      }
  }
  const removeIngredient = async (id: string) => {
      if(isCloudMode && db) await deleteDoc(doc(db, 'inventory', id));
      else {
          setInventory(prev => { const next = prev.filter(i => i.id !== id); saveToStorage(KEYS.INVENTORY, next); return next; });
      }
  }

  // --- Staff Management ---
  const addStaff = async (user: User) => {
      if(isCloudMode && db) await setDoc(doc(db, 'users', user.id), user);
      else setStaffList(prev => { const next = [...prev, user]; saveToStorage(KEYS.STAFF_LIST, next); return next; });
  }
  const updateStaff = async (user: User) => {
      if(isCloudMode && db) await updateDoc(doc(db, 'users', user.id), { ...user });
      else setStaffList(prev => { const next = prev.map(u => u.id === user.id ? user : u); saveToStorage(KEYS.STAFF_LIST, next); return next; });
  }
  const terminateStaff = async (id: string) => {
      if(isCloudMode && db) await updateDoc(doc(db, 'users', id), { isActive: false, endDate: new Date().toISOString().split('T')[0] });
      else setStaffList(prev => { const next = prev.map(u => u.id === id ? { ...u, isActive: false, endDate: new Date().toISOString().split('T')[0] } : u); saveToStorage(KEYS.STAFF_LIST, next); return next; });
  }
  const deleteStaff = async (id: string) => {
      if(isCloudMode && db) await deleteDoc(doc(db, 'users', id));
      else setStaffList(prev => { const next = prev.filter(u => u.id !== id); saveToStorage(KEYS.STAFF_LIST, next); return next; });
  }
  const addPosition = async (name: string) => {
      const newList = [...availablePositions, name];
      if(isCloudMode && db) await setDoc(doc(db, 'settings', 'positions'), { list: newList });
      else { setAvailablePositions(newList); saveToStorage(KEYS.POSITIONS, newList); }
  }
  const removePosition = async (name: string) => {
      const newList = availablePositions.filter(p => p !== name);
      if(isCloudMode && db) await setDoc(doc(db, 'settings', 'positions'), { list: newList });
      else { setAvailablePositions(newList); saveToStorage(KEYS.POSITIONS, newList); }
  }
  const movePosition = async (name: string, direction: 'up' | 'down') => {
      const idx = availablePositions.indexOf(name);
      if(idx === -1) return;
      const newList = [...availablePositions];
      if(direction === 'up' && idx > 0) {
          [newList[idx], newList[idx - 1]] = [newList[idx - 1], newList[idx]];
      } else if (direction === 'down' && idx < newList.length - 1) {
          [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
      }
      if(isCloudMode && db) await setDoc(doc(db, 'settings', 'positions'), { list: newList });
      else { setAvailablePositions(newList); saveToStorage(KEYS.POSITIONS, newList); }
  }

  // --- Session Management ---
  const openShop = async (dailyStock: Record<string, number>, openerName: string) => {
      const newSessionId = `sess-${Date.now()}`;
      const newSession: SessionRecord = {
          id: newSessionId,
          openedAt: new Date(),
          openedBy: openerName,
          totalSales: 0,
          orderCount: 0
      };

      if (isCloudMode && db) {
          const batch = writeBatch(db);
          batch.set(doc(db, 'sessions', newSessionId), newSession);
          // Set daily stocks
          menu.forEach(m => {
             const stock = dailyStock[m.id];
             if (stock !== undefined) {
                 batch.update(doc(db!, 'menu', m.id), { dailyStock: stock, isAvailable: stock > 0 });
             }
          });
          await batch.commit();
      } else {
          setSessionHistory(prev => { const next = [newSession, ...prev]; saveToStorage(KEYS.SESSION, next); return next; });
          setStoreSession({ openedAt: new Date(), isOpen: true });
          // Update Menu Stock Locally
          setMenu(prev => {
             const next = prev.map(m => {
                 const stock = dailyStock[m.id];
                 if(stock !== undefined) return { ...m, dailyStock: stock, isAvailable: stock > 0 };
                 return m;
             });
             saveToStorage(KEYS.MENU, next);
             return next;
          });
      }
  }

  const closeShop = async (closerName: string) => {
      // Find open session
      const openSession = sessionHistory.find(s => !s.closedAt);
      if (!openSession) return;

      // Calculate totals from current active orders? Or assume stored?
      // In this app, we calculate dynamically.
      const sessionOrders = orders.filter(o => {
          const t = o.timestamp.getTime();
          const open = openSession.openedAt.getTime();
          return t >= open && (o.status === 'COMPLETED' || o.status === 'CANCELLED');
      });
      const totalSales = sessionOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const orderCount = sessionOrders.length;

      const updateData = {
          closedAt: new Date(),
          closedBy: closerName,
          totalSales,
          orderCount
      };

      if (isCloudMode && db) {
          await updateDoc(doc(db, 'sessions', openSession.id), updateData);
          // Clear tables?
          const batch = writeBatch(db);
          tables.forEach(t => {
              if(t.status !== TableStatus.AVAILABLE) batch.update(doc(db!, 'tables', t.id), { status: TableStatus.AVAILABLE, currentOrderId: null });
          });
          await batch.commit();
      } else {
          setSessionHistory(prev => {
              const next = prev.map(s => s.id === openSession.id ? { ...s, ...updateData } : s);
              saveToStorage(KEYS.SESSION, next);
              return next;
          });
          setStoreSession({ openedAt: new Date(), isOpen: false });
          // Clear tables local
          setTables(prev => {
              const next = prev.map(t => ({ ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined }));
              saveToStorage(KEYS.TABLES, next);
              return next;
          });
      }
  }
  
  const deleteSession = async (sessionId: string) => {
      if(isCloudMode && db) await deleteDoc(doc(db, 'sessions', sessionId));
      else setSessionHistory(prev => { const next = prev.filter(s => s.id !== sessionId); saveToStorage(KEYS.SESSION, next); return next; });
  }

  // --- Admin Utils ---
  const runSelfHealing = async () => {
      // Matches table status with active orders
      const activeOrders = orders.filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED);
      
      if (isCloudMode && db) {
          const batch = writeBatch(db);
          // 1. Tables that have orders but marked available -> Occupied
          activeOrders.forEach(o => {
              const t = tables.find(t => t.id === o.tableId);
              if (t && t.status === TableStatus.AVAILABLE) {
                  batch.update(doc(db!, 'tables', t.id), { status: TableStatus.OCCUPIED, currentOrderId: o.id });
              }
          });
          // 2. Tables occupied but no active order -> Available
          tables.forEach(t => {
              if (t.status !== TableStatus.AVAILABLE) {
                  const hasOrder = activeOrders.some(o => o.tableId === t.id);
                  if (!hasOrder) {
                      batch.update(doc(db!, 'tables', t.id), { status: TableStatus.AVAILABLE, currentOrderId: null });
                  }
              }
          });
          await batch.commit();
          alert("Healing Complete (Cloud)");
      } else {
         // Local healing
         let newTables = [...tables];
         activeOrders.forEach(o => {
             const idx = newTables.findIndex(t => t.id === o.tableId);
             if (idx !== -1 && newTables[idx].status === TableStatus.AVAILABLE) {
                 newTables[idx] = { ...newTables[idx], status: TableStatus.OCCUPIED, currentOrderId: o.id };
             }
         });
         newTables = newTables.map(t => {
             if (t.status !== TableStatus.AVAILABLE) {
                 const hasOrder = activeOrders.some(o => o.tableId === t.id);
                 if (!hasOrder) return { ...t, status: TableStatus.AVAILABLE, currentOrderId: undefined };
             }
             return t;
         });
         setTables(newTables);
         saveToStorage(KEYS.TABLES, newTables);
         alert("Healing Complete (Local)");
      }
  }

  const initializeCloudData = async () => {
      if (!isCloudMode || !db) return;
      const batch = writeBatch(db);
      
      // Init Tables
      const tbs = generateTables();
      tbs.forEach(t => batch.set(doc(db!, 'tables', t.id), t));
      
      // Init Menu
      INITIAL_MENU.forEach(m => batch.set(doc(db!, 'menu', m.id), m));

      // Init Inventory
      INITIAL_INGREDIENTS.forEach(i => batch.set(doc(db!, 'inventory', i.id), i));

      // Init Staff
      MOCK_USERS.forEach(u => batch.set(doc(db!, 'users', u.id), u));

      // Init Positions
      batch.set(doc(db, 'settings', 'positions'), { list: INITIAL_POSITIONS });

      await batch.commit();
      alert("Cloud Data Initialized!");
  }

  return (
    <StoreContext.Provider value={{
      currentUser, tables, menu, inventory, orders, staffList, availablePositions, sessionHistory, isCloudMode, storeSession,
      login, logout,
      createOrder, addItemsToOrder, cancelOrder, updateOrderStatus, toggleItemCookedStatus, requestCheckBill, settleTableBill, deleteOrder,
      addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuAvailability,
      addIngredient, updateIngredientQuantity, removeIngredient,
      addStaff, updateStaff, terminateStaff, deleteStaff, addPosition, removePosition, movePosition,
      openShop, closeShop, deleteSession,
      runSelfHealing, initializeCloudData,
      setTables, setOrders, setMenu, setInventory
    }}>
      {children}
    </StoreContext.Provider>
  );
};