import { Ingredient, MenuItem, Role, Table, TableStatus, User } from "./types";

export const MOCK_USERS: User[] = [
  // --- REAL USE ADMIN ACCOUNT ONLY ---
  { 
    id: 'u_sumalin', 
    username: 'sumalin', 
    password: '9753127', // รหัสผ่านถาวรสำหรับ Co-CEO
    name: 'คุณสุมลิน (Co-CEO)', 
    role: Role.OWNER,
    position: 'Co-CEO',
    staffClass: 'Elite',
    startDate: '2023-01-01',
    isActive: true
  }
];

export const INITIAL_POSITIONS = ['Admin', 'Co-CEO', 'CEO', 'Manager', 'Fulltime', 'Parttime'];
export const STAFF_CLASSES = ['Under', 'Middle', 'High', 'Elite'];

export const INITIAL_MENU: MenuItem[] = [
  // --- Main Dish ---
  { 
    id: 'm1', 
    name: 'เป็ดปักกิ่ง', 
    description: 'เป็ดหนังกรอบสูตรต้นตำรับ', 
    price: 360, 
    cost: 105, 
    category: 'Main Dish', 
    ingredients: ['Brisket', 'Garlic', 'Cabbage'], 
    isAvailable: true, 
    dailyStock: -1 
  },
  { 
    id: 'm2', 
    name: 'กระเพาะปลาหูฉลาม', 
    description: 'ซุปกระเพาะปลาและหูฉลามน้ำแดง', 
    price: 420, 
    cost: 120, 
    category: 'Main Dish', 
    ingredients: ['Ribeyes', 'Tomato', 'Carrot', 'Onion'], 
    isAvailable: true, 
    dailyStock: -1 
  },
  { 
    id: 'm3', 
    name: 'เป่าฮื้อเจี๋ยนนํ้ามันหอย', 
    description: 'เป่าฮื้อสดเจี๋ยนน้ำมันหอยเข้มข้น', 
    price: 400, 
    cost: 115, 
    category: 'Main Dish', 
    ingredients: ['Sirloin', 'Cabbage', 'Cucumber', 'Wheat'], 
    isAvailable: true, 
    dailyStock: -1 
  },
  { 
    id: 'm4', 
    name: 'หมูหัน/หมูกรอบ', 
    description: 'หมูย่างหนังกรอบ', 
    price: 340, 
    cost: 105, 
    category: 'Main Dish', 
    ingredients: ['Tenderloin', 'Wheat', 'Cucumber'], 
    isAvailable: true, 
    dailyStock: -1 
  },

  // --- Appetizer ---
  { 
    id: 'm5', 
    name: 'เกี๊ยวซ่า', 
    description: 'เกี๊ยวซ่าไส้แน่นทอดกรอบ', 
    price: 220, 
    cost: 70, 
    category: 'Appetizer', 
    ingredients: ['Kidneys', 'Onion'], 
    isAvailable: true, 
    dailyStock: -1 
  },
  { 
    id: 'm6', 
    name: 'เสี่ยวหลงเปา-ขนมจีบ', 
    description: 'ติ่มซำนึ่งสดใหม่ ไส้แน่น', 
    price: 240, 
    cost: 65, 
    category: 'Appetizer', 
    ingredients: ['Chuck', 'Beetroot'], 
    isAvailable: true, 
    dailyStock: -1 
  },
  { 
    id: 'm7', 
    name: 'หมาล่า แห้ง/นํ้า', 
    description: 'ซุปหมาล่ารสเด็ดเผ็ดชา (เลือกได้ แห้ง/น้ำ)', 
    price: 280, 
    cost: 85, 
    category: 'Appetizer', 
    ingredients: ['Shank', 'Radish', 'Corn'], 
    isAvailable: true, 
    dailyStock: -1 
  },
  { 
    id: 'm8', 
    name: 'แมงกระพรุนผัดนํ้ามันงา', 
    description: 'แมงกระพรุนกรุบกรอบหอมน้ำมันงา', 
    price: 220, 
    cost: 60, 
    category: 'Appetizer', 
    ingredients: ['Bonemarrow', 'Corn'], 
    isAvailable: true, 
    dailyStock: -1 
  },

  // --- Drink ---
  { 
    id: 'm9', 
    name: 'นํ้าเต้าหู้', 
    description: 'น้ำเต้าหู้ทรงเครื่อง', 
    price: 250, 
    cost: 75, 
    category: 'Drink', 
    ingredients: ['Beetroot', 'Radish', 'Cucumber', 'Corn', 'Wheat'], 
    isAvailable: true, 
    dailyStock: -1 
  },
  { 
    id: 'm10', 
    name: 'ชาสมุนไพร', 
    description: 'รวมสมุนไพรจีนเพื่อสุขภาพ', 
    price: 260, 
    cost: 75, 
    category: 'Drink', 
    ingredients: ['Beetroot', 'Radish', 'Watermelon', 'Cucumber', 'Corn'], 
    isAvailable: true, 
    dailyStock: -1 
  },
  { 
    id: 'm11', 
    name: 'นํ้าเก็กฮวย', 
    description: 'น้ำเก็กฮวยสูตรโบราณ', 
    price: 300, 
    cost: 105, 
    category: 'Drink', 
    ingredients: ['Beetroot', 'Watermelon', 'Cucumber', 'Corn', 'Wheat', 'Carrot', 'Tomato'], 
    isAvailable: true, 
    dailyStock: -1 
  },
  { 
    id: 'm12', 
    name: 'เหมาไถ (เหล้า)', 
    description: 'สุราจีนระดับตำนาน', 
    price: 400, 
    cost: 105, 
    category: 'Drink', 
    ingredients: ['Corn', 'Wheat', 'Carrot'], 
    isAvailable: true, 
    dailyStock: -1 
  },
];

// UPDATED: All units set to 'ชิ้น', Threshold set to 0 (disabled)
export const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: 'i1', name: 'Brisket', quantity: 50, unit: 'ชิ้น', threshold: 0, category: 'เนื้อสัตว์' },
  { id: 'i2', name: 'Garlic', quantity: 100, unit: 'ชิ้น', threshold: 0, category: 'ผัก' },
  { id: 'i3', name: 'Cabbage', quantity: 50, unit: 'ชิ้น', threshold: 0, category: 'ผัก' },
  { id: 'i4', name: 'Ribeyes', quantity: 40, unit: 'ชิ้น', threshold: 0, category: 'เนื้อสัตว์' },
  { id: 'i5', name: 'Tomato', quantity: 60, unit: 'ชิ้น', threshold: 0, category: 'ผัก' },
  { id: 'i6', name: 'Carrot', quantity: 60, unit: 'ชิ้น', threshold: 0, category: 'ผัก' },
  { id: 'i7', name: 'Onion', quantity: 80, unit: 'ชิ้น', threshold: 0, category: 'ผัก' },
  { id: 'i8', name: 'Sirloin', quantity: 40, unit: 'ชิ้น', threshold: 0, category: 'เนื้อสัตว์' },
  { id: 'i9', name: 'Cucumber', quantity: 50, unit: 'ชิ้น', threshold: 0, category: 'ผัก' },
  // Wheat moved to Vegetables as requested
  { id: 'i10', name: 'Wheat', quantity: 100, unit: 'ชิ้น', threshold: 0, category: 'ผัก' }, 
  { id: 'i11', name: 'Tenderloin', quantity: 30, unit: 'ชิ้น', threshold: 0, category: 'เนื้อสัตว์' },
  { id: 'i12', name: 'Kidneys', quantity: 30, unit: 'ชิ้น', threshold: 0, category: 'เนื้อสัตว์' },
  { id: 'i13', name: 'Chuck', quantity: 40, unit: 'ชิ้น', threshold: 0, category: 'เนื้อสัตว์' },
  { id: 'i14', name: 'Beetroot', quantity: 40, unit: 'ชิ้น', threshold: 0, category: 'ผัก' },
  { id: 'i15', name: 'Shank', quantity: 30, unit: 'ชิ้น', threshold: 0, category: 'เนื้อสัตว์' },
  { id: 'i16', name: 'Radish', quantity: 50, unit: 'ชิ้น', threshold: 0, category: 'ผัก' },
  { id: 'i17', name: 'Corn', quantity: 60, unit: 'ชิ้น', threshold: 0, category: 'ผัก' },
  { id: 'i18', name: 'Bonemarrow', quantity: 20, unit: 'ชิ้น', threshold: 0, category: 'เนื้อสัตว์' },
  { id: 'i19', name: 'Watermelon', quantity: 20, unit: 'ชิ้น', threshold: 0, category: 'ผัก' },
  { id: 'i20', name: 'Duck', quantity: 50, unit: 'ชิ้น', threshold: 0, category: 'เนื้อสัตว์' },
  { id: 'i21', name: 'Abalone', quantity: 30, unit: 'ชิ้น', threshold: 0, category: 'เนื้อสัตว์' },
  { id: 'i22', name: 'Shark Fin', quantity: 20, unit: 'ชิ้น', threshold: 0, category: 'เนื้อสัตว์' },
];

export const generateTables = (): Table[] => {
  const tables: Table[] = [];
  // UPDATED: Ground Floor: T1-T8 (8 tables)
  for (let i = 1; i <= 8; i++) {
    tables.push({
      id: `t${i}`,
      number: `T${i}`,
      floor: 'GROUND',
      status: TableStatus.AVAILABLE,
      capacity: 4
    });
  }
  // UPDATED: Upper Floor: T9-T18 (10 tables)
  for (let i = 9; i <= 18; i++) {
    tables.push({
      id: `t${i}`,
      number: `T${i}`,
      floor: 'UPPER',
      status: TableStatus.AVAILABLE,
      capacity: 6
    });
  }
  return tables;
};