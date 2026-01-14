import React from 'react';
import { useStore } from '../services/StoreContext';
import { Activity, User as UserIcon, ChefHat, Utensils, CheckCircle, Clock } from 'lucide-react';
import { OrderStatus, User } from '../types';

const StaffCard: React.FC<{ staff: User }> = ({ staff }) => {
  const { orders, tables } = useStore();

  const getTableNumber = (tableId: string) => tables.find(t => t.id === tableId)?.number || '??';

  // Determine current activity based on orders
  let status: 'IDLE' | 'BUSY' = 'IDLE';
  let currentTask = '';
  let taskType = '';
  let statusColor = 'bg-green-100 text-green-700 border-green-200';
  let statusIcon = <CheckCircle size={14} />;

  // Check for cooking tasks (Chef)
  const cookingOrder = orders.find(o => o.status === OrderStatus.COOKING && o.chefName === staff.name);
  // Check for serving tasks (Server)
  const servingOrder = orders.find(o => o.status === OrderStatus.SERVING && o.serverName === staff.name);

  if (cookingOrder) {
    status = 'BUSY';
    taskType = 'Cooking';
    currentTask = `Order #${cookingOrder.id.slice(-4)} (Table ${getTableNumber(cookingOrder.tableId)})`;
    statusColor = 'bg-orange-100 text-orange-700 border-orange-200';
    statusIcon = <ChefHat size={14} />;
  } else if (servingOrder) {
    status = 'BUSY';
    taskType = 'Serving';
    currentTask = `Order #${servingOrder.id.slice(-4)} (Table ${getTableNumber(servingOrder.tableId)})`;
    statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
    statusIcon = <Utensils size={14} />;
  }

  // Visual distinction based on POSITION instead of Role
  const isManagement = ['Admin', 'Co-CEO', 'CEO', 'Manager'].includes(staff.position);
  const avatarColor = isManagement ? 'bg-purple-500' : 'bg-indigo-500';

  return (
    <div className={`bg-white p-5 rounded-xl border shadow-sm transition-all hover:shadow-md ${status === 'BUSY' ? 'border-stone-300' : 'border-stone-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
           <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-sm ${avatarColor}`}>
              {staff.name.charAt(0)}
           </div>
           <div>
              <h4 className="font-bold text-stone-800">{staff.name}</h4>
              <div className="text-xs text-stone-500">{staff.position}</div>
           </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${statusColor}`}>
           {statusIcon}
           <span>{status === 'IDLE' ? 'Standby' : taskType}</span>
        </div>
      </div>

      <div className="bg-stone-50 rounded-lg p-3 border border-stone-100 min-h-[80px]">
         {status === 'BUSY' ? (
            <div className="space-y-1">
               <div className="text-xs text-stone-400 uppercase font-bold tracking-wider">Current Task</div>
               <div className="font-medium text-stone-800 text-sm">{currentTask}</div>
               {cookingOrder && (
                  <div className="text-xs text-stone-500 truncate mt-1">
                     {cookingOrder.items.length} Items: {cookingOrder.items.map(i => i.name).join(', ')}
                  </div>
               )}
            </div>
         ) : (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 gap-1">
               <Clock size={20} />
               <span className="text-xs">Waiting for assignment</span>
            </div>
         )}
      </div>
      
      <div className="mt-3 flex justify-between items-center text-xs text-stone-400">
         <span>Class: {staff.staffClass}</span>
      </div>
    </div>
  );
};

export const StaffActivity: React.FC = () => {
  const { staffList, orders } = useStore();

  const activeStaff = staffList.filter(s => s.isActive);

  // Group staff by Position Logic
  const management = activeStaff.filter(s => ['Admin', 'Co-CEO', 'CEO', 'Manager'].includes(s.position));
  const operations = activeStaff.filter(s => !['Admin', 'Co-CEO', 'CEO', 'Manager'].includes(s.position));

  const activeCount = activeStaff.filter(s => {
      return orders.some(o => 
        (o.status === OrderStatus.COOKING && o.chefName === s.name) || 
        (o.status === OrderStatus.SERVING && o.serverName === s.name)
      );
  }).length;

  return (
    <div className="h-full flex flex-col">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-stone-800 flex items-center gap-2">
            <Activity className="text-red-600" /> Staff Activity Monitor
          </h2>
          <p className="text-stone-500 mt-1">Real-time tracking of staff status and tasks</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-stone-200 flex gap-4 text-sm font-bold text-stone-600">
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Standby: {activeStaff.length - activeCount}</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>Busy: {activeCount}</span>
           </div>
           <div className="flex items-center gap-2 border-l pl-4">
              <span className="w-2 h-2 rounded-full bg-stone-400"></span>
              <span>Total: {activeStaff.length}</span>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10 space-y-8">
         {/* Operations Team (Fulltime/Parttime) */}
         {operations.length > 0 && (
           <section>
              <h3 className="text-lg font-bold text-stone-700 mb-4 flex items-center gap-2 bg-stone-100 p-2 rounded-lg border border-stone-200">
                 <Utensils size={20} /> Operations Team (Fulltime / Parttime)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {operations.map(staff => <StaffCard key={staff.id} staff={staff} />)}
              </div>
           </section>
         )}

         {/* Management Team */}
         {management.length > 0 && (
           <section>
              <h3 className="text-lg font-bold text-stone-700 mb-4 flex items-center gap-2 bg-stone-100 p-2 rounded-lg border border-stone-200">
                 <UserIcon size={20} /> Management Team
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {management.map(staff => <StaffCard key={staff.id} staff={staff} />)}
              </div>
           </section>
         )}
      </div>
    </div>
  );
};