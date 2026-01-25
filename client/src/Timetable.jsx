import React, { useState, useEffect, useCallback } from 'react';
import { auth } from './firebase';
import api from './services/api';

const Timetable = () => {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    
    // Day Selection State
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayIndex = new Date().getDay(); 
    const currentDayName = days[todayIndex === 0 ? 6 : todayIndex - 1]; // 0=Sun -> 6
    const [activeDay, setActiveDay] = useState(currentDayName);
    
    const currentDateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // New Slot Form State
    const [formData, setFormData] = useState({
        day: currentDayName,
        startTime: '',
        endTime: '',
        title: '',
        location: '',
        type: 'academic',
        academicType: 'lecture',
        attendanceWeight: 1
    });
    const [editingId, setEditingId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // api.js handles token
            
            const [slotsRes, attendanceRes] = await Promise.all([
                api.get('/timetable'),
                api.get(`/attendance?date=${currentDateStr}`)
            ]);

            setSlots(slotsRes.data);
            setAttendanceHistory(attendanceRes.data);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    }, [currentDateStr]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchData();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [fetchData]);

    // Sync formData day when activeDay changes (optional, but good UX if adding slot from that tab)

    const handleAddSlot = async (e) => {
        e.preventDefault();
        console.log("Submitting form. EditingId:", editingId);
        console.log("Form Data:", formData);
        
        try {
            if (editingId) {
                // Update existing
                await api.put(`/timetable/${editingId}`, formData);
            } else {
                // Create new
                await api.post('/timetable', formData);
            }
            
            setShowModal(false);
            setEditingId(null); // Reset edit mode
            fetchData(); 
        } catch (error) {
            console.error("Error saving slot:", error);
            alert(`Failed to save slot: ${error.message}`);
        }
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({
            day: activeDay,
            startTime: '',
            endTime: '',
            title: '',
            location: '',
            type: 'academic',
            academicType: 'lecture',
            attendanceWeight: 1
        });
        setShowModal(true);
    };

    const handleEdit = (slot) => {
        setEditingId(slot._id);
        setFormData({
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            title: slot.title,
            location: slot.location || '',
            type: slot.type,
            academicType: slot.academicType || 'lecture',
            attendanceWeight: slot.attendanceWeight || 1
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this slot?")) return;
        try {
            await api.delete(`/timetable/${id}`);
            fetchData();
        } catch (error) {
            console.error("Error deleting slot:", error);
        }
    };

    const markAttendance = async (timetableId, status) => {
        try {
            await api.post('/attendance', {
                timetableId,
                date: currentDateStr,
                status
            });
            fetchData(); // Refresh to show new status
        } catch (error) {
            console.error("Error marking attendance:", error);
        }
    };

    const getStatus = (slotId) => {
        const record = attendanceHistory.find(r => r.timetableId === slotId);
        return record ? record.status : 'pending';
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Timetable...</div>;

    // Filter slots for the active day
    const activeSlots = slots.filter(s => s.day === activeDay);

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
            {/* Sidebar Tabs */}
            <div className="w-48 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">Days</h2>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                    {days.map(day => (
                        <button
                            key={day}
                            onClick={() => setActiveDay(day)}
                            className={`w-full text-left px-5 py-3 text-sm font-medium transition-colors border-l-4 ${
                                activeDay === day 
                                ? 'border-blue-600 bg-blue-50 text-blue-700' 
                                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            {day}
                            {/* Dot indicator if today */}
                            {day === currentDayName && <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full" title="Today"></span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{activeDay}'s Schedule</h1>
                        {activeDay === currentDayName && <p className="text-sm text-green-600 mt-1 font-medium">Today</p>}
                    </div>
                    <button 
                        onClick={openAddModal}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 shadow-md transition-all font-medium flex items-center gap-2"
                    >
                        <span>+</span> Add Event
                    </button>
                </div>

                {/* Slots List */}
                <div className="flex-1 overflow-y-auto p-8">
                    {activeSlots.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-500 text-lg">No classes or activities scheduled for {activeDay}.</p>
                            <button 
                                onClick={openAddModal}
                                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Add your first slot
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-3xl mx-auto">
                            {activeSlots.map(slot => {
                                const status = getStatus(slot._id);
                                const isToday = activeDay === currentDayName;
                                const isAcademic = slot.type === 'academic';

                                return (
                                    <div key={slot._id} className={`bg-white rounded-xl shadow-sm border p-5 transition-shadow hover:shadow-md flex flex-col md:flex-row gap-4 ${isAcademic ? 'border-l-8 border-l-indigo-500' : 'border-l-8 border-l-green-400'}`}>
                                        
                                        {/* Time Column */}
                                        <div className="md:w-32 flex flex-col justify-center border-r border-gray-100 pr-4">
                                            <span className="text-xl font-bold text-gray-800">{slot.startTime}</span>
                                            <span className="text-sm text-gray-500">to {slot.endTime}</span>
                                        </div>

                                        {/* Info Column */}
                                        <div className="flex-1 flex flex-col justify-center">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900">{slot.title}</h3>
                                                    <div className="flex gap-2 items-center text-sm text-gray-500 mt-1">
                                                        <span className={`px-2 py-0.5 rounded text-xs uppercase tracking-wide font-semibold ${isAcademic ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                                                            {isAcademic ? (slot.academicType === 'lab' ? `Lab (${slot.attendanceWeight}x)` : 'Lecture') : 'Personal'}
                                                        </span>
                                                        {slot.location && <span>📍 {slot.location}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button 
                                                        onClick={() => handleEdit(slot)}
                                                        className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-medium transition-colors"
                                                        title="Edit Slot"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(slot._id)}
                                                        className="text-gray-300 hover:text-red-500 p-2"
                                                        title="Delete Slot"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Attendance Actions */}
                                            {isAcademic && (
                                                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-4">
                                                    <span className="text-xs font-semibold text-gray-400 uppercase">Attendance</span>
                                                    
                                                    {isToday ? (
                                                        <div className="flex gap-2">
                                                            <button onClick={() => markAttendance(slot._id, 'present')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${status === 'present' ? 'bg-green-600 text-white shadow-inner' : 'bg-gray-100 text-gray-700 hover:bg-green-100'}`}>Present</button>
                                                            <button onClick={() => markAttendance(slot._id, 'absent')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${status === 'absent' ? 'bg-red-600 text-white shadow-inner' : 'bg-gray-100 text-gray-700 hover:bg-red-100'}`}>Absent</button>
                                                            <button onClick={() => markAttendance(slot._id, 'cancelled')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${status === 'cancelled' ? 'bg-gray-600 text-white shadow-inner' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelled</button>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-sm font-medium px-2 py-1 rounded ${
                                                            status === 'present' ? 'bg-green-100 text-green-800' : 
                                                            status === 'absent' ? 'bg-red-100 text-red-800' : 
                                                            status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 italic'
                                                        }`}>
                                                            {status === 'pending' ? 'Not Recorded' : status.charAt(0).toUpperCase() + status.slice(1)}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">
                                {editingId ? 'Edit Slot' : `Add to ${formData.day}`}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        
                        <form onSubmit={handleAddSlot} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                                    <select 
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value})}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="academic">Academic Class</option>
                                        <option value="personal">Personal Activity</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Day</label>
                                    <select 
                                        value={formData.day}
                                        onChange={e => setFormData({...formData, day: e.target.value})}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Lab / Lecture Options */}
                            {formData.type === 'academic' && (
                                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Class Type</label>
                                        <select 
                                            value={formData.academicType}
                                            onChange={e => setFormData({...formData, academicType: e.target.value})}
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        >
                                            <option value="lecture">Lecture (Regular)</option>
                                            <option value="lab">Lab (Practical)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Attendance Count</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            max="10"
                                            value={formData.attendanceWeight}
                                            onChange={e => setFormData({...formData, attendanceWeight: parseInt(e.target.value) || 1})}
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Weight (e.g. Lab = 3 periods)</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder={formData.type === 'academic' ? "e.g., Data Structures" : "e.g., Gym Workout"}
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Location / Room</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g., Room 304 or Fitness Center"
                                    value={formData.location}
                                    onChange={e => setFormData({...formData, location: e.target.value})}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
                                    <input 
                                        type="time" 
                                        required 
                                        value={formData.startTime}
                                        onChange={e => setFormData({...formData, startTime: e.target.value})}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
                                    <input 
                                        type="time" 
                                        required 
                                        value={formData.endTime}
                                        onChange={e => setFormData({...formData, endTime: e.target.value})}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all"
                                >
                                    Save Activity
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
