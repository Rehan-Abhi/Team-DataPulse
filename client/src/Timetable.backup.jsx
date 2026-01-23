import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { auth } from './firebase';

const Timetable = () => {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    
    // New Slot Form State
    const [formData, setFormData] = useState({
        day: 'Monday',
        startTime: '',
        endTime: '',
        title: '',
        location: '',
        type: 'academic'
    });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayIndex = new Date().getDay(); 
    // JS getDay(): 0=Sun, 1=Mon. Adjust to match our array (0=Mon... 6=Sun)
    const currentDayName = days[todayIndex === 0 ? 6 : todayIndex - 1];
    const currentDateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const [slotsRes, attendanceRes] = await Promise.all([
                axios.get('http://localhost:5000/api/timetable', config),
                axios.get(`http://localhost:5000/api/attendance?date=${currentDateStr}`, config)
            ]);

            setSlots(slotsRes.data);
            setAttendanceHistory(attendanceRes.data);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlot = async (e) => {
        e.preventDefault();
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.post('http://localhost:5000/api/timetable', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            fetchData(); // Refresh
        } catch (error) {
            console.error("Error adding slot:", error);
            alert("Failed to add slot");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this slot?")) return;
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.delete(`http://localhost:5000/api/timetable/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error("Error deleting slot:", error);
        }
    };

    const markAttendance = async (timetableId, status) => {
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.post('http://localhost:5000/api/attendance', {
                timetableId,
                date: currentDateStr,
                status
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update local state without full refetch for snappiness? Or just refetch.
            fetchData();
        } catch (error) {
            console.error("Error marking attendance:", error);
        }
    };

    // Helper to check status for a specific slot today
    const getStatus = (slotId) => {
        const record = attendanceHistory.find(r => r.timetableId === slotId);
        return record ? record.status : 'pending';
    };

    if (loading) return <div className="p-8 text-center">Loading Timetable...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Weekly Timetable</h2>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    + Add Slot
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {days.map(day => (
                    <div key={day} className={`border rounded-lg p-2 min-h-[300px] ${day === currentDayName ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white'}`}>
                        <h3 className="font-semibold text-center mb-3 border-b pb-2 text-gray-700">{day}</h3>
                        <div className="space-y-3">
                            {slots.filter(s => s.day === day).map(slot => {
                                const status = getStatus(slot._id);
                                const isToday = day === currentDayName;
                                const isAcademic = slot.type === 'academic';

                                return (
                                    <div key={slot._id} className={`p-3 rounded-md text-sm shadow-sm relative group ${isAcademic ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-gray-800">{slot.title}</span>
                                            <button 
                                                onClick={() => handleDelete(slot._id)}
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                        <div className="text-gray-600 text-xs mt-1">{slot.startTime} - {slot.endTime}</div>
                                        {slot.location && <div className="text-gray-500 text-xs italic">{slot.location}</div>}
                                        
                                        {/* Attendance Controls - Only for Academic & Today */}
                                        {isAcademic && isToday && (
                                            <div className="mt-2 flex gap-1 justify-between">
                                                <div className="flex gap-1">
                                                    <button 
                                                        onClick={() => markAttendance(slot._id, 'present')}
                                                        className={`p-1 rounded ${status === 'present' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-green-200'}`}
                                                        title="Present"
                                                    >
                                                        ✅
                                                    </button>
                                                    <button 
                                                        onClick={() => markAttendance(slot._id, 'absent')}
                                                        className={`p-1 rounded ${status === 'absent' ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-red-200'}`}
                                                        title="Absent"
                                                    >
                                                        ❌
                                                    </button>
                                                    <button 
                                                        onClick={() => markAttendance(slot._id, 'cancelled')}
                                                        className={`p-1 rounded ${status === 'cancelled' ? 'bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                                                        title="Class Cancelled"
                                                    >
                                                        ⚠️
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {/* Status Badge for non-today views or if marked */}
                                        {isAcademic && status !== 'pending' && !isToday && (
                                            <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                                {status}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Add Timetable Slot</h3>
                        <form onSubmit={handleAddSlot} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Type</label>
                                <select 
                                    value={formData.type}
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                    className="w-full border rounded p-2"
                                >
                                    <option value="academic">Academic (Classes)</option>
                                    <option value="personal">Personal (Activity)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1">Title</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder={formData.type === 'academic' ? "Subject Name (e.g. Maths)" : "Activity (e.g. Gym)"}
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    className="w-full border rounded p-2"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Day</label>
                                    <select 
                                        value={formData.day}
                                        onChange={e => setFormData({...formData, day: e.target.value})}
                                        className="w-full border rounded p-2"
                                    >
                                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Room/Location</label>
                                    <input 
                                        type="text" 
                                        value={formData.location}
                                        onChange={e => setFormData({...formData, location: e.target.value})}
                                        className="w-full border rounded p-2"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Start Time</label>
                                    <input 
                                        type="time" 
                                        required 
                                        value={formData.startTime}
                                        onChange={e => setFormData({...formData, startTime: e.target.value})}
                                        className="w-full border rounded p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">End Time</label>
                                    <input 
                                        type="time" 
                                        required 
                                        value={formData.endTime}
                                        onChange={e => setFormData({...formData, endTime: e.target.value})}
                                        className="w-full border rounded p-2"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-500 hover:text-gray-700 font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                                >
                                    Save Slot
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timetable;
