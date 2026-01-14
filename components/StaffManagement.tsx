import React, { useState, useEffect } from 'react';
import { useStore } from '../services/StoreContext';
import { Users, UserPlus, Trash2, Edit, Save, X, Plus, Settings, UserX, History, Briefcase, ShieldAlert, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Role, User } from '../types';
import { STAFF_CLASSES } from '../constants';

export const StaffManagement: React.FC = () => {
  const { staffList, addStaff, updateStaff, terminateStaff, deleteStaff, availablePositions, addPosition, removePosition, movePosition, currentUser } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [viewHistory, setViewHistory] = useState(false); // Toggle active/inactive

  // Helper to auto-assign role based on position
  const getRoleFromPosition = (pos: string): Role => {
    if (['Admin', 'Co-CEO', 'CEO', 'Manager'].includes(pos)) return Role.OWNER;
    return Role.STAFF; // Fulltime, Parttime default to STAFF
  };

  // Form State
  const initialFormState: Partial<User> = {
    username: '',
    password: '',
    name: '',
    role: Role.OWNER, // Default based on 'Admin' being first usually
    position: availablePositions[0] || 'Admin',
    staffClass: 'Trainee',
    startDate: new Date().toISOString().split('T')[0],
    isActive: true
  };
  const [formData, setFormData] = useState<Partial<User>>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');

  // Update role whenever position changes in form
  useEffect(() => {
    if (formData.position) {
        setFormData(prev => ({ ...prev, role: getRoleFromPosition(prev.position!) }));
    }
  }, [formData.position]);

  // Ensure form defaults to first available position if current is invalid/empty when positions load
  useEffect(() => {
    if (availablePositions.length > 0 && (!formData.position || !availablePositions.includes(formData.position))) {
       setFormData(prev => ({ ...prev, position: availablePositions[0] }));
    }
  }, [availablePositions]);

  // Permission Check for ACCESSING the page
  // Originally restricted to OWNER, but now Manager (who is OWNER role) can access.
  if (currentUser?.role !== Role.OWNER) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-stone-500">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-stone-700">Access Denied</h2>
        <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (Admin/Manager Only)</p>
      </div>
    );
  }

  const handleEditClick = (user: User) => {
    setFormData(user);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.username && formData.name && formData.password) {
      const finalRole = getRoleFromPosition(formData.position!);
      
      const userToSave = {
          ...formData,
          role: finalRole 
      };

      if (isEditing && formData.id) {
        // Update
        updateStaff(userToSave as User);
      } else {
        // Create
        addStaff({
          ...userToSave,
          id: `u-${Date.now()}`,
          isActive: true
        } as User);
      }
      setShowForm(false);
      setIsEditing(false);
      setFormData(initialFormState);
    } else {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    }
  };

  const handleTerminate = (user: User) => {
    if (confirm(`คุณต้องการเลิกจ้าง/ลบสิทธิ์การใช้งานของ ${user.name} ใช่หรือไม่?`)) {
      terminateStaff(user.id);
    }
  };
  
  const handleHardDelete = (user: User) => {
     if (confirm(`คำเตือน: คุณกำลังจะลบข้อมูลของ "${user.name}" อย่างถาวร!\n\nข้อมูลนี้จะไม่สามารถกู้คืนได้ คุณแน่ใจหรือไม่?`)) {
         deleteStaff(user.id);
     }
  };

  const handleAddPosition = () => {
    if (newPositionName.trim()) {
      addPosition(newPositionName.trim());
      setNewPositionName('');
    }
  };

  // PASSWORD VISIBILITY LOGIC
  const canViewPassword = (targetUser: User) => {
    const myPos = currentUser?.position || '';
    const targetPos = targetUser.position || '';

    const isSuperAdmin = ['Admin', 'Co-CEO'].includes(myPos);
    const isManager = ['CEO', 'Manager'].includes(myPos);
    
    const isTargetSuper = ['Admin', 'Co-CEO'].includes(targetPos);

    // 1. Admin/Co-CEO see everything
    if (isSuperAdmin) return true;

    // 2. Manager see everyone EXCEPT Admin/Co-CEO
    if (isManager) {
        return !isTargetSuper;
    }

    return false;
  };

  const activeStaff = staffList.filter(s => s.isActive);
  const inactiveStaff = staffList.filter(s => !s.isActive);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-stone-800 flex items-center gap-2">
            <Users className="text-red-600" /> จัดการพนักงาน
          </h2>
          <p className="text-stone-500 mt-1">เพิ่ม/ลบ และกำหนดสิทธิ์การเข้าใช้งาน</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowPositionModal(true)}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-stone-300"
          >
            <Settings size={20} /> จัดการตำแหน่งงาน
          </button>
          <button 
            onClick={() => {
              setFormData(initialFormState);
              setIsEditing(false);
              setShowForm(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-red-600/20"
          >
            <UserPlus size={20} /> เพิ่มพนักงานใหม่
          </button>
        </div>
      </div>

      {/* Toggle View */}
      <div className="flex gap-4 mb-4 border-b border-stone-200">
        <button 
          onClick={() => setViewHistory(false)}
          className={`pb-3 px-4 font-bold transition-all border-b-2 ${!viewHistory ? 'text-red-600 border-red-600' : 'text-stone-400 border-transparent hover:text-stone-600'}`}
        >
          พนักงานปัจจุบัน ({activeStaff.length})
        </button>
        <button 
          onClick={() => setViewHistory(true)}
          className={`pb-3 px-4 font-bold transition-all border-b-2 flex items-center gap-2 ${viewHistory ? 'text-stone-700 border-stone-700' : 'text-stone-400 border-transparent hover:text-stone-600'}`}
        >
          <History size={16} /> ประวัติพนักงานเก่า ({inactiveStaff.length})
        </button>
      </div>

      {/* Staff Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-red-900 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {isEditing ? <Edit size={20} /> : <UserPlus size={20} />}
                  {isEditing ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
                </h3>
                <button onClick={() => setShowForm(false)} className="hover:bg-red-800 p-1 rounded-full"><X /></button>
             </div>
             
             <form onSubmit={handleFormSubmit} className="p-6 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                   <h4 className="text-sm font-bold text-stone-400 uppercase mb-2 border-b pb-1">ข้อมูลเข้าสู่ระบบ</h4>
                </div>
                <div>
                   <label className="block text-sm font-bold text-stone-700 mb-1">Username (รหัสพนักงาน)</label>
                   <input 
                      className="w-full border border-stone-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none"
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      required
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-stone-700 mb-1">Password (รหัสผ่าน)</label>
                   <input 
                      type="text"
                      className="w-full border border-stone-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      required
                      placeholder="ตั้งรหัสผ่าน..."
                   />
                </div>

                <div className="col-span-2 mt-2">
                   <h4 className="text-sm font-bold text-stone-400 uppercase mb-2 border-b pb-1">ข้อมูลส่วนตัว & ตำแหน่ง</h4>
                </div>
                <div>
                   <label className="block text-sm font-bold text-stone-700 mb-1">ชื่อ-นามสกุล</label>
                   <input 
                      className="w-full border border-stone-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-stone-700 mb-1">ระดับพนักงาน (Class)</label>
                   <select 
                      className="w-full border border-stone-300 rounded-lg p-2.5 outline-none"
                      value={formData.staffClass}
                      onChange={e => setFormData({...formData, staffClass: e.target.value})}
                   >
                      {STAFF_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-bold text-stone-700 mb-1">ตำแหน่ง (Job Title)</label>
                   <select 
                      className="w-full border border-stone-300 rounded-lg p-2.5 outline-none"
                      value={formData.position}
                      onChange={e => setFormData({...formData, position: e.target.value})}
                   >
                      {availablePositions.length === 0 && <option>Loading...</option>}
                      {availablePositions.map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-bold text-stone-700 mb-1">วันที่เริ่มงาน</label>
                   <input 
                      type="date"
                      className="w-full border border-stone-300 rounded-lg p-2.5 outline-none"
                      value={formData.startDate}
                      onChange={e => setFormData({...formData, startDate: e.target.value})}
                   />
                </div>
                
                {/* System Role is now auto-assigned based on position, so UI is removed */}

                <div className="col-span-2 flex justify-end gap-3 mt-6 pt-4 border-t border-stone-100">
                   <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-lg text-stone-500 hover:bg-stone-100 font-bold">ยกเลิก</button>
                   <button type="submit" className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-green-600/20">
                     <Save size={18} /> บันทึกข้อมูล
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Position Management Modal */}
      {showPositionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold flex items-center gap-2"><Briefcase /> จัดการชื่อตำแหน่ง</h3>
                 <button onClick={() => setShowPositionModal(false)} className="text-stone-400 hover:text-stone-600"><X /></button>
              </div>
              <div className="flex gap-2 mb-4">
                 <input 
                   value={newPositionName}
                   onChange={e => setNewPositionName(e.target.value)}
                   placeholder="ชื่อตำแหน่งใหม่..."
                   className="flex-1 border border-stone-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
                 />
                 <button onClick={handleAddPosition} className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700"><Plus /></button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                 {availablePositions.map((pos, index) => (
                   <div key={pos} className="flex justify-between items-center p-3 bg-stone-50 rounded-lg border border-stone-100">
                      <span className="font-medium text-stone-700">{index + 1}. {pos}</span>
                      <div className="flex items-center gap-1">
                        <button 
                            onClick={() => movePosition(pos, 'up')}
                            disabled={index === 0}
                            className={`p-1 rounded hover:bg-stone-200 ${index === 0 ? 'text-stone-300' : 'text-stone-600'}`}
                        >
                            <ChevronUp size={16} />
                        </button>
                        <button 
                            onClick={() => movePosition(pos, 'down')}
                            disabled={index === availablePositions.length - 1}
                            className={`p-1 rounded hover:bg-stone-200 ${index === availablePositions.length - 1 ? 'text-stone-300' : 'text-stone-600'}`}
                        >
                            <ChevronDown size={16} />
                        </button>
                        <div className="w-px h-4 bg-stone-300 mx-1"></div>
                        <button onClick={() => removePosition(pos)} className="text-stone-400 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Staff List Table */}
      <div className="flex-1 bg-white rounded-xl shadow overflow-hidden border border-stone-200">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="p-4 font-bold text-stone-600">พนักงาน</th>
              <th className="p-4 font-bold text-stone-600">ตำแหน่ง (Job)</th>
              <th className="p-4 font-bold text-stone-600">ระดับ (Class)</th>
              {/* REMOVED ROLE COLUMN */}
              <th className="p-4 font-bold text-stone-600">Username/Pass</th>
              <th className="p-4 font-bold text-stone-600">วันที่เริ่มงาน</th>
              {viewHistory && <th className="p-4 font-bold text-stone-600">วันที่ออก</th>}
              <th className="p-4 text-center font-bold text-stone-600">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(viewHistory ? inactiveStaff : activeStaff).map(s => {
              const isVisible = canViewPassword(s);
              return (
              <tr key={s.id} className="hover:bg-stone-50 group transition-colors">
                <td className="p-4">
                   <div className="font-bold text-stone-800">{s.name}</div>
                   <div className="text-xs text-stone-400">ID: {s.id}</div>
                </td>
                <td className="p-4 text-stone-600 font-medium">{s.position}</td>
                <td className="p-4">
                   <span className="bg-stone-100 text-stone-600 px-2 py-1 rounded text-xs font-bold border border-stone-200">{s.staffClass}</span>
                </td>
                {/* REMOVED ROLE CELL */}
                <td className="p-4 text-sm">
                   <div className="font-mono text-stone-600">{s.username}</div>
                   <div className="font-mono text-stone-400 text-xs flex items-center gap-1">
                      Pass: {isVisible ? s.password : '********'}
                      {isVisible ? <Eye size={10} className="text-stone-300"/> : <EyeOff size={10} className="text-stone-300"/>}
                   </div>
                </td>
                <td className="p-4 text-sm text-stone-600">{s.startDate}</td>
                {viewHistory && <td className="p-4 text-sm text-red-600 font-bold">{s.endDate || '-'}</td>}
                
                <td className="p-4 text-center">
                  {!viewHistory ? (
                  <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                     <button 
                       onClick={() => handleEditClick(s)}
                       className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:shadow-sm transition-all" 
                       title="แก้ไขข้อมูล"
                     >
                        <Edit size={16} />
                     </button>
                     {s.id !== 'u_admin' && ( // Prevent deleting main admin
                       <button 
                         onClick={() => handleTerminate(s)}
                         className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:shadow-sm transition-all" 
                         title="เลิกจ้าง/ลบสิทธิ์"
                       >
                          <UserX size={16} />
                       </button>
                     )}
                  </div>
                  ) : (
                      // INACTIVE STAFF ACTIONS (Restore / Hard Delete)
                      <div className="flex justify-center gap-2">
                        <span className="text-xs text-stone-400 self-center mr-2">Inactive</span>
                        <button 
                           onClick={() => handleHardDelete(s)}
                           className="p-2 bg-stone-100 text-stone-500 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                           title="ลบถาวร (Hard Delete)"
                        >
                            <Trash2 size={16} />
                        </button>
                      </div>
                  )}
                </td>
              </tr>
            )})}
            {(viewHistory ? inactiveStaff : activeStaff).length === 0 && (
               <tr>
                 <td colSpan={7} className="p-8 text-center text-stone-400 bg-stone-50/50">
                    ไม่พบข้อมูลพนักงาน
                 </td>
               </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};