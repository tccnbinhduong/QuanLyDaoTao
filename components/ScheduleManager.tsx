import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { checkConflict, calculateSubjectProgress, getSessionFromPeriod, parseLocal, determineStatus, getSessionSequenceInfo } from '../utils';
import { ScheduleItem, ScheduleStatus } from '../types';
import { format, addDays, isSameDay, getWeek } from 'date-fns';
import vi from 'date-fns/locale/vi';
import { Calendar as CalendarIcon, Plus, ChevronRight, ChevronLeft, AlertCircle, Save, Trash2, Edit2, FileSpreadsheet, ListFilter, X, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const DAYS_OF_WEEK = [
  { label: 'Thứ 2', val: 1 },
  { label: 'Thứ 3', val: 2 },
  { label: 'Thứ 4', val: 3 },
  { label: 'Thứ 5', val: 4 },
  { label: 'Thứ 6', val: 5 },
  { label: 'Thứ 7', val: 6 },
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const ScheduleManager: React.FC = () => {
  const { schedules, classes, teachers, subjects, addSchedule, updateSchedule, deleteSchedule } = useApp();
  
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [viewDate, setViewDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<ScheduleItem | null>(null);
  
  // State for Drag and Drop
  const [draggedItem, setDraggedItem] = useState<ScheduleItem | null>(null);

  // Form State
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formType, setFormType] = useState<'class' | 'exam'>('class');
  const [formRoom, setFormRoom] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formStartPeriod, setFormStartPeriod] = useState(1);
  const [formPeriodCount, setFormPeriodCount] = useState(3);
  const [formError, setFormError] = useState('');

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
  };

  // Derived state
  const weekStart = getStartOfWeek(viewDate);
  const weekDays = DAYS_OF_WEEK.map((d, i) => addDays(weekStart, i));
  const weekNumber = getWeek(viewDate);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => s.classId === selectedClassId);
  }, [schedules, selectedClassId]);

  // Filter subjects based on the selected class's major
  const availableSubjects = useMemo(() => {
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return subjects; 
    
    // Only return subjects that match the class's majorId
    return subjects.filter(s => s.majorId === currentClass.majorId);
  }, [subjects, classes, selectedClassId]);

  // Reset form subject when available subjects change (i.e. class changes) and current selection is invalid
  useEffect(() => {
    if (formSubjectId && !availableSubjects.some(s => s.id === formSubjectId)) {
      setFormSubjectId('');
    }
  }, [availableSubjects, formSubjectId]);

  const handlePrevWeek = () => setViewDate(addDays(viewDate, -7));
  const handleNextWeek = () => setViewDate(addDays(viewDate, 7));

  const resetForm = () => {
    setFormTeacherId('');
    setFormSubjectId('');
    setFormRoom('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormStartPeriod(1);
    setFormPeriodCount(3);
    setFormError('');
    setEditItem(null);
    setFormType('class');
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, item: ScheduleItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "copy";
    // Optional: Set a custom drag image or data if needed
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allows dropping
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date, targetPeriod: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const targetDateStr = format(targetDate, 'yyyy-MM-dd');

    // Avoid copying to the exact same slot
    if (draggedItem.date === targetDateStr && draggedItem.startPeriod === targetPeriod) {
        setDraggedItem(null);
        return;
    }

    // Create new item based on dragged item
    const newItem = {
        type: draggedItem.type,
        teacherId: draggedItem.teacherId,
        subjectId: draggedItem.subjectId,
        classId: draggedItem.classId,
        roomId: draggedItem.roomId,
        date: targetDateStr,
        session: getSessionFromPeriod(targetPeriod),
        startPeriod: targetPeriod,
        periodCount: draggedItem.periodCount,
    };

    // Check conflicts
    const conflict = checkConflict(newItem, schedules); 
    if (conflict.hasConflict) {
        alert(`Không thể sao chép: ${conflict.message}`);
    } else {
        addSchedule(newItem);
    }
    setDraggedItem(null);
  };

  const handleSaveSchedule = () => {
    // Determine values based on whether we are editing or creating
    const teacherId = editItem ? editItem.teacherId : formTeacherId;
    const subjectId = editItem ? editItem.subjectId : formSubjectId;
    const roomId = editItem ? editItem.roomId : formRoom;
    const classId = editItem ? editItem.classId : selectedClassId;
    const type = editItem ? editItem.type : formType;
    const date = editItem ? editItem.date : formDate;
    const startPeriod = editItem ? editItem.startPeriod : formStartPeriod;
    const periodCount = editItem ? editItem.periodCount : formPeriodCount;

    if (!teacherId || !subjectId || !roomId || !classId) {
      setFormError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const newItem = {
      type,
      teacherId,
      subjectId,
      classId,
      roomId,
      date,
      session: getSessionFromPeriod(startPeriod),
      startPeriod,
      periodCount,
    };

    const conflict = checkConflict(newItem, schedules, editItem?.id);
    if (conflict.hasConflict) {
      setFormError(conflict.message);
      return;
    }

    if (editItem) {
      updateSchedule(editItem.id, newItem);
    } else {
      addSchedule(newItem);
    }
    
    setShowAddModal(false);
    resetForm();
  };

  const handleContinueNextWeek = () => {
    // Logic: Copy current week's schedule to next week if subjects not finished
    // Sort chronologically to handle multi-session subjects correctly for "remaining" calculation
    const currentWeekSchedules = filteredSchedules.filter(s => {
       const d = parseLocal(s.date);
       return d >= weekStart && d < addDays(weekStart, 6);
    }).sort((a, b) => {
        const da = parseLocal(a.date).getTime();
        const db = parseLocal(b.date).getTime();
        if (da !== db) return da - db;
        return a.startPeriod - b.startPeriod;
    });

    let addedCount = 0;
    let warnings: string[] = [];
    
    // Track extra periods scheduled in this batch to adjust "remaining" calculation dynamically
    // Key: subjectId-classId
    const addedPeriodsMap: Record<string, number> = {};

    currentWeekSchedules.forEach(item => {
      // Skip exams - only continue regular classes
      if (item.type === 'exam') return;

      const subject = subjects.find(s => s.id === item.subjectId);
      if (!subject) return;

      // Uniquely identify the subject enrollment
      const key = `${item.subjectId}-${item.classId}`;
      const previouslyAdded = addedPeriodsMap[key] || 0;

      const progress = calculateSubjectProgress(item.subjectId, item.classId, subject.totalPeriods, schedules);
      
      // Real remaining periods considering what we've already scheduled in this loop
      const currentRemaining = progress.remaining - previouslyAdded;
      
      // If remaining periods > 0, schedule next week
      if (currentRemaining > 0) {
        const nextDate = addDays(parseLocal(item.date), 7);
        const newDateStr = format(nextDate, 'yyyy-MM-dd');
        
        // Check if next week already has this slot filled (basic idempotent check)
        const exists = schedules.some(s => 
          s.classId === item.classId && 
          s.date === newDateStr && 
          s.startPeriod === item.startPeriod
        );

        if (!exists) {
          // Adjust period count if remaining is less than usual (Cap at currentRemaining)
          const periodsToTeach = Math.min(item.periodCount, currentRemaining);
          
          const newItem = {
            ...item,
            date: newDateStr,
            periodCount: periodsToTeach,
            status: ScheduleStatus.PENDING
          };
          
          // Conflict check for next week
          const conflict = checkConflict(newItem, schedules);
          if (!conflict.hasConflict) {
            addSchedule(newItem);
            addedCount++;
            addedPeriodsMap[key] = previouslyAdded + periodsToTeach;
          }
        }
      }
      
      // Check warning condition based on final remaining after potential add
      const finalRemaining = progress.remaining - (addedPeriodsMap[key] || 0);
      if (finalRemaining <= 4 && finalRemaining > 0) {
         const msg = `Môn ${subject.name} sắp kết thúc (còn ${finalRemaining} tiết)`;
         if (!warnings.includes(msg)) warnings.push(msg);
      }
    });

    if (warnings.length > 0) {
      alert(`Đã sao chép lịch!\n\nCảnh báo:\n${warnings.join('\n')}`);
    } else {
      alert(`Đã sao chép ${addedCount} buổi học sang tuần sau.`);
    }
    handleNextWeek();
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const data: any[] = [];
    
    // 1. Header Row
    const header = ['Buổi', 'Tiết', ...weekDays.map(d => format(d, 'EEEE - dd/MM', { locale: vi }).toUpperCase())];
    data.push(header);

    // 2. Data Rows (Periods 1-10)
    PERIODS.forEach(p => {
        // Buổi Label (Only for row 1 and 6, others empty for merge)
        const sessionName = p === 1 ? 'Sáng' : (p === 6 ? 'Chiều' : '');
        
        const rowData: any[] = [
             sessionName,
             p
        ];

        weekDays.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const item = filteredSchedules.find(s => s.date === dateStr && s.startPeriod <= p && (s.startPeriod + s.periodCount) > p);
            
            if (item) {
                // Only write content if it's the starting period of the class
                if (item.startPeriod === p) {
                    const subj = subjects.find(s => s.id === item.subjectId);
                    const tea = teachers.find(t => t.id === item.teacherId);
                    const seqInfo = getSessionSequenceInfo(item, schedules, subj?.totalPeriods);
                    const displayCumulative = Math.min(seqInfo.cumulative, subj?.totalPeriods || seqInfo.cumulative);

                    let cellText = `${subj?.name}`;
                    if (item.status === ScheduleStatus.OFF) cellText += ` (NGHỈ)`;
                    else if (item.type === 'exam') cellText = `THI: ${subj?.name}`;
                    
                    cellText += `\nGV: ${tea?.name}`;
                    cellText += `\nPH: ${item.roomId}`;
                    cellText += `\nTiết: ${displayCumulative}/${subj?.totalPeriods}`;
                    
                    rowData.push(cellText);
                } else {
                    rowData.push(null); // Return null to indicate merged cell coverage
                }
            } else {
                rowData.push('');
            }
        });
        data.push(rowData);
    });

    // 3. Footer (Legend)
    data.push([]); // Empty row
    const footer1 = ["Sáng:", "", "Tiết 1: 7h30 - 8h15   Tiết 2: 8h15 - 9h00   Ra chơi: 30 phút   Tiết 3: 9h30 - 10h15   Tiết 4: 10h15 - 11h00"];
    const footer2 = ["Chiều:", "", "Tiết 1: 13h15 - 14h00   Tiết 2: 14h00 - 14h45   Ra chơi: 15 phút   Tiết 3: 15h00 - 15h45   Tiết 4: 15h45 - 16h30"];
    
    data.push(footer1);
    data.push(footer2);

    const ws = XLSX.utils.aoa_to_sheet(data);

    // 4. Styling & Merges
    if(!ws['!merges']) ws['!merges'] = [];
    
    // Merge "Buổi" column (Sáng: rows 1-5, Chiều: rows 6-10)
    // Note: Data array index starts at 0 (Header). So Row 1 (Period 1) is index 1.
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 5, c: 0 } }); // Sáng
    ws['!merges'].push({ s: { r: 6, c: 0 }, e: { r: 10, c: 0 } }); // Chiều

    // Merge Footer Legend Text
    // Footer starts after: Header (1) + 10 periods + 1 empty row = Index 12
    const footerRowStart = 12;
    ws['!merges'].push({ s: { r: footerRowStart, c: 2 }, e: { r: footerRowStart, c: 7 } }); // Merge Mon-Sat cols for footer text
    ws['!merges'].push({ s: { r: footerRowStart + 1, c: 2 }, e: { r: footerRowStart + 1, c: 7 } });

    // Set Column Widths
    ws['!cols'] = [
        { wch: 8 },  // Col A: Buổi
        { wch: 5 },  // Col B: Tiết
        { wch: 25 }, // Mon
        { wch: 25 }, // Tue
        { wch: 25 }, // Wed
        { wch: 25 }, // Thu
        { wch: 25 }, // Fri
        { wch: 25 }, // Sat
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Lịch Học");
    XLSX.writeFile(wb, `Lich_Hoc_${classes.find(c => c.id === selectedClassId)?.name}_Tuan_${weekNumber}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
           <ListFilter size={20} className="text-gray-500" />
           <select 
             className="border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             value={selectedClassId}
             onChange={(e) => setSelectedClassId(e.target.value)}
           >
             {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.studentCount} SV)</option>)}
           </select>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
          <div className="text-center">
            <p className="font-bold text-lg">Tuần {weekNumber}</p>
            <p className="text-xs text-gray-500">
                {format(weekStart, 'dd/MM')} - {format(addDays(weekStart, 6), 'dd/MM/yyyy')}
            </p>
          </div>
          <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight /></button>
        </div>

        <div className="flex gap-2">
            <button 
                onClick={handleContinueNextWeek}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
            >
                <CalendarIcon size={16} /> Tiếp tục lịch tuần sau
            </button>
            <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
            >
                <FileSpreadsheet size={16} /> Xuất Excel
            </button>
            <button 
                onClick={() => { resetForm(); setShowAddModal(true); }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
                <Plus size={16} /> Thêm lịch
            </button>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm uppercase">
              <th className="border p-2 w-16">Buổi</th>
              <th className="border p-2 w-12">Tiết</th>
              {weekDays.map(d => (
                <th key={d.toString()} className="border p-2 min-w-[140px]">
                  <div className={`text-center ${isSameDay(d, new Date()) ? 'text-blue-600 font-bold' : ''}`}>
                    <div>{format(d, 'EEEE', { locale: vi })}</div>
                    <div className="text-xs font-normal text-gray-500">{format(d, 'dd/MM')}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm">
             {PERIODS.map((period, index) => {
               const isStartOfSession = period === 1 || period === 6;
               return (
                 <tr key={period} className="hover:bg-gray-50">
                   {isStartOfSession && (
                     <td rowSpan={5} className="border p-2 text-center font-bold bg-gray-50 writing-mode-vertical">
                       {getSessionFromPeriod(period)}
                     </td>
                   )}
                   <td className="border p-2 text-center font-semibold text-gray-500">{period}</td>
                   {weekDays.map(day => {
                     const dateStr = format(day, 'yyyy-MM-dd');
                     // Find item starting at this period
                     const item = filteredSchedules.find(s => s.date === dateStr && s.startPeriod === period);
                     // Find item covering this period (for rowspan logic visualization or skipping)
                     const coveringItem = filteredSchedules.find(s => s.date === dateStr && s.startPeriod < period && (s.startPeriod + s.periodCount) > period);

                     if (coveringItem) return null; // Skip cell if covered by previous row

                     if (!item) {
                       return (
                         <td 
                            key={day.toString()} 
                            className="border p-1 hover:bg-gray-100 transition-colors"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, day, period)}
                         />
                       );
                     }

                     const subject = subjects.find(s => s.id === item.subjectId);
                     const teacher = teachers.find(t => t.id === item.teacherId);
                     const seqInfo = getSessionSequenceInfo(item, schedules, subject?.totalPeriods);
                     const displayCumulative = Math.min(seqInfo.cumulative, subject?.totalPeriods || seqInfo.cumulative);
                     
                     // Calculate Display Status
                     const computedStatus = determineStatus(item.date, item.startPeriod, item.status);

                     let bgColor = 'bg-blue-50 border-l-4 border-blue-500';
                     if (item.type === 'class') {
                        if (seqInfo.isFirst) bgColor = 'bg-orange-100 border-l-4 border-orange-500';
                        else if (seqInfo.isLast) bgColor = 'bg-red-100 border-l-4 border-red-500';
                     }
                     if (item.type === 'exam') bgColor = 'bg-yellow-50 border-l-4 border-yellow-500';
                     if (computedStatus === ScheduleStatus.OFF) bgColor = 'bg-gray-200 border-l-4 border-gray-500 opacity-70';
                     if (computedStatus === ScheduleStatus.MAKEUP) bgColor = 'bg-purple-50 border-l-4 border-purple-500';

                     return (
                       <td 
                         key={day.toString()} 
                         rowSpan={item.periodCount} 
                         className="border p-1 align-top relative group cursor-pointer hover:brightness-95 transition" 
                         onClick={() => { setEditItem(item); setShowAddModal(true); }}
                         draggable="true"
                         onDragStart={(e) => handleDragStart(e, item)}
                       >
                         <div className={`h-full w-full p-2 rounded text-xs ${bgColor} flex flex-col justify-between ${draggedItem?.id === item.id ? 'opacity-50' : ''}`}>
                           <div>
                             <div className="font-bold text-gray-800 text-sm mb-1">{subject?.name}</div>
                             <div className="text-gray-600 mb-0.5"><span className="font-semibold">GV:</span> {teacher?.name}</div>
                             <div className="text-gray-600 mb-0.5"><span className="font-semibold">Phòng:</span> {item.roomId}</div>
                             {item.type === 'class' && (
                                <div className="text-gray-500 italic">Tiến độ: {displayCumulative}/{subject?.totalPeriods}</div>
                             )}
                           </div>
                           <div className="mt-2 pt-2 border-t border-black/10 flex justify-between items-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-white 
                                ${computedStatus === ScheduleStatus.COMPLETED ? 'bg-green-500' : 
                                  computedStatus === ScheduleStatus.PENDING ? 'bg-blue-400' :
                                  computedStatus === ScheduleStatus.ONGOING ? 'bg-orange-500' :
                                  computedStatus === ScheduleStatus.OFF ? 'bg-gray-500' : 'bg-purple-500'
                                }`}>
                                {computedStatus}
                              </span>
                           </div>
                         </div>
                       </td>
                     );
                   })}
                 </tr>
               );
             })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">{editItem ? 'Điều chỉnh lịch' : 'Thêm lịch mới'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-red-500"><X /></button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && (
                 <div className="bg-red-50 text-red-600 p-3 rounded flex items-center text-sm">
                   <AlertCircle size={16} className="mr-2" /> {formError}
                 </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Loại lịch</label>
                    <select value={editItem ? editItem.type : formType} onChange={(e) => !editItem && setFormType(e.target.value as any)} disabled={!!editItem} className="w-full border rounded p-2">
                        <option value="class">Lịch học</option>
                        <option value="exam">Lịch thi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Lớp học</label>
                    <input type="text" value={classes.find(c => c.id === selectedClassId)?.name} disabled className="w-full border rounded p-2 bg-gray-100" />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium mb-1">Ngày dạy</label>
                    <input type="date" value={editItem ? editItem.date : formDate} onChange={(e) => editItem ? setEditItem({...editItem, date: e.target.value}) : setFormDate(e.target.value)} className="w-full border rounded p-2" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Giáo viên</label>
                    <select value={editItem ? editItem.teacherId : formTeacherId} onChange={(e) => editItem ? setEditItem({...editItem, teacherId: e.target.value}) : setFormTeacherId(e.target.value)} className="w-full border rounded p-2">
                        <option value="">Chọn giáo viên...</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Môn học</label>
                <select value={editItem ? editItem.subjectId : formSubjectId} onChange={(e) => editItem ? setEditItem({...editItem, subjectId: e.target.value}) : setFormSubjectId(e.target.value)} className="w-full border rounded p-2">
                    <option value="">Chọn môn học...</option>
                    {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.totalPeriods} tiết)</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tiết bắt đầu</label>
                    <select value={editItem ? editItem.startPeriod : formStartPeriod} onChange={(e) => editItem ? setEditItem({...editItem, startPeriod: Number(e.target.value)}) : setFormStartPeriod(Number(e.target.value))} className="w-full border rounded p-2">
                        {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                   <div>
                    <label className="block text-sm font-medium mb-1">Số tiết</label>
                    <input type="number" min="1" max="5" value={editItem ? editItem.periodCount : formPeriodCount} onChange={(e) => {
                      let val = Number(e.target.value);
                      const subjId = editItem ? editItem.subjectId : formSubjectId;
                      const type = editItem ? editItem.type : formType;

                      if (type === 'class' && subjId) {
                           const subject = subjects.find(s => s.id === subjId);
                           if (subject) {
                               const used = schedules.filter(s =>
                                  s.subjectId === subjId &&
                                  s.classId === selectedClassId &&
                                  s.status !== ScheduleStatus.OFF &&
                                  (editItem ? s.id !== editItem.id : true)
                               ).reduce((acc, curr) => acc + curr.periodCount, 0);

                               const remaining = Math.max(0, subject.totalPeriods - used);
                               if (val > remaining) {
                                   alert(`Môn học chỉ còn ${remaining} tiết`);
                                   val = remaining;
                               }
                           }
                      }

                      if (editItem) setEditItem({...editItem, periodCount: val});
                      else setFormPeriodCount(val);
                    }} className="w-full border rounded p-2" />
                  </div>
                   <div>
                    <label className="block text-sm font-medium mb-1">Phòng học</label>
                    <input type="text" value={editItem ? editItem.roomId : formRoom} onChange={(e) => editItem ? setEditItem({...editItem, roomId: e.target.value}) : setFormRoom(e.target.value)} className="w-full border rounded p-2" />
                  </div>
              </div>

              {editItem && (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <label className="block text-sm font-bold mb-2 text-yellow-800">Trạng thái & Điều chỉnh</label>
                      <div className="flex flex-wrap gap-2">
                          {Object.values(ScheduleStatus).map(status => (
                              <button 
                                key={status}
                                onClick={() => updateSchedule(editItem.id, { status })}
                                className={`px-2 py-1 rounded text-xs border ${editItem.status === status ? 'bg-yellow-500 text-white border-yellow-600' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                              >
                                  {status}
                              </button>
                          ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                          *Chọn "Nghỉ" để đánh dấu buổi nghỉ. Chọn "Tiết bổ sung" cho lịch bù.
                      </p>
                  </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between">
              {editItem ? (
                 <button onClick={() => { deleteSchedule(editItem.id); setShowAddModal(false); }} className="text-red-600 hover:bg-red-50 px-3 py-2 rounded flex items-center">
                    <Trash2 size={16} className="mr-1" /> Xóa
                 </button>
              ) : <div></div>}
              
              <div className="flex gap-2">
                  <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Hủy</button>
                  <button onClick={handleSaveSchedule} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center">
                    <Save size={16} className="mr-2" /> Lưu
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;