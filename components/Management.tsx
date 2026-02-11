import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Teacher, Subject, ClassEntity, ScheduleStatus } from '../types';
import { Plus, Trash2, Edit2, Download, Save, X, Filter, Search, Phone } from 'lucide-react';
import { format } from 'date-fns';
import vi from 'date-fns/locale/vi';
import { parseLocal } from '../utils';

const Management: React.FC = () => {
  const { 
    teachers, subjects, majors, classes, schedules,
    addTeacher, updateTeacher, deleteTeacher, 
    addSubject, updateSubject, deleteSubject, 
    addClass, updateClass, deleteClass 
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'teachers' | 'subjects' | 'classes'>('teachers');

  const [newTeacher, setNewTeacher] = useState<Partial<Teacher>>({});
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherSearch, setTeacherSearch] = useState('');

  const [newSubject, setNewSubject] = useState<Partial<Subject>>({});
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [filterMajorId, setFilterMajorId] = useState<string>('');

  const [newClass, setNewClass] = useState<Partial<ClassEntity>>({});
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // Handlers
  const handleSaveTeacher = () => {
    if (newTeacher.name) {
      const teacherData = {
          name: newTeacher.name,
          phone: newTeacher.phone || '',
          bank: newTeacher.bank || '',
          accountNumber: newTeacher.accountNumber || '',
          mainSubject: newTeacher.mainSubject || '',
          ratePerPeriod: newTeacher.ratePerPeriod || 0
      };

      if (editingTeacherId) {
        updateTeacher(editingTeacherId, teacherData);
        setEditingTeacherId(null);
      } else {
        addTeacher(teacherData as Teacher);
      }
      setNewTeacher({});
    }
  };

  const handleEditTeacher = (t: Teacher) => {
    setNewTeacher(t);
    setEditingTeacherId(t.id);
  };

  const handleCancelTeacher = () => {
    setNewTeacher({});
    setEditingTeacherId(null);
  }

  const handleSaveSubject = () => {
    const selectedMajor = newSubject.majorId || filterMajorId;

    if (newSubject.name && newSubject.totalPeriods && selectedMajor) {
       const subjectData: any = {
           name: newSubject.name,
           majorId: selectedMajor,
           totalPeriods: newSubject.totalPeriods || 0,
           teacher1: newSubject.teacher1 || '',
           phone1: newSubject.phone1 || '',
           teacher2: newSubject.teacher2 || '',
           phone2: newSubject.phone2 || '',
           teacher3: newSubject.teacher3 || '',
           phone3: newSubject.phone3 || '',
       };

      if (editingSubjectId) {
        updateSubject(editingSubjectId, subjectData);
        setEditingSubjectId(null);
      } else {
        addSubject(subjectData as Subject);
      }
      setNewSubject(filterMajorId ? { majorId: filterMajorId } : {});
    }
  };

  const handleEditSubject = (s: Subject) => {
    setNewSubject(s);
    setEditingSubjectId(s.id);
  }

  const handleCancelSubject = () => {
    setNewSubject(filterMajorId ? { majorId: filterMajorId } : {});
    setEditingSubjectId(null);
  }

  const handleSaveClass = () => {
    if (newClass.name && newClass.majorId) {
       const classData = {
          name: newClass.name,
          studentCount: newClass.studentCount || 0,
          majorId: newClass.majorId,
          schoolYear: newClass.schoolYear || ''
      };

      if (editingClassId) {
        updateClass(editingClassId, classData);
        setEditingClassId(null);
      } else {
        addClass(classData);
      }
      setNewClass({});
    }
  };

  const handleEditClass = (c: ClassEntity) => {
    setNewClass(c);
    setEditingClassId(c.id);
  }

  const handleCancelClass = () => {
    setNewClass({});
    setEditingClassId(null);
  }

  const downloadInvitation = (teacher: Teacher) => {
    const subject = subjects.find(s => s.id === teacher.mainSubject);
    const subjectName = subject?.name || 'Theo phân công';
    const teacherSchedules = schedules
      .filter(s => s.teacherId === teacher.id && s.subjectId === teacher.mainSubject && s.status !== ScheduleStatus.OFF)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let scheduleInfo = `<p><em>(Hiện chưa có lịch giảng dạy cụ thể trên hệ thống)</em></p>`;

    if (teacherSchedules.length > 0) {
      const firstSession = teacherSchedules[0];
      const date = parseLocal(firstSession.date);
      const dayOfWeek = format(date, 'EEEE', { locale: vi });
      const dateStr = format(date, 'dd/MM/yyyy');
      const className = classes.find(c => c.id === firstSession.classId)?.name || '...';
      const periods = Array.from({length: firstSession.periodCount}, (_, i) => firstSession.startPeriod + i).join(', ');

      scheduleInfo = `
        <div style="margin-top: 15px; border: 1px solid #ccc; padding: 10px;">
          <p><strong>THÔNG TIN LỊCH GIẢNG DẠY (Buổi đầu tiên):</strong></p>
          <ul style="list-style-type: none; padding-left: 0;">
            <li><strong>Thời gian:</strong> ${dayOfWeek}, ngày ${dateStr} (${firstSession.session})</li>
            <li><strong>Tiết học:</strong> ${periods}</li>
            <li><strong>Phòng học:</strong> ${firstSession.roomId}</li>
            <li><strong>Lớp:</strong> ${className}</li>
          </ul>
        </div>
      `;
    }

    const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Thư mời giảng dạy</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; }
        .header { text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 30px; }
        .content { margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="header"><h1>THƯ MỜI GIẢNG DẠY</h1></div>
      <div class="content">
        <p>Kính gửi: Thầy/Cô <strong>${teacher.name}</strong></p>
        <p>Trân trọng kính mời quý thầy/cô tham gia giảng dạy tại cơ sở đào tạo của chúng tôi.</p>
        <p><strong>Môn học:</strong> ${subjectName}</p>
        <p><strong>Thù lao:</strong> ${teacher.ratePerPeriod.toLocaleString()} VNĐ / tiết</p>
        ${scheduleInfo}
      </div>
      <br><br>
      <p style="text-align: right;"><strong>Đại diện Ban Đào Tạo</strong></p>
    </body>
    </html>
    `;
    
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Thu_Moi_${teacher.name.replace(/\s/g, '_')}.doc`; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-bold text-gray-800">Quản lý giảng dạy</h1>
       
       <div className="flex space-x-4 border-b overflow-x-auto">
         <button 
           className={`pb-2 px-4 whitespace-nowrap ${activeTab === 'teachers' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
           onClick={() => setActiveTab('teachers')}
         >
           Giáo viên
         </button>
         <button 
           className={`pb-2 px-4 whitespace-nowrap ${activeTab === 'subjects' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
           onClick={() => setActiveTab('subjects')}
         >
           Môn học
         </button>
         <button 
           className={`pb-2 px-4 whitespace-nowrap ${activeTab === 'classes' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
           onClick={() => setActiveTab('classes')}
         >
           Lớp
         </button>
       </div>

       {activeTab === 'teachers' && (
         <div className="space-y-4">
            <div className="bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4">
               <input placeholder="Họ tên" className="border p-2 rounded" value={newTeacher.name || ''} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} />
               <input placeholder="Điện thoại" className="border p-2 rounded" value={newTeacher.phone || ''} onChange={e => setNewTeacher({...newTeacher, phone: e.target.value})} />
               <input placeholder="Số tài khoản" className="border p-2 rounded" value={newTeacher.accountNumber || ''} onChange={e => setNewTeacher({...newTeacher, accountNumber: e.target.value})} />
               <input placeholder="Ngân hàng" className="border p-2 rounded" value={newTeacher.bank || ''} onChange={e => setNewTeacher({...newTeacher, bank: e.target.value})} />
               <input type="number" placeholder="Thù lao/tiết" className="border p-2 rounded" value={newTeacher.ratePerPeriod || ''} onChange={e => setNewTeacher({...newTeacher, ratePerPeriod: Number(e.target.value)})} />
               
               <div className="flex gap-2">
                 <button onClick={handleSaveTeacher} className={`flex-1 text-white p-2 rounded flex justify-center items-center ${editingTeacherId ? 'bg-orange-500' : 'bg-blue-600'}`}>
                   {editingTeacherId ? <><Save size={18} className="mr-1"/> Cập nhật</> : <><Plus size={18} className="mr-1"/> Thêm</>}
                 </button>
                 {editingTeacherId && (
                   <button onClick={handleCancelTeacher} className="bg-gray-300 text-gray-700 p-2 rounded">
                     <X size={18} />
                   </button>
                 )}
               </div>
            </div>

            <div className="bg-white p-3 rounded shadow border border-gray-100 flex items-center gap-3">
              <Search size={20} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm giáo viên theo tên..." 
                className="flex-1 outline-none text-sm"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
              />
              {teacherSearch && (
                <button onClick={() => setTeacherSearch('')} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="bg-white rounded shadow overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3">Họ tên</th>
                      <th className="p-3">Điện thoại</th>
                      <th className="p-3">Ngân hàng</th>
                      <th className="p-3">Thù lao</th>
                      <th className="p-3">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers
                      .filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase()))
                      .map(t => (
                      <tr key={t.id} className="border-t hover:bg-gray-50">
                        <td className="p-3">{t.name}</td>
                        <td className="p-3">{t.phone}</td>
                        <td className="p-3">{t.bank} - {t.accountNumber}</td>
                        <td className="p-3">{t.ratePerPeriod.toLocaleString()}</td>
                        <td className="p-3 flex space-x-2">
                           <button onClick={() => handleEditTeacher(t)} className="text-orange-500" title="Sửa"><Edit2 size={18} /></button>
                           <button onClick={() => deleteTeacher(t.id)} className="text-red-500" title="Xóa"><Trash2 size={18} /></button>
                           <button onClick={() => downloadInvitation(t)} className="text-blue-500" title="Xuất thư mời Word"><Download size={18} /></button>
                        </td>
                      </tr>
                    ))}
                    {teachers.filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase())).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400 italic">Không tìm thấy giáo viên nào.</td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
         </div>
       )}

       {activeTab === 'subjects' && (
         <div className="space-y-4">
             <div className="bg-white p-4 rounded shadow flex items-center gap-3 border border-blue-100">
                 <Filter size={20} className="text-blue-600" />
                 <span className="font-semibold text-gray-700">Lọc theo ngành:</span>
                 <select 
                   className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 flex-1 max-w-md bg-gray-50"
                   value={filterMajorId}
                   onChange={(e) => {
                     setFilterMajorId(e.target.value);
                     setNewSubject(prev => ({ ...prev, majorId: e.target.value }));
                   }}
                 >
                    <option value="">-- Tất cả các ngành --</option>
                    {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                 </select>
             </div>

             <div className="bg-white p-4 rounded shadow space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên môn học</label>
                    <input className="border p-2 rounded w-full" value={newSubject.name || ''} onChange={e => setNewSubject({...newSubject, name: e.target.value})} placeholder="Nhập tên môn..." />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngành</label>
                    <select 
                        className="border p-2 rounded w-full" 
                        value={newSubject.majorId || filterMajorId || ''} 
                        onChange={e => setNewSubject({...newSubject, majorId: e.target.value})}
                    >
                        <option value="">Chọn Ngành...</option>
                        {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tổng số tiết</label>
                    <input type="number" className="border p-2 rounded w-full" value={newSubject.totalPeriods || ''} onChange={e => setNewSubject({...newSubject, totalPeriods: Number(e.target.value)})} placeholder="0" />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                  <div className="space-y-2">
                     <p className="text-sm font-bold text-gray-600">Giáo viên phụ trách 1</p>
                     <input className="border p-2 rounded w-full text-sm" placeholder="Họ tên" value={newSubject.teacher1 || ''} onChange={e => setNewSubject({...newSubject, teacher1: e.target.value})} />
                     <div className="flex items-center">
                       <Phone size={14} className="text-gray-400 mr-2" />
                       <input className="border p-2 rounded w-full text-sm" placeholder="Số điện thoại" value={newSubject.phone1 || ''} onChange={e => setNewSubject({...newSubject, phone1: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <p className="text-sm font-bold text-gray-600">Giáo viên phụ trách 2</p>
                     <input className="border p-2 rounded w-full text-sm" placeholder="Họ tên" value={newSubject.teacher2 || ''} onChange={e => setNewSubject({...newSubject, teacher2: e.target.value})} />
                     <div className="flex items-center">
                       <Phone size={14} className="text-gray-400 mr-2" />
                       <input className="border p-2 rounded w-full text-sm" placeholder="Số điện thoại" value={newSubject.phone2 || ''} onChange={e => setNewSubject({...newSubject, phone2: e.target.value})} />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <p className="text-sm font-bold text-gray-600">Giáo viên phụ trách 3</p>
                     <input className="border p-2 rounded w-full text-sm" placeholder="Họ tên" value={newSubject.teacher3 || ''} onChange={e => setNewSubject({...newSubject, teacher3: e.target.value})} />
                     <div className="flex items-center">
                       <Phone size={14} className="text-gray-400 mr-2" />
                       <input className="border p-2 rounded w-full text-sm" placeholder="Số điện thoại" value={newSubject.phone3 || ''} onChange={e => setNewSubject({...newSubject, phone3: e.target.value})} />
                     </div>
                  </div>
               </div>
               
               <div className="flex justify-end gap-2 pt-2">
                 {editingSubjectId && (
                   <button onClick={handleCancelSubject} className="bg-gray-300 text-gray-700 p-2 rounded px-4">Hủy</button>
                 )}
                 <button onClick={handleSaveSubject} className={`text-white p-2 rounded px-6 flex items-center ${editingSubjectId ? 'bg-orange-500' : 'bg-green-600'}`}>
                   {editingSubjectId ? <><Save size={18} className="mr-1"/> Cập nhật</> : <><Plus size={18} className="mr-1"/> Thêm Môn học</>}
                 </button>
               </div>
            </div>

             <div className="bg-white rounded shadow overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3">Tên môn</th>
                      <th className="p-3">Ngành</th>
                      <th className="p-3">Tổng tiết</th>
                      <th className="p-3">GV Phụ trách</th>
                      <th className="p-3">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects
                      .filter(s => !filterMajorId || s.majorId === filterMajorId)
                      .map(s => (
                      <tr key={s.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium align-top">{s.name}</td>
                        <td className="p-3 align-top">{majors.find(m => m.id === s.majorId)?.name}</td>
                        <td className="p-3 align-top">{s.totalPeriods}</td>
                        <td className="p-3 text-sm text-gray-600 align-top">
                           {s.teacher1 && <div>1. {s.teacher1} - {s.phone1}</div>}
                           {s.teacher2 && <div>2. {s.teacher2} - {s.phone2}</div>}
                           {s.teacher3 && <div>3. {s.teacher3} - {s.phone3}</div>}
                           {!s.teacher1 && !s.teacher2 && !s.teacher3 && <span className="italic text-gray-400">Chưa cập nhật</span>}
                        </td>
                        <td className="p-3 flex space-x-2 align-top">
                           <button onClick={() => handleEditSubject(s)} className="text-orange-500" title="Sửa"><Edit2 size={18} /></button>
                           <button onClick={() => deleteSubject(s.id)} className="text-red-500" title="Xóa"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}
                    {subjects.filter(s => !filterMajorId || s.majorId === filterMajorId).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400 italic">Không có môn học nào {filterMajorId ? 'trong ngành này' : ''}.</td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
         </div>
       )}

       {activeTab === 'classes' && (
         <div className="space-y-4">
             <div className="bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-5 gap-4">
               <input placeholder="Tên lớp (25DC...)" className="border p-2 rounded md:col-span-2" value={newClass.name || ''} onChange={e => setNewClass({...newClass, name: e.target.value})} />
               <select className="border p-2 rounded" value={newClass.majorId || ''} onChange={e => setNewClass({...newClass, majorId: e.target.value})}>
                  <option value="">Chọn Ngành...</option>
                  {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
               </select>
               <div className="flex gap-2">
                 <input type="number" placeholder="Số lượng" className="border p-2 rounded w-1/2" value={newClass.studentCount || ''} onChange={e => setNewClass({...newClass, studentCount: Number(e.target.value)})} />
                 <input placeholder="Niên khóa" className="border p-2 rounded w-1/2" value={newClass.schoolYear || ''} onChange={e => setNewClass({...newClass, schoolYear: e.target.value})} />
               </div>
               
               <div className="flex gap-2">
                 <button onClick={handleSaveClass} className={`flex-1 text-white p-2 rounded flex justify-center items-center ${editingClassId ? 'bg-orange-500' : 'bg-purple-600'}`}>
                   {editingClassId ? <><Save size={18} className="mr-1"/> Cập nhật</> : <><Plus size={18} className="mr-1"/> Thêm</>}
                 </button>
                 {editingClassId && (
                   <button onClick={handleCancelClass} className="bg-gray-300 text-gray-700 p-2 rounded">
                     <X size={18} />
                   </button>
                 )}
               </div>
            </div>
             <div className="bg-white rounded shadow overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3">Tên lớp</th>
                      <th className="p-3">Ngành</th>
                      <th className="p-3">Số lượng</th>
                      <th className="p-3">Niên khóa</th>
                      <th className="p-3">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map(c => (
                      <tr key={c.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium">{c.name}</td>
                        <td className="p-3">{majors.find(m => m.id === c.majorId)?.name}</td>
                        <td className="p-3">{c.studentCount}</td>
                        <td className="p-3">{c.schoolYear}</td>
                        <td className="p-3 flex space-x-2">
                           <button onClick={() => handleEditClass(c)} className="text-orange-500" title="Sửa"><Edit2 size={18} /></button>
                           <button onClick={() => deleteClass(c.id)} className="text-red-500" title="Xóa"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
         </div>
       )}
    </div>
  );
};

export default Management;