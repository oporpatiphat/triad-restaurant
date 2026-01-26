import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- ส่วนสำคัญ: การตั้งค่า Firebase (Cloud Database) ---
// 1. ไปที่ https://console.firebase.google.com/
// 2. สร้างโปรเจกต์ใหม่ -> เลือก "Web" (ไอคอน </>)
// 3. ก๊อปปี้ค่า config มาแทนที่ด้านล่างนี้
// 4. ไปที่เมนู Firestore Database -> Create Database -> เลือก Start in Test Mode (เพื่อให้เขียนข้อมูลได้โดยไม่ต้องแก้ Rules ในช่วงแรก)

const firebaseConfig = {
  // --- นำค่าจาก Firebase ของคุณมาแทนที่ตรงนี้ ---
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// ตรวจสอบว่าได้ใส่ Key จริงหรือยัง (ถ้ายังเป็น YOUR_API_KEY_HERE ถือว่ายังไม่พร้อม)
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

// Initialize Firebase
const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
export const isCloudEnabled = isConfigured;