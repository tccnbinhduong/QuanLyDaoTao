import { ScheduleItem, ScheduleStatus } from './types';
import { isSameDay } from 'date-fns';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const getSessionFromPeriod = (startPeriod: number): 'Sáng' | 'Chiều' | 'Tối' => {
  if (startPeriod <= 5) return 'Sáng';
  if (startPeriod <= 10) return 'Chiều';
  return 'Tối';
};

// Helper for parsing YYYY-MM-DD to Local Date
export const parseLocal = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Conflict Checker
export const checkConflict = (
  newItem: Omit<ScheduleItem, 'id' | 'status'>,
  existingItems: ScheduleItem[],
  excludeId?: string
): { hasConflict: boolean; message: string } => {
  const newItemEnd = newItem.startPeriod + newItem.periodCount;

  for (const item of existingItems) {
    if (excludeId && item.id === excludeId) continue;
    if (item.status === ScheduleStatus.OFF) continue; // Ignored cancelled classes

    if (isSameDay(parseLocal(item.date), parseLocal(newItem.date))) {
      const itemEnd = item.startPeriod + item.periodCount;
      
      // Check time overlap
      // (StartA < EndB) and (EndA > StartB)
      const overlap = (newItem.startPeriod < itemEnd) && (newItemEnd > item.startPeriod);

      if (overlap) {
        if (item.roomId === newItem.roomId) {
          return { hasConflict: true, message: `Trùng phòng học: ${item.roomId} đã có lớp.` };
        }
        if (item.teacherId === newItem.teacherId) {
          return { hasConflict: true, message: `Trùng giáo viên: GV này đang dạy lớp khác.` };
        }
        if (item.classId === newItem.classId) {
          return { hasConflict: true, message: `Trùng lịch học của lớp: Lớp này đang học môn khác.` };
        }
        // Specific check for exams vs class
        if (item.type === 'exam' && newItem.type === 'class' && item.classId === newItem.classId) {
             return { hasConflict: true, message: `Lớp có lịch thi vào giờ này.` };
        }
        if (item.type === 'class' && newItem.type === 'exam' && item.classId === newItem.classId) {
             return { hasConflict: true, message: `Lớp có lịch học vào giờ này.` };
        }
      }
    }
  }

  return { hasConflict: false, message: '' };
};

export const calculateSubjectProgress = (
  subjectId: string, 
  classId: string, 
  totalPeriods: number, 
  schedules: ScheduleItem[]
) => {
  const learned = schedules
    .filter(s => s.subjectId === subjectId && s.classId === classId && s.status !== ScheduleStatus.OFF)
    .reduce((acc, curr) => acc + curr.periodCount, 0);
  
  return {
    learned,
    total: totalPeriods,
    percentage: Math.min(100, Math.round((learned / totalPeriods) * 100)),
    remaining: Math.max(0, totalPeriods - learned)
  };
};

export const determineStatus = (dateStr: string, startPeriod: number, currentStatus: ScheduleStatus): ScheduleStatus => {
  // Logic to auto-update status based on time if user hasn't manually set it to OFF or MAKEUP or COMPLETED
  // Ideally this runs on load or interval. 
  // However, simpler approach: Return computed status only if current is PENDING or ONGOING
  
  if (currentStatus === ScheduleStatus.OFF || currentStatus === ScheduleStatus.MAKEUP) {
    return currentStatus;
  }

  const now = new Date();
  const classDate = parseLocal(dateStr);
  
  // Create Date objects for start/end time of class (Approximation)
  // Morning starts 7:00, periods are 45m.
  // Period 1: 7:00. Period 6 (Afternoon start): 13:00.
  const isAfternoon = startPeriod > 5;
  const startHour = isAfternoon ? 13 + (startPeriod - 6) : 7 + (startPeriod - 1);
  
  const classStartTime = new Date(classDate);
  classStartTime.setHours(startHour, 0, 0, 0);
  
  const classEndTime = new Date(classStartTime);
  classEndTime.setHours(startHour + 1, 0, 0, 0); // Approx duration

  if (now > classEndTime) return ScheduleStatus.COMPLETED;
  if (now >= classStartTime && now <= classEndTime) return ScheduleStatus.ONGOING;
  if (now < classStartTime) return ScheduleStatus.PENDING;

  return currentStatus;
};