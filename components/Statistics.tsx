import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { ScheduleStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { Download, AlertCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocal } from '../utils';

const Statistics: React.FC = () => {
  const { teachers, schedules, subjects, classes } = useApp();
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');

  // 1. Missed classes needing makeup
  const missedClasses = schedules.filter(s => s.status === ScheduleStatus.OFF);

  // 2. Teacher Stats
  const teacherStats = teachers.map(t => {
    const taught = schedules.filter(s => s.teacherId === t.id && (s.status === ScheduleStatus.COMPLETED || s.status === ScheduleStatus.ONGOING || s.status === ScheduleStatus.PENDING)); // Assuming pending also counts for planned hours
    const totalPeriods = taught.reduce((acc, curr) => acc + curr.periodCount, 0);
    return {
      name: t.name,
      periods: totalPeriods,
      income: totalPeriods * t.ratePerPeriod
    };
  });

  // 3. Subject Progress per Class
  const subjectStats = useMemo(() => {
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return [];

    // Filter subjects that belong to the class's major
    // Ideally we should have a curriculum table, but here we use majorId matching
    const classSubjects = subjects.filter(s => s.majorId === currentClass.majorId);

    return classSubjects.map(s => {
        // Calculate progress specifically for this class
        const relevantSchedules = schedules.filter(sch => 
            sch.subjectId === s.id && 
            sch.classId === selectedClassId && 
            sch.status !== ScheduleStatus.OFF
        );
        
        const learned = relevantSchedules.reduce((acc, curr) => acc + curr.periodCount, 0);
        
        return {
            name: s.name,
            total: s.totalPeriods, 
            learned: learned,
            remaining: Math.max(0, s.totalPeriods - learned)
        };
    });
  }, [subjects, schedules, classes, selectedClassId]);

  const exportTeacherReport = () => {
     const data = schedules
        .filter(s => s.status === ScheduleStatus.COMPLETED || s.status === ScheduleStatus.ONGOING)
        .map(s => ({
            'Ngày dạy': format(parseLocal(s.date), 'dd/MM/yyyy'),
            'Giáo viên': teachers.find(t => t.id === s.teacherId)?.name,
            'Môn học': subjects.find(sub => sub.id === s.subjectId)?.name,
            'Số tiết': s.periodCount,
            'Lớp': classes.find(c => c.id === s.classId)?.name || s.classId
        }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ThongKeGiangDay");
    XLSX.writeFile(wb, "Thong_Ke_Giang_Vien.xlsx");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Thống kê báo cáo</h1>

      {/* Quick Alert: Missed Classes */}
      {missedClasses.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="text-red-500 mt-1" />
          <div>
             <h3 className="font-bold text-red-700">Cần xếp lịch bù ({missedClasses.length} buổi)</h3>
             <ul className="text-sm text-red-600 mt-1 list-disc pl-4">
               {missedClasses.map(m => (
                 <li key={m.id}>
                    {m.date} - GV {teachers.find(t => t.id === m.teacherId)?.name} - Môn {subjects.find(s => s.id === m.subjectId)?.name} (Lớp {classes.find(c => c.id === m.classId)?.name})
                 </li>
               ))}
             </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teacher Chart */}
        <div className="bg-white p-6 rounded-xl shadow border">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700">Số tiết dạy theo Giáo viên</h3>
              <button onClick={exportTeacherReport} className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded flex items-center hover:bg-green-200">
                <Download size={14} className="mr-1"/> Xuất Excel
              </button>
           </div>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={teacherStats}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                 <YAxis />
                 <Tooltip />
                 <Bar dataKey="periods" fill="#3B82F6" name="Số tiết" />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Progress Chart */}
         <div className="bg-white p-6 rounded-xl shadow border">
           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
               <h3 className="font-bold text-gray-700">Tiến độ giảng dạy</h3>
               <div className="flex items-center gap-2">
                   <Filter size={16} className="text-gray-500"/>
                   <select 
                       className="border rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                       value={selectedClassId}
                       onChange={(e) => setSelectedClassId(e.target.value)}
                   >
                       {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
               </div>
           </div>
           
           {subjectStats.length > 0 ? (
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="learned" stackId="a" fill="#10B981" name="Đã học" />
                        <Bar dataKey="remaining" stackId="a" fill="#E5E7EB" name="Chưa học" />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
           ) : (
               <div className="h-64 flex items-center justify-center text-gray-400 italic">
                   Không có môn học nào cho lớp này (Ngành học chưa có môn).
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Statistics;