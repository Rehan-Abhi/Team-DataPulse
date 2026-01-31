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
    const [budgetStats, setBudgetStats] = useState({ totalSpent: 0, monthlyBudget: 0 });
    const [pendingTasks, setPendingTasks] = useState([]);
    const [focusStats, setFocusStats] = useState({ totalMinutes: 0, dailyFocusGoal: 0 });
    const [friendsActivity, setFriendsActivity] = useState([]);

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
                        const pending = todos.filter(t => t.status !== 'done');
                        
                        setPendingTasks(pending.slice(0, 3)); // Top 3 pending tasks
                        
                        setTodoStats([
                            { name: 'Completed', value: done, color: '#10B981' }, // Green-500
                            { name: 'Pending', value: pending.length, color: '#F59E0B' }  // Amber-500
                        ]);
                    }

                    // 4. Budget Stats
                    try {
                        const budgetRes = await api.get('/budget/transactions');
                        if (budgetRes.data) {
                            const txs = budgetRes.data.transactions || budgetRes.data;
                            const monthlyBudget = budgetRes.data.monthlyBudget || 0;
                            const totalSpent = Array.isArray(txs) ? txs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0) : 0;
                            
                            setBudgetStats({ totalSpent, monthlyBudget });
                        }
                    } catch (e) { console.error("Budget fetch error", e); }

                    // 5. Focus Stats
                    try {
                        const focusRes = await api.get('/focus/today');
                        if (focusRes.data) {
                            setFocusStats({
                                totalMinutes: focusRes.data.totalMinutes || 0,
                                dailyFocusGoal: focusRes.data.dailyFocusGoal || 0
                            });
                        }
                    } catch (e) { console.error("Focus fetch error", e); }

                    // 6. Friends Activity
                    try {
                        const friendsRes = await api.get('/friends/mine');
                        if (friendsRes.data) {
                            // Sort by status (busy > free > offline)
                            const sorted = friendsRes.data.sort((a, b) => {
                                const score = (s) => s === 'busy' ? 3 : s === 'free' ? 2 : 1;
                                return score(b.liveStatus?.state) - score(a.liveStatus?.state);
                            });
                            setFriendsActivity(sorted.slice(0, 5)); // Top 5 relevant friends
                        }
                    } catch (e) { console.error("Friends fetch error", e); }


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

                {/* 2. Budget Overview */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800">Budget 💰</h3>
                        <Link to="/dashboard/budget" className="text-sm text-blue-600 hover:underline">Manage</Link>
                    </div>
                    <div className="flex flex-col justify-center h-64 space-y-4">
                        <div className="text-center">
                            <p className="text-gray-500 text-sm mb-1">Total Spent</p>
                            <p className="text-3xl font-extrabold text-red-600">₹{budgetStats.totalSpent.toLocaleString()}</p>
                        </div>
                        
                        {budgetStats.monthlyBudget > 0 ? (
                            <div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Goal Progress</span>
                                    <span>{((budgetStats.totalSpent / budgetStats.monthlyBudget) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                        className={`h-3 rounded-full ${budgetStats.totalSpent > budgetStats.monthlyBudget ? 'bg-red-500' : 'bg-green-500'}`} 
                                        style={{ width: `${Math.min((budgetStats.totalSpent / budgetStats.monthlyBudget) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 text-center">Goal: ₹{budgetStats.monthlyBudget.toLocaleString()}</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-gray-400 text-sm mb-2">No goal set yet.</p>
                                <Link to="/dashboard/budget" className="text-blue-600 text-sm font-semibold border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-50">Set Goal</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Tasks Overview */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Tasks 📝</h3>
                        <Link to="/dashboard/todos" className="text-sm text-blue-600 hover:underline">Manage</Link>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-center gap-4 h-64">
                         {/* Chart */}
                        <div className="h-full w-full md:w-1/2 flex justify-center items-center">
                             {todoStats.reduce((acc, curr) => acc + curr.value, 0) > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={todoStats}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {todoStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{fontSize: '10px'}}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <p>No tasks found.</p>
                                </div>
                            )}
                        </div>

                        {/* List */}
                        <div className="w-full md:w-1/2 flex flex-col justify-center space-y-3 h-full overflow-y-auto">
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Up Next</h4>
                             {pendingTasks.length > 0 ? (
                                <div className="space-y-2">
                                    {pendingTasks.map(task => (
                                        <div key={task._id} className="text-sm border-l-2 border-amber-400 pl-3 py-1 bg-amber-50 rounded-r">
                                            <p className="font-medium text-gray-700 truncate">{task.title}</p>
                                            {task.date && <p className="text-xs text-gray-400">{new Date(task.date).toLocaleDateString()}</p>}
                                        </div>
                                    ))}
                                    {pendingTasks.length >= 3 && <p className="text-xs text-center text-gray-400 italic">...and more</p>}
                                </div>
                             ) : (
                                <p className="text-sm text-gray-400 italic">No pending tasks! 🎉</p>
                             )}
                        </div>
                    </div>
                </div>

                {/* 4. Focus Overview (Moved from Quick Actions) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                             <h3 className="text-xl font-bold text-gray-800">Focus</h3>
                             <span className="text-2xl">⏱️</span>
                        </div>
                        <Link to="/dashboard/focus" className="text-sm text-blue-600 hover:underline">Timer</Link>
                    </div>
                    
                    <div className="flex flex-col justify-center h-64 space-y-6">
                        <div className="text-center">
                            <p className="text-gray-500 text-sm mb-1">Today's Focus</p>
                            <p className="text-4xl font-extrabold text-blue-600">{focusStats.totalMinutes}<span className="text-lg text-gray-400 ml-1">mins</span></p>
                        </div>

                        {focusStats.dailyFocusGoal > 0 ? (
                            <div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Daily Goal ({focusStats.dailyFocusGoal}m)</span>
                                    <span>{Math.min(100, Math.round((focusStats.totalMinutes / focusStats.dailyFocusGoal) * 100))}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                        className="bg-blue-500 h-3 rounded-full transition-all duration-1000" 
                                        style={{ width: `${Math.min((focusStats.totalMinutes / focusStats.dailyFocusGoal) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 text-center">
                                    {focusStats.totalMinutes >= focusStats.dailyFocusGoal ? "Goal reached! 🚀" : `${focusStats.dailyFocusGoal - focusStats.totalMinutes} mins to go`}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-gray-400 text-sm mb-3">No daily goal set.</p>
                                <Link to="/dashboard/focus" className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors">Set Goal</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Friends Activity */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Friends 👥</h3>
                        <Link to="/dashboard/college" className="text-sm text-blue-600 hover:underline">View All</Link>
                    </div>
                    
                    <div className="h-64 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                        {friendsActivity.length > 0 ? (
                            friendsActivity.map(friend => (
                                <div key={friend._id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg overflow-hidden">
                                            {friend.photoURL ? <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover"/> : <span>👤</span>}
                                        </div>
                                         <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${friend.liveStatus?.state === 'busy' ? 'bg-red-500' : friend.liveStatus?.state === 'free' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-gray-800 truncate">{friend.displayName}</h4>
                                        <p className="text-xs text-gray-500 truncate">
                                            {friend.liveStatus?.status || "Offline"} 
                                            {friend.liveStatus?.endTime && <span className="text-gray-400 ml-1">({friend.liveStatus.endTime})</span>}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                                <span className="text-2xl mb-2">👋</span>
                                <p className="text-sm">No friends active.</p>
                                <Link to="/dashboard/college" className="text-blue-500 text-xs mt-2">Add Friends</Link>
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
                {/* Focus Timer moved to main grid */}
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
