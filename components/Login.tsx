import React, { useState } from 'react';
import { useStore } from '../services/StoreContext';
import { Crown, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(username, password)) {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ');
    }
  };

  return (
    <div className="min-h-screen bg-[#2A090D] flex items-center justify-center p-4 relative overflow-hidden font-heading">
      {/* Background Textures */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      
      {/* Gold Accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-600/20 blur-[100px] rounded-full"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-900/40 blur-[100px] rounded-full"></div>

      <div className="bg-[#3D0C11] w-full max-w-4xl rounded-3xl shadow-2xl relative z-10 border border-[#5E141B] flex overflow-hidden min-h-[500px]">
        
        {/* Left Side: Branding */}
        <div className="hidden md:flex w-1/2 bg-[#2A090D] flex-col items-center justify-center p-12 border-r border-[#5E141B] relative">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2A090D] via-[#FBBF24] to-[#2A090D]"></div>
           
           <div className="w-24 h-24 bg-gradient-to-br from-[#FBBF24] to-[#B45309] rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(251,191,36,0.3)]">
              <Crown size={48} className="text-[#2A090D]" strokeWidth={2} />
           </div>
           
           <h1 className="text-3xl font-bold text-[#FBBF24] mb-2 tracking-wide text-center">Triad Restaurant</h1>
           <p className="text-[#A16268] text-sm font-medium tracking-[0.2em]">BY LI GROUP</p>
           
           <div className="mt-12 text-[#7F383E] text-center text-sm space-y-1">
             <p>ระบบบริหารจัดการร้านอาหารครบวงจร</p>
             <p>Restaurant Management System</p>
           </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center bg-[#3D0C11]">
          <h2 className="text-2xl font-bold text-white mb-1">เข้าสู่ระบบ</h2>
          <p className="text-[#A16268] text-sm mb-8">กรุณาระบุรหัสพนักงานเพื่อเริ่มงาน</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#FBBF24] ml-1 uppercase tracking-wider">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-3 rounded-lg bg-[#2A090D] border border-[#5E141B] text-white focus:ring-1 focus:ring-[#FBBF24] focus:border-[#FBBF24] outline-none transition-all placeholder-[#5E141B]"
                placeholder="ระบุชื่อผู้ใช้..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#FBBF24] ml-1 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-3 rounded-lg bg-[#2A090D] border border-[#5E141B] text-white focus:ring-1 focus:ring-[#FBBF24] focus:border-[#FBBF24] outline-none transition-all placeholder-[#5E141B]"
                  placeholder="ระบุรหัสผ่าน..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5E141B] hover:text-[#FBBF24] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-900 rounded-lg text-red-300 text-sm text-center">
                {error}
              </div>
            )}
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-[#FBBF24] to-[#D97706] hover:from-[#F59E0B] hover:to-[#B45309] text-[#2A090D] font-bold py-3 rounded-lg shadow-lg shadow-yellow-900/20 transition-all flex items-center justify-center gap-2 group mt-2"
            >
              <span>เข้าใช้งาน</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
            </button>
          </form>
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 md:translate-x-0 md:left-auto md:right-10 text-[#5E141B] text-xs">
             © 2023 Li Group. All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
  );
};
