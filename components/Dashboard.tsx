import React, { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { BookOpen, Users, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import vi from 'date-fns/locale/vi';
import { parseLocal } from '../utils';

const Dashboard: React.FC = () => {
  const { subjects, teachers, schedules, classes } = useApp();
  const [today] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Helper for date comparison (reset time to 00:00:00)
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  // Filter today's schedules: Must be same day AND type 'class' (Exams excluded)
  const todaySchedules = schedules
    .filter(s => s.type === 'class' && isSameDay(parseLocal(s.date), today))
    .sort((a, b) => a.startPeriod - b.startPeriod);

  // Upcoming exams: type 'exam' AND date >= startOfToday (includes today)
  const upcomingExams = schedules
    .filter(s => s.type === 'exam' && parseLocal(s.date) >= startOfToday)
    .sort((a, b) => parseLocal(a.date).getTime() - parseLocal(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Tổng môn học</p>
            <p className="text-2xl font-bold">{subjects.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Tổng giáo viên</p>
            <p className="text-2xl font-bold">{teachers.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Lịch thi sắp tới</p>
            <p className="text-2xl font-bold">{upcomingExams.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Hôm nay</p>
            <p className="text-lg font-bold">{format(currentTime, 'HH:mm dd/MM', { locale: vi })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="mr-2 text-blue-500" size={20} />
            Lịch giảng dạy hôm nay
          </h2>
          {todaySchedules.length === 0 ? (
            <p className="text-gray-500 italic">Không có lịch học hôm nay.</p>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map(s => {
                const subj = subjects.find(sub => sub.id === s.subjectId);
                const tea = teachers.find(t => t.id === s.teacherId);
                const cls = classes.find(c => c.id === s.classId);
                
                return (
                  <div key={s.id} className="p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800">{subj?.name}</h3>
                        <p className="text-sm text-gray-600">GV: {tea?.name}</p>
                        <p className="text-sm text-gray-500">Lớp: {cls?.name} - Phòng: {s.roomId}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-white border">
                          Tiết {s.startPeriod} - {s.startPeriod + s.periodCount - 1}
                        </span>
                        <div className="mt-1 text-xs text-gray-500 font-medium">
                           {s.status}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="mr-2 text-yellow-500" size={20} />
            Lịch thi sắp tới
          </h2>
          {upcomingExams.length === 0 ? (
            <p className="text-gray-500 italic">Chưa có lịch thi.</p>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map(s => {
                const subj = subjects.find(sub => sub.id === s.subjectId);
                const cls = classes.find(c => c.id === s.classId);
                const isToday = isSameDay(parseLocal(s.date), today);
                
                return (
                  <div key={s.id} className={`flex items-center justify-between p-3 border rounded-lg shadow-sm hover:shadow-md transition ${isToday ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
                    <div>
                      <p className="font-bold text-gray-800">{subj?.name} {isToday && <span className="text-red-500 text-xs">(Hôm nay)</span>}</p>
                      <p className="text-sm text-gray-500">{cls?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-600">{format(parseLocal(s.date), 'dd/MM/yyyy')}</p>
                      <p className="text-xs text-gray-400">Phòng {s.roomId}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;