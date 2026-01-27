import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- ส่วนสำคัญ: การตั้งค่า Firebase (Cloud Database) ---
// 1. ไปที่ https://console.firebase.google.com/
// 2. สร้างโปรเจกต์ใหม่ -> เลือก "Web" (ไอคอน </>)
// 3. ก๊อปปี้ค่า config มาแทนที่ด้านล่างนี้
// 4. ไปที่เมนู Firestore Database -> Create Database -> เลือก Start in Test Mode (เพื่อให้เขียนข้อมูลได้โดยไม่ต้องแก้ Rules ในช่วงแรก)

const firebaseConfig = {

  apiKey: "AIzaSyCH0wII5jAtv9G2uJhlcpZ6kf4JupscyaA",

  authDomain: "triad-restaurant.firebaseapp.com",

  projectId: "triad-restaurant",

  storageBucket: "triad-restaurant.firebasestorage.app",

  messagingSenderId: "741573397234",

  appId: "1:741573397234:web:591abb7b6a2fd7f0a85e6b"

};


// ตรวจสอบว่าได้ใส่ Key จริงหรือยัง (ถ้ายังเป็น YOUR_API_KEY_HERE ถือว่ายังไม่พร้อม)
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

// Initialize Firebase
const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
export const isCloudEnabled = isConfigured;