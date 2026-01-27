import { useState, useEffect } from 'react';
import api from './services/api';
import { Link } from 'react-router-dom';
import { auth } from './firebase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

function DashboardHome() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attendanceStats, setAttendanceStats] = useState([]);
    const [todoStats, setTodoStats] = useState([]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                try {
                    // Fetch Profile, Attendance, Timetable, Todos concurrently
                    const [profileRes, attendanceRes, timetableRes, todosRes] = await Promise.allSettled([
                        api.get('/users/profile'),
                        api.get('/attendance'),
                        api.get('/timetable'),
                        api.get('/todos')
                    ]);

                    // 1. Profile
                    if (profileRes.status === 'fulfilled') setUser(profileRes.value.data);

                    // 2. Attendance Stats Calculation
                    if (attendanceRes.status === 'fulfilled' && timetableRes.status === 'fulfilled') {
                        const history = attendanceRes.value.data;
                        const slots = timetableRes.value.data;
                        
                        const academicSlots = slots.filter(s => s.type === 'academic');
                        const subjects = [...new Set(academicSlots.map(s => s.title))];

                        const stats = subjects.map(subject => {
                            const relevantRecords = history.filter(record => {
                                const slot = slots.find(s => s._id === record.timetableId);
                                return slot && slot.title === subject;
                            });

                            let totalWeightedPresent = 0;
                            let totalWeightedClasses = 0;

                            relevantRecords.forEach(record => {
                                const slot = slots.find(s => s._id === record.timetableId);
                                const weight = slot?.attendanceWeight || 1;
                                if (record.status === 'present') totalWeightedPresent += weight;
                                if (record.status !== 'cancelled') totalWeightedClasses += weight;
                            });

                            const percentage = totalWeightedClasses === 0 ? 0 : Math.round((totalWeightedPresent / totalWeightedClasses) * 100);
                            return { subject, percentage };
                        }).filter(s => s.percentage > 0 || subjects.includes(s.subject)); // Keep all subjects even if 0%
                        
                        setAttendanceStats(stats);
                    }

                    // 3. Todo Stats Calculation
                    if (todosRes.status === 'fulfilled') {
                        const todos = todosRes.value.data;
                        const done = todos.filter(t => t.status === 'done').length;
                        const pending = todos.length - done;
                        setTodoStats([
                            { name: 'Completed', value: done, color: '#10B981' }, // Green-500
                            { name: 'Pending', value: pending, color: '#F59E0B' }  // Amber-500
                        ]);
                    }

                } catch (error) {
                    console.error("Error fetching dashboard data:", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    if (!user) return (
        <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome! Please complete your profile.</h2>
            <Link to="/profile-setup" className="bg-blue-600 text-white px-6 py-2 rounded-lg">Go to Profile Setup</Link>
        </div>
    );

    return (
        <div className="dashboard-home space-y-8">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Welcome back, {user.displayName ? user.displayName.split(' ')[0] : 'Student'}! 👋
                    </h1>
                    <p className="text-gray-500 mt-2">Here's what's happening today at <span className="font-semibold text-gray-700">{user.university}</span></p>
                </div>
                <div className="mt-4 md:mt-0 flex gap-3">
                    <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm border border-blue-100">
                        {user.branch} • Sem {user.semester}
                    </div>
                </div>
            </header>

            {/* Quick Stats & Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Attendance Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Attendance Overview 📊</h3>
                        <Link to="/dashboard/attendance" className="text-sm text-blue-600 hover:underline">View Details</Link>
                    </div>
                    <div className="h-64">
                        {attendanceStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={attendanceStats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis dataKey="subject" type="category" width={100} tick={{fontSize: 12}} />
                                    <Tooltip 
                                        cursor={{fill: 'transparent'}}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={20}>
                                        {attendanceStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? '#10B981' : '#EF4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <p>No attendance data yet.</p>
                                <Link to="/dashboard/timetable" className="text-blue-500 text-sm mt-2">Setup Timetable</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Todos Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Tasks 📝</h3>
                        <Link to="/dashboard/todos" className="text-sm text-blue-600 hover:underline">Manage</Link>
                    </div>
                    <div className="h-64 flex justify-center items-center">
                        {todoStats.reduce((acc, curr) => acc + curr.value, 0) > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={todoStats}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {todoStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-gray-400">
                                <p>No tasks found.</p>
                                <span className="text-xs">Great job or lazy day?</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to="/dashboard/college" className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow hover:scale-105 transition-transform">
                    <div className="text-2xl mb-1">🏛️</div>
                    <div className="font-bold">College Hub</div>
                    <div className="text-xs opacity-80">Library, Friends</div>
                </Link>
                <Link to="/dashboard/focus" className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="text-2xl mb-1">⏱️</div>
                    <div className="font-bold text-gray-800">Focus Timer</div>
                    <div className="text-xs text-gray-500">Stay Productive</div>
                </Link>
                <Link to="/dashboard/sgpa" className="p-4 bg-white border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-md transition-all">
                    <div className="text-2xl mb-1">📈</div>
                    <div className="font-bold text-gray-800">SGPA Calc</div>
                    <div className="text-xs text-gray-500">Track Grades</div>
                </Link>
                <Link to="/dashboard/studio" className="p-4 bg-white border border-gray-200 rounded-xl hover:border-pink-300 hover:shadow-md transition-all">
                    <div className="text-2xl mb-1">🎙️</div>
                    <div className="font-bold text-gray-800">Studio</div>
                    <div className="text-xs text-gray-500">AI Explainer</div>
                </Link>
            </div>
        </div>
    );
}

export default DashboardHome;
