

export enum Role {
  OWNER = 'OWNER',
  CHEF = 'CHEF',
  STAFF = 'STAFF'
}

export interface User {
  id: string;
  username: string;
  password?: string; // New: Password
  name: string;
  role: Role; // System Permission Role
  position: string; // New: Job Title (e.g. "Head Chef", "Junior Server")
  staffClass: string; // New: Class/Level (e.g. "A", "B", "Trainee")
  startDate: string; // ISO Date
  endDate?: string; // ISO Date (if resigned)
  isActive: boolean;
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  DIRTY = 'DIRTY'
}

export interface Table {
  id: string;
  number: string;
  floor: 'GROUND' | 'UPPER' | 'DELIVERY'; // Added DELIVERY
  status: TableStatus;
  capacity: number;
  currentOrderId?: string;
}

export enum OrderStatus {
  PENDING = 'PENDING',        // รอทำ
  COOKING = 'COOKING',        // กำลังทำ (ระบุ Chef)
  SERVING = 'SERVING',        // รอเสิร์ฟ/กำลังเสิร์ฟ (ระบุ Staff)
  SERVED = 'SERVED',          // เสิร์ฟแล้ว (ลูกค้าทานอยู่)
  WAITING_PAYMENT = 'WAITING_PAYMENT', // รอเก็บเงิน
  COMPLETED = 'COMPLETED',    // เสร็จสิ้น
  CANCELLED = 'CANCELLED'
}

export enum CustomerClass {
  UNDER = 'Under',
  MIDDLE = 'Middle',
  HIGH = 'High',
  ELITE = 'Elite'
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  note?: string;
  isCooked?: boolean; // New: Track individual item progress
}

export interface Order {
  id: string;
  tableId: string;
  customerName: string;
  customerClass: CustomerClass;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  timestamp: Date;
  chefName?: string;  // Who cooked it
  serverName?: string; // Who served it
  paymentMethod?: 'CASH' | 'CARD'; // New field
  boxCount?: number; // New: Number of boxes (100 per unit)
  bagCount?: number; // New: Number of bags (Free)
  note?: string; // New: Table note (e.g. Separate boxes)
  isStaffMeal?: boolean; // NEW: Flag for staff meals (deduct stock, no money)
}

export type MenuCategory = 'Main Dish' | 'Appetizer' | 'Soup' | 'Drink' | 'Set' | 'Other';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  category: MenuCategory | string;
  imageUrl?: string;
  ingredients: string[]; 
  isAvailable: boolean; // For daily availability toggle
  dailyStock: number;   // -1 for unlimited, or specific quantity
  source?: 'TRIAD' | 'OTHER'; // NEW: Distinguish shop source
}

export type IngredientCategory = 'เนื้อสัตว์' | 'ผัก' | 'ของแห้ง/อื่นๆ' | 'ไวน์';

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  threshold: number;
  category: IngredientCategory;
}

export interface StoreSession {
  openedAt: Date;
  closedAt?: Date;
  isOpen: boolean;
}

export interface SessionRecord {
  id: string;
  openedAt: Date;
  closedAt?: Date;
  openedBy: string;
  closedBy?: string;
  totalSales: number;
  orderCount: number;
}