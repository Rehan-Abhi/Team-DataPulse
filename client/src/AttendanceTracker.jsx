import React, { useState, useEffect, useCallback } from 'react';
import { auth } from './firebase';
import api from './services/api';

const AttendanceTracker = () => {
    const [stats, setStats] = useState([]);
    const [history, setHistory] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch ALL attendance history (to calc stats) AND full timetable
            const [historyRes, timetableRes] = await Promise.all([
                api.get('/attendance'),
                api.get('/timetable')
            ]);

            setHistory(historyRes.data);
            setTimetable(timetableRes.data);
            calculateStats(historyRes.data, timetableRes.data);
        } catch (error) {
            console.error("Error loading attendance data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

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

    const calculateStats = (hist, slots) => {
        // Group by subject (title)
        // We only care about ACADEMIC slots
        const academicSlots = slots.filter(s => s.type === 'academic');
        const subjects = [...new Set(academicSlots.map(s => s.title))];
        
        const newStats = subjects.map(subject => {
            // Find all attendance records for this subject
            // We need to link history -> timetableId -> slot.title ?
            // The history record has `timetableId`. We need to find the slot details.
            
            const relevantRecords = hist.filter(record => {
                const slot = slots.find(s => s._id === record.timetableId);
                return slot && slot.title === subject && slot.type === 'academic';
            });

            let totalWeightedPresent = 0;
            let totalWeightedClasses = 0;

            relevantRecords.forEach(record => {
                const slot = slots.find(s => s._id === record.timetableId);
                // Default to 1 if weight is missing
                const weight = slot.attendanceWeight || 1;

                if (record.status === 'present') {
                    totalWeightedPresent += weight;
                }
                
                // Cancelled classes don't count towards total
                if (record.status !== 'cancelled') {
                    totalWeightedClasses += weight;
                }
            });
            
            const percentage = totalWeightedClasses === 0 ? 0 : Math.round((totalWeightedPresent / totalWeightedClasses) * 100);

            return { subject, present: totalWeightedPresent, absentees: totalWeightedClasses - totalWeightedPresent, percentage };
        });

        setStats(newStats);
    };

    const markAttendance = async (timetableId, status) => {
        try {
            await api.post('/attendance', {
                timetableId,
                date: selectedDate,
                status
            });
            // Refresh data
            fetchData();
        } catch (error) {
            console.error("Error marking attendance:", error);
        }
    };

    // Calendar Helpers
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay(); // 0 = Sun
    };

    const changeMonth = (offset) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
    };

    // Logic to show slots for Selected Date
    const getSlotsForDate = (dateStr) => {
        const dateObj = new Date(dateStr);
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
        return timetable.filter(s => s.day === dayName);
    };

    const activeSlots = getSlotsForDate(selectedDate);

    // Get status for a slot on selectedDate
    const getStatus = (slotId) => {
        const record = history.find(r => r.timetableId === slotId && r.date === selectedDate);
        return record ? record.status : 'pending';
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Attendance...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Attendance Tracker</h1>

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {stats.length === 0 ? (
                    <div className="col-span-3 text-center p-6 bg-gray-50 rounded-lg text-gray-500">
                        No academic attendance recorded yet. Start marking your classes!
                    </div>
                ) : (
                    stats.map(stat => (
                        <div key={stat.subject} className="bg-white rounded-xl shadow-sm border p-6">
                            <div className="flex justify-between items-end mb-2">
                                <h3 className="font-bold text-lg text-gray-800">{stat.subject}</h3>
                                <span className={`text-2xl font-bold ${stat.percentage < 75 ? 'text-red-500' : 'text-green-600'}`}>
                                    {stat.percentage}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                                <div 
                                    className={`h-2.5 rounded-full ${stat.percentage < 75 ? 'bg-red-500' : 'bg-green-600'}`} 
                                    style={{ width: `${stat.percentage}%` }}
                                ></div>
                            </div>
                            <div className="text-xs text-gray-500 flex justify-between">
                                <span>Present: {stat.present}</span>
                                <span>Absent: {stat.absentees}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Calendar Section */}
                <div className="bg-white rounded-xl shadow-sm border p-6 flex-1">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full">◀</button>
                        <h2 className="font-bold text-lg">
                            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full">▶</button>
                    </div>

                    <div className="grid grid-cols-7 text-center text-sm font-semibold text-gray-400 mb-2">
                        {daysOfWeek.map(d => <div key={d}>{d}</div>)}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-10"></div>
                        ))}
                        {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day + 1).toISOString().split('T')[0];
                            const isSelected = selectedDate === dateStr;
                            
                            // Visual indicator if any attendance logged that day? (Optional v2)

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDate(dateStr)}
                                    className={`h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm transition-all ${
                                        isSelected 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : 'hover:bg-blue-50 text-gray-700'
                                    }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Daily Detail Section */}
                <div className="w-full md:w-96 bg-gray-50 rounded-xl border p-6">
                    <h3 className="font-bold text-gray-800 mb-1 border-b pb-4">
                        Schedule for {new Date(selectedDate).toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </h3>
                    
                    <div className="space-y-4 mt-4 max-h-[500px] overflow-y-auto">
                        {activeSlots.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">No classes scheduled.</p>
                        ) : (
                            activeSlots.map(slot => {
                                const status = getStatus(slot._id);
                                if (slot.type !== 'academic') return null; // Show only academic for marking? Or show personal too? User said "Attendance Tracker form of calendar... shows all classes (academic)... ask if attended"

                                return (
                                    <div key={slot._id} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-indigo-500">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-gray-900">{slot.title}</h4>
                                                <p className="text-xs text-gray-500 flex gap-2">
                                                    <span>{slot.startTime} - {slot.endTime}</span>
                                                    {slot.academicType === 'lab' && <span className="text-purple-600 font-bold">• Lab ({slot.attendanceWeight}x)</span>}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                                                status === 'present' ? 'bg-green-100 text-green-700' :
                                                status === 'absent' ? 'bg-red-100 text-red-700' :
                                                status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                                                'bg-yellow-50 text-yellow-600'
                                            }`}>
                                                {status}
                                            </span>
                                        </div>

                                        <div className="flex gap-2 justify-center mt-3">
                                             <button 
                                                onClick={() => markAttendance(slot._id, 'present')}
                                                className={`flex-1 py-1 text-xs font-semibold rounded ${status === 'present' ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-green-100 text-gray-600'}`}
                                            >
                                                Present
                                            </button>
                                            <button 
                                                onClick={() => markAttendance(slot._id, 'absent')}
                                                className={`flex-1 py-1 text-xs font-semibold rounded ${status === 'absent' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-red-100 text-gray-600'}`}
                                            >
                                                Absent
                                            </button>
                                            <button 
                                                onClick={() => markAttendance(slot._id, 'cancelled')}
                                                className={`flex-1 py-1 text-xs font-semibold rounded ${status === 'cancelled' ? 'bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {/* Notice for empty academic slots if Personal exist? */}
                        {activeSlots.some(s => s.type === 'personal') && (
                            <p className="text-xs text-center text-gray-400 mt-4">Personal slots filtered out from attendance view.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceTracker;
