import React, { useState, useRef } from 'react';
import { useApp } from '../store/AppContext';
import { Student } from '../types';
import { Plus, Trash2, Edit2, Upload, Save, X, Filter, User, HelpCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const StudentManager: React.FC = () => {
  const { classes, students, addStudent, updateStudent, deleteStudent, importStudents } = useApp();
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  
  const [showModal, setShowModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter students by selected class
  const filteredStudents = students.filter(s => s.classId === selectedClassId);
  const currentClass = classes.find(c => c.id === selectedClassId);

  const handleOpenAdd = () => {
    setFormData({ 
        classId: selectedClassId,
        name: '', dob: '', pob: '', fatherName: '', motherName: '', phone: '' 
    });
    setEditingStudentId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (student: Student) => {
    setFormData(student);
    setEditingStudentId(student.id);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.classId) {
        alert("Vui lòng nhập tên học sinh!");
        return;
    }

    const studentData: any = {
        name: formData.name,
        classId: formData.classId,
        dob: formData.dob || '',
        pob: formData.pob || '',
        fatherName: formData.fatherName || '',
        motherName: formData.motherName || '',
        phone: formData.phone || ''
    };

    if (editingStudentId) {
        updateStudent(editingStudentId, studentData);
    } else {
        addStudent(studentData);
    }
    setShowModal(false);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            
            if (!data || data.length < 2) {
                alert("File Excel rỗng hoặc không đúng định dạng!");
                return;
            }

            // Remove header row
            const rows = data.slice(1) as any[]; 
            
            // Map data to Student structure (Assumption: Col 0: Name, Col 1: DOB, Col 2: POB, Col 3: Father, Col 4: Mother, Col 5: Phone)
            const newStudents: Omit<Student, 'id'>[] = rows.map(row => ({
                classId: selectedClassId,
                name: row[0] || '',
                dob: row[1] ? String(row[1]) : '',
                pob: row[2] ? String(row[2]) : '',
                fatherName: row[3] ? String(row[3]) : '',
                motherName: row[4] ? String(row[4]) : '',
                phone: row[5] ? String(row[5]) : ''
            })).filter(s => s.name); // Filter empty rows

            if (newStudents.length > 0) {
                importStudents(newStudents);
                alert(`Đã nhập thành công ${newStudents.length} học sinh.`);
            } else {
                alert("Không tìm thấy dữ liệu hợp lệ trong file Excel.");
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file.");
        } finally {
             // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Quản lý Học sinh - Sinh viên</h1>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow border border-blue-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter size={20} className="text-blue-600" />
            <span className="font-semibold text-gray-700 whitespace-nowrap">Chọn lớp:</span>
            <select 
                className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 w-full md:min-w-[250px] bg-gray-50"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
            >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        </div>

        <div className="flex gap-2">
            <input 
                type="file" 
                accept=".xlsx, .xls" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
            />
            <button 
                onClick={handleImportClick}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
                <Upload size={18} /> Nhập Excel
            </button>
            <button 
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                <Plus size={18} /> Thêm mới
            </button>
        </div>
      </div>

      <div className="bg-blue-50 text-blue-800 p-3 rounded text-xs flex items-center border border-blue-200">
         <HelpCircle size={16} className="mr-2" />
         <span>Lưu ý file Excel nhập liệu: Dòng 1 là tiêu đề. Các cột theo thứ tự: <strong>Họ tên | Ngày sinh | Nơi sinh | Bố | Mẹ | Điện thoại</strong></span>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-700">Danh sách lớp: {currentClass?.name}</h2>
            <span className="text-sm text-gray-500">Sĩ số: {filteredStudents.length} / {currentClass?.studentCount}</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase">
                    <tr>
                        <th className="p-3 border-b">STT</th>
                        <th className="p-3 border-b">Họ tên</th>
                        <th className="p-3 border-b">Ngày sinh</th>
                        <th className="p-3 border-b">Nơi sinh</th>
                        <th className="p-3 border-b">Phụ huynh</th>
                        <th className="p-3 border-b">Liên hệ</th>
                        <th className="p-3 border-b text-center">Hành động</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {filteredStudents.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                                Chưa có học sinh nào trong lớp này. Hãy thêm mới hoặc nhập từ Excel.
                            </td>
                        </tr>
                    ) : (
                        filteredStudents.map((s, index) => (
                            <tr key={s.id} className="hover:bg-blue-50 transition">
                                <td className="p-3 text-center text-gray-500">{index + 1}</td>
                                <td className="p-3 font-medium text-gray-800">{s.name}</td>
                                <td className="p-3">{s.dob}</td>
                                <td className="p-3">{s.pob}</td>
                                <td className="p-3">
                                    <div className="text-xs">
                                        {s.fatherName && <div><span className="font-semibold text-gray-500">Bố:</span> {s.fatherName}</div>}
                                        {s.motherName && <div><span className="font-semibold text-gray-500">Mẹ:</span> {s.motherName}</div>}
                                    </div>
                                </td>
                                <td className="p-3 text-blue-600">{s.phone}</td>
                                <td className="p-3">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleOpenEdit(s)} className="p-1 text-orange-500 hover:bg-orange-100 rounded" title="Sửa">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => deleteStudent(s.id)} className="p-1 text-red-500 hover:bg-red-100 rounded" title="Xóa">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <User size={20} className="text-blue-600" />
                        {editingStudentId ? 'Cập nhật thông tin' : 'Thêm học sinh mới'}
                    </h3>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                            <input 
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={formData.name || ''} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="Nhập họ tên..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                            <input 
                                type="date"
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={formData.dob || ''} 
                                onChange={e => setFormData({...formData, dob: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nơi sinh</label>
                            <input 
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={formData.pob || ''} 
                                onChange={e => setFormData({...formData, pob: e.target.value})}
                                placeholder="Tỉnh/Thành phố..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên Bố</label>
                            <input 
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={formData.fatherName || ''} 
                                onChange={e => setFormData({...formData, fatherName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên Mẹ</label>
                            <input 
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={formData.motherName || ''} 
                                onChange={e => setFormData({...formData, motherName: e.target.value})}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại liên hệ</label>
                            <input 
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={formData.phone || ''} 
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                placeholder="Nhập số điện thoại..."
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Hủy</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                        <Save size={18} /> Lưu thông tin
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default StudentManager;