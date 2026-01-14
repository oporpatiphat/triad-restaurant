import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- วิธีการตั้งค่า Firebase (ฟรี) ---
// 1. ไปที่ https://console.firebase.google.com/
// 2. สร้างโปรเจกต์ใหม่ (Create Project)
// 3. สร้าง Web App (ไอคอน </>)
// 4. ก๊อปปี้ค่าใน const firebaseConfig มาวางทับด้านล่างนี้
// 5. อย่าลืมไปกดสร้าง Database ที่เมนู "Firestore Database" และเลือก "Start in Test Mode"

// ---------------------------------------------------------
// พื้นที่สำหรับวาง Config (ลบของเก่าแล้ววางของใหม่ทับได้เลย)
// ---------------------------------------------------------
const firebaseConfig = {

  apiKey: "AIzaSyCH0wII5jAtv9G2uJhlcpZ6kf4JupscyaA",

  authDomain: "triad-restaurant.firebaseapp.com",

  projectId: "triad-restaurant",

  storageBucket: "triad-restaurant.firebasestorage.app",

  messagingSenderId: "741573397234",

  appId: "1:741573397234:web:591abb7b6a2fd7f0a85e6b"

};
// ---------------------------------------------------------

// ระบบตรวจสอบว่าใส่ Key หรือยัง
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
export const isCloudEnabled = isConfigured;
